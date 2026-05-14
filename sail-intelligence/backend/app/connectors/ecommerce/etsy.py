"""
app/connectors/ecommerce/etsy.py

Etsy marketplace connector (via Apify getdataforme~etsy-product-search-scraper).

Surfaces handmade / vintage product data including shop quality signals,
pricing tiers, and shipping details — useful for niche product discovery
and creative market trend analysis.

Apify actor: getdataforme~etsy-product-search-scraper
Outputs: title, price, shop_name, rating, review_count, is_vintage,
         is_handmade, free_shipping, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: ebay-product-price
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


def _price_tier(price: float | None) -> str:
    """Classify price into budget / mid / premium tier."""
    if price is None:
        return "unknown"
    if price < 20:
        return "budget"
    if price < 100:
        return "mid"
    return "premium"


class EtsyConnector(AbstractDataConnector):
    """
    Etsy marketplace connector.

    Fetches handmade and vintage product listings from Etsy via Apify,
    enriching each record with handmade/vintage flags, review signals,
    free-shipping detection, and price-tier classification.
    """

    meta = ConnectorMeta(
        connector_id="etsy-marketplace",
        domain="ecommerce",
        rate_limit_rpm=500,
        fallback_ids=["ebay-product-price"],
    )

    APIFY_ACTOR       = "getdataforme~etsy-product-search-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Etsy product listings for the given search keywords.

        Args:
            queries: List of keyword strings to search on Etsy.

        Returns:
            Raw item dicts from the Apify Etsy dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="etsy-marketplace",
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

        1. POST to actor run endpoint with keyword input.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "keywords": queries,
            "itemLimit": 200,
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
                    message="Apify rate limit hit for Etsy actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Etsy actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Etsy response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Etsy dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "etsy_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Etsy output to enriched, normalised records.

        Computed fields:
          - handmade_score:  bool — item tagged as handmade by the shop
          - is_vintage:      bool — item tagged as vintage (typically 20+ years old)
          - review_count:    int  — total number of reviews
          - rating:          float — average star rating (0.0–5.0)
          - free_shipping:   bool — listing offers free shipping
          - shop_name:       str  — name of the Etsy shop
          - price_tier:      str  — budget (<$20) / mid (<$100) / premium ($100+)
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                price = item.get("price") or item.get("priceValue")
                if isinstance(price, str):
                    m = re.search(r'[\d.]+', price.replace(",", ""))
                    price = float(m.group()) if m else None
                elif isinstance(price, (int, float)):
                    price = float(price)
                else:
                    price = None

                review_count = _to_int(
                    item.get("reviewCount") or item.get("numberOfReviews") or item.get("reviews")
                )

                rating_raw = item.get("rating") or item.get("averageRating") or item.get("stars")
                try:
                    rating = round(float(rating_raw), 2) if rating_raw is not None else None
                except (TypeError, ValueError):
                    rating = None

                handmade_score = bool(
                    item.get("isHandmade")
                    or item.get("handmade")
                    or "handmade" in str(item.get("tags", [])).lower()
                    or "handmade" in str(item.get("title", "")).lower()
                )

                is_vintage = bool(
                    item.get("isVintage")
                    or item.get("vintage")
                    or "vintage" in str(item.get("tags", [])).lower()
                    or "vintage" in str(item.get("title", "")).lower()
                )

                free_shipping = bool(
                    item.get("freeShipping")
                    or item.get("isFreeShipping")
                    or item.get("shippingCost") == 0
                    or str(item.get("shipping", "")).lower() in ("free", "free shipping", "0")
                )

                shop_name = (
                    item.get("shopName")
                    or item.get("shop", {}).get("name", "")
                    if isinstance(item.get("shop"), dict)
                    else item.get("shop", "")
                ) or ""

                remapped.append({
                    "item_id":       item.get("id") or item.get("listingId", ""),
                    "title":         item.get("title", ""),
                    "listing_url":   item.get("url") or item.get("listingUrl", ""),
                    "price":         price,
                    "currency":      item.get("currency", "USD"),
                    "image_url":     item.get("image") or (item.get("images") or [""])[0],
                    "shop_name":     shop_name,
                    "category":      item.get("category") or item.get("taxonomyPath", ""),
                    # Etsy-specific computed fields
                    "handmade_score": handmade_score,
                    "is_vintage":    is_vintage,
                    "review_count":  review_count,
                    "rating":        rating,
                    "free_shipping": free_shipping,
                    "price_tier":    _price_tier(price),
                    # Raw tags for downstream enrichment
                    "tags":          item.get("tags") or [],
                })

            except Exception:
                logger.warning(
                    "etsy_transform_item_error",
                    item_id=item.get("id") or item.get("listingId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
