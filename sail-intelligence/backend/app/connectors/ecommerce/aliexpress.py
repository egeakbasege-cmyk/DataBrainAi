"""
app/connectors/ecommerce/aliexpress.py

AliExpress sourcing connector (via Apify devcake~aliexpress-products-scraper).

Designed for product sourcing and arbitrage analysis — surfaces supplier
ratings, minimum order quantities, order volume signals, and estimated
resale margins for the dropship / wholesale pipeline.

Apify actor: devcake~aliexpress-products-scraper
Outputs: title, price, supplierRating, ordersCount, minOrderQty, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: none (terminal node for sourcing domain)
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


def _arbitrage_potential(price: float | None, orders_count: int) -> str:
    """
    Classify arbitrage potential as high / medium / low.

    Logic:
      - high:   low price (<$5) AND proven demand (>1000 orders)
      - medium: either low price OR decent demand (>200 orders)
      - low:    everything else
    """
    if price is None:
        return "low"
    if price < 5.0 and orders_count > 1000:
        return "high"
    if price < 5.0 or orders_count > 200:
        return "medium"
    return "low"


class AliexpressConnector(AbstractDataConnector):
    """
    AliExpress sourcing connector.

    Fetches product listings from AliExpress via Apify, enriching each record
    with sourcing margin estimates, minimum order quantities, supplier ratings,
    order volume, and arbitrage-potential classification.
    """

    meta = ConnectorMeta(
        connector_id="aliexpress-sourcing",
        domain="ecommerce",
        rate_limit_rpm=500,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "devcake~aliexpress-products-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch AliExpress product listings for the given search queries.

        Args:
            queries: List of search terms to query on AliExpress.

        Returns:
            Raw item dicts from the Apify AliExpress dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="aliexpress-sourcing",
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

        1. POST to actor run endpoint with searchQueries and proxy config.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "searchQueries": queries,
            "maxProducts": 200,
            "proxyConfiguration": {"useApifyProxy": True},
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
                    message="Apify rate limit hit for AliExpress actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify AliExpress actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify AliExpress response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify AliExpress dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "aliexpress_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify AliExpress output to enriched, normalised records.

        Computed fields:
          - sourcing_margin_est:  float — estimated resale price (price * 2.5)
          - min_order_qty:        int   — minimum order quantity (MOQ)
          - supplier_rating:      float — supplier/store feedback score
          - orders_count:         int   — total number of orders for the listing
          - arbitrage_potential:  str   — high / medium / low classification
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                price = _to_float(
                    item.get("price")
                    or item.get("salePrice")
                    or item.get("originalPrice")
                )

                orders_count = _to_int(
                    item.get("ordersCount")
                    or item.get("orders")
                    or item.get("totalOrders")
                    or item.get("orderCount")
                )

                min_order_qty = _to_int(
                    item.get("minOrderQuantity")
                    or item.get("minOrderQty")
                    or item.get("moq")
                ) or 1  # default to 1 if not specified

                supplier_rating = _to_float(
                    item.get("supplierRating")
                    or item.get("storeRating")
                    or item.get("sellerRating")
                    or item.get("rating")
                )

                # ── Estimated sourcing margin (2.5x rule of thumb) ──────────────
                sourcing_margin_est = round(price * 2.5, 2) if price is not None else None

                remapped.append({
                    "item_id":             item.get("id") or item.get("productId", ""),
                    "title":               item.get("title") or item.get("name", ""),
                    "listing_url":         item.get("url") or item.get("productUrl", ""),
                    "price":               price,
                    "currency":            item.get("currency", "USD"),
                    "image_url":           item.get("image") or (item.get("images") or [""])[0],
                    "category":            item.get("category") or item.get("categoryName", ""),
                    "shipping_cost":       _to_float(item.get("shippingCost") or item.get("shipping")),
                    "ships_from":          item.get("shipsFrom") or item.get("shipFrom", ""),
                    "supplier_name":       item.get("supplierName") or item.get("storeName", ""),
                    # AliExpress sourcing computed fields
                    "sourcing_margin_est": sourcing_margin_est,
                    "min_order_qty":       min_order_qty,
                    "supplier_rating":     supplier_rating,
                    "orders_count":        orders_count,
                    "arbitrage_potential": _arbitrage_potential(price, orders_count),
                })

            except Exception:
                logger.warning(
                    "aliexpress_transform_item_error",
                    item_id=item.get("id") or item.get("productId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
