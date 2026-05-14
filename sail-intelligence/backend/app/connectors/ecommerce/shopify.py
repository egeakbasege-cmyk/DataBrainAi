"""
app/connectors/ecommerce/shopify.py

Shopify store connector (via Apify webdatalabs~shopify-product-scraper).

Scrapes product catalogues from Shopify storefronts (by store URL), enriching
each record with average price, product count, dropship detection, and an
overall store-health classification.

Apify actor: webdatalabs~shopify-product-scraper
Outputs: title, price, vendor, productType, images, variants, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: none (terminal node for store-intelligence domain)
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


# Known dropship supplier / app footprints in vendor names / tags / descriptions
_DROPSHIP_SIGNALS = {
    "dsers", "oberlo", "spocket", "modalyst", "printful", "printify",
    "aliexpress", "aliexprss", "dropship", "drop ship", "fulfilled by",
    "ships from china", "ships from us warehouse",
}

# Known mass-production / generic vendor patterns suggesting generic inventory
_GENERIC_VENDOR_PATTERNS = [
    r"\bchina\b", r"\bshenzhen\b", r"\bgz \w+\b", r"\bintl\b",
]


def _to_float(v: Any) -> float | None:
    """Safely cast a value to float; returns None on failure."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r'[\d.]+', str(v).replace(",", ""))
    return float(m.group()) if m else None


def _is_dropship(items: list[dict[str, Any]]) -> bool:
    """
    Heuristically detect if a store is likely a dropshipper.

    Checks vendor names, tags, and product descriptions for known signals.
    Returns True if any strong signal is found across the sample.
    """
    for item in items[:30]:  # scan first 30 products for speed
        text_blob = " ".join([
            str(item.get("vendor", "")),
            str(item.get("tags", "")),
            str(item.get("description", "")),
            str(item.get("bodyHtml", "")),
        ]).lower()

        if any(sig in text_blob for sig in _DROPSHIP_SIGNALS):
            return True
        if any(re.search(p, text_blob) for p in _GENERIC_VENDOR_PATTERNS):
            return True

    return False


def _store_health(product_count: int) -> str:
    """
    Classify store health based on catalogue size.

    Thresholds:
      - established: >= 100 products (mature inventory)
      - growing:     >= 20 products  (early traction)
      - new:         < 20 products   (just launched)
    """
    if product_count >= 100:
        return "established"
    if product_count >= 20:
        return "growing"
    return "new"


class ShopifyConnector(AbstractDataConnector):
    """
    Shopify store connector.

    Fetches product catalogues from one or more Shopify store URLs via Apify,
    enriching each store's records with average price, catalogue size, dropship
    detection, and store-health classification.
    """

    meta = ConnectorMeta(
        connector_id="shopify-store",
        domain="ecommerce",
        rate_limit_rpm=200,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "webdatalabs~shopify-product-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Shopify product catalogues for the given store URLs / domains.

        Args:
            queries: List of store URLs (full URLs or bare domains).
                     Bare domains are prefixed with https://.

        Returns:
            Raw item dicts from the Apify Shopify dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="shopify-store",
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

        1. POST to actor run endpoint with storeUrls derived from queries.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "storeUrls": [
                {"url": q if q.startswith("http") else f"https://{q}"}
                for q in queries
            ],
            "maxProducts": 200,
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
                    message="Apify rate limit hit for Shopify actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Shopify actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Shopify response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Shopify dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "shopify_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Shopify output to enriched, normalised records.

        Store-level computed fields (derived from the full item set):
          - avg_price:      float — mean price across all scraped products
          - product_count:  int   — total products scraped from the store
          - is_dropship:    bool  — heuristic dropship detection
          - store_health:   str   — established / growing / new

        Per-item fields are also preserved for downstream granular analysis.
        """
        if not raw:
            from app.ontology.normalizer import normalise_records
            return normalise_records([], source_connector=self.meta.connector_id)

        # ── Store-level aggregates ──────────────────────────────────────────────
        product_count = len(raw)
        is_dropship   = _is_dropship(raw)
        store_health  = _store_health(product_count)

        prices = []
        for item in raw:
            p = _to_float(item.get("price") or item.get("minPrice") or item.get("priceRange", {}).get("min") if isinstance(item.get("priceRange"), dict) else None)
            if p is not None:
                prices.append(p)

        avg_price = round(sum(prices) / len(prices), 2) if prices else None

        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                price = _to_float(
                    item.get("price")
                    or item.get("minPrice")
                    or (item.get("variants") or [{}])[0].get("price")
                )

                remapped.append({
                    "item_id":       item.get("id") or item.get("productId", ""),
                    "title":         item.get("title") or item.get("name", ""),
                    "listing_url":   item.get("url") or item.get("productUrl", ""),
                    "price":         price,
                    "currency":      item.get("currency", "USD"),
                    "vendor":        item.get("vendor") or item.get("brand", ""),
                    "product_type":  item.get("productType") or item.get("category", ""),
                    "image_url":     item.get("image") or (item.get("images") or [""])[0],
                    "tags":          item.get("tags") or [],
                    "store_url":     item.get("storeUrl") or item.get("shopUrl", ""),
                    # Store-level computed fields (same value on every record from this store)
                    "avg_price":     avg_price,
                    "product_count": product_count,
                    "is_dropship":   is_dropship,
                    "store_health":  store_health,
                })

            except Exception:
                logger.warning(
                    "shopify_transform_item_error",
                    item_id=item.get("id") or item.get("productId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
