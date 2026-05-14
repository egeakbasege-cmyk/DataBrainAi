"""
app/connectors/ecommerce/walmart.py

Walmart marketplace connector (via Apify e-commerce~walmart-product-detail-scraper).

Fetches product listings from Walmart search result pages, enriching records
with exclusive-product flags, pickup availability, seller-type classification,
and price-drop percentage signals.

Apify actor: e-commerce~walmart-product-detail-scraper
Outputs: title, price, originalPrice, seller, availableForPickup, isWalmartExclusive,
         and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: amazon-product-price
"""

from __future__ import annotations

import re
from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()


def _to_int(v: Any) -> int:
    """Safely cast strings like '178+', '1,234' or floats to int."""
    if not v:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    m = re.search(r'[\d,]+', str(v))
    return int(m.group().replace(",", "")) if m else 0


def _to_float(v: Any) -> float | None:
    """Safely cast a value to float; returns None on failure."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r'[\d.]+', str(v).replace(",", ""))
    return float(m.group()) if m else None


class WalmartConnector(AbstractDataConnector):
    """
    Walmart marketplace connector.

    Fetches product listings from Walmart search pages via Apify, enriching
    each record with exclusivity flags, store-pickup availability, seller-type
    classification (first-party vs marketplace), and price-drop percentages.
    """

    meta = ConnectorMeta(
        connector_id="walmart-marketplace",
        domain="ecommerce",
        rate_limit_rpm=500,
        fallback_ids=["amazon-product-price"],
    )

    APIFY_ACTOR       = "e-commerce~walmart-product-detail-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Walmart product listings for the given search queries.

        Args:
            queries: List of search terms to query on walmart.com.

        Returns:
            Raw item dicts from the Apify Walmart dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="walmart-marketplace",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_with_resilience(
        self,
        queries: list[str],
    ) -> list[dict[str, Any]]:
        """
        Internal resilience-wrapped Apify call.

        1. POST to actor run endpoint with startUrls built from queries.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "startUrls": [
                {"url": f"https://walmart.com/search?q={q.replace(' ', '+')}"}
                for q in queries
            ],
            "maxProductsPerStartUrl": 50,
        }

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # ── Step 1: Launch actor run ────────────────────────────────────────
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=self.APIFY_ACTOR),
                params={"token": settings.apify_api_token, "waitForFinish": 300},
                json=actor_input,
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message="Apify rate limit hit for Walmart actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Walmart actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Walmart response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Walmart dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "walmart_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Walmart output to enriched, normalised records.

        Computed fields:
          - walmart_exclusive:  bool  — product sold exclusively at Walmart
          - pickup_available:   bool  — item available for in-store/curbside pickup
          - seller_type:        str   — "walmart" for 1P items, "marketplace" for 3P
          - price_drop_pct:     float — percentage discount vs original price
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                price          = _to_float(item.get("price") or item.get("currentPrice"))
                original_price = _to_float(
                    item.get("originalPrice") or item.get("regularPrice") or item.get("wasPrice")
                )

                # ── Price drop percentage ───────────────────────────────────────
                price_drop_pct: float | None = None
                if price is not None and original_price and original_price > 0:
                    price_drop_pct = round(
                        (original_price - price) / original_price * 100, 2
                    )

                # ── Walmart exclusive flag ──────────────────────────────────────
                walmart_exclusive = bool(
                    item.get("isWalmartExclusive")
                    or item.get("walmartExclusive")
                    or "walmart exclusive" in str(item.get("badges", [])).lower()
                    or "walmart exclusive" in str(item.get("title", "")).lower()
                )

                # ── Pickup availability ─────────────────────────────────────────
                pickup_available = bool(
                    item.get("availableForPickup")
                    or item.get("pickupAvailable")
                    or item.get("storePickup")
                    or str(item.get("fulfillmentOptions", "")).lower().find("pickup") >= 0
                )

                # ── Seller type: walmart (1P) vs marketplace (3P) ───────────────
                seller_raw  = str(item.get("sellerName") or item.get("seller") or "").lower()
                seller_type = "walmart" if seller_raw in ("", "walmart.com", "walmart") else "marketplace"

                remapped.append({
                    "item_id":          item.get("id") or item.get("itemId", ""),
                    "title":            item.get("title") or item.get("name", ""),
                    "listing_url":      item.get("url") or item.get("productUrl", ""),
                    "price":            price,
                    "currency":         item.get("currency", "USD"),
                    "original_price":   original_price,
                    "image_url":        item.get("image") or (item.get("images") or [""])[0],
                    "category":         item.get("category") or item.get("categoryPath", ""),
                    "brand":            item.get("brand", ""),
                    "rating":           _to_float(item.get("rating") or item.get("averageRating")),
                    "review_count":     _to_int(item.get("reviewCount") or item.get("numberOfReviews")),
                    "in_stock":         bool(item.get("inStock", True)),
                    # Walmart-specific computed fields
                    "walmart_exclusive": walmart_exclusive,
                    "pickup_available":  pickup_available,
                    "seller_type":       seller_type,
                    "price_drop_pct":    price_drop_pct,
                })

            except Exception:
                logger.warning(
                    "walmart_transform_item_error",
                    item_id=item.get("id") or item.get("itemId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
