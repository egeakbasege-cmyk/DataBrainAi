"""
app/connectors/social/pinterest.py

Pinterest shopping connector (via Apify fatihtahta~pinterest-scraper-search).

Surfaces Pinterest pin data for given search queries, enriching each record
with save counts, product-pin detection, a heuristic visual appeal score,
and shop-link presence — valuable for visual commerce and trend discovery.

Apify actor: fatihtahta~pinterest-scraper-search
Outputs: title, description, pinSaves, imageUrl, link, domain, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: meta-ads
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


# Domains that indicate a product / shopping destination
_SHOP_DOMAINS = {
    "amazon.com", "ebay.com", "etsy.com", "walmart.com", "target.com",
    "shopify.com", "shop.app", "pinterest.com/shop", "instagram.com",
    "storenvy.com", "redbubble.com", "society6.com", "zazzle.com",
    "aliexpress.com", "temu.com", "shein.com", "asos.com",
}

# Keywords in link domains / descriptions that indicate a product pin
_PRODUCT_PIN_KEYWORDS = {
    "buy", "shop", "purchase", "price", "$", "£", "€", "cart", "checkout",
    "product", "order", "sale", "deal", "discount", "store", "brand",
}


def _to_int(v: Any) -> int:
    """Safely cast strings like '178+', '1,234' or floats to int."""
    if not v:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    m = re.search(r'[\d,]+', str(v))
    return int(m.group().replace(",", "")) if m else 0


def _is_product_pin(item: dict[str, Any]) -> bool:
    """
    Heuristically detect whether a pin is a shoppable / product pin.

    Checks:
      - Explicit product-pin flag from the scraper
      - Presence of a price field
      - Link domain matching known shop domains
      - Keywords in description or title
    """
    if item.get("isProductPin") or item.get("productPin"):
        return True

    if item.get("price") or item.get("productPrice"):
        return True

    link = str(item.get("link") or item.get("url") or "").lower()
    if any(domain in link for domain in _SHOP_DOMAINS):
        return True

    text = (
        str(item.get("title", ""))
        + " "
        + str(item.get("description", ""))
    ).lower()
    if any(kw in text for kw in _PRODUCT_PIN_KEYWORDS):
        return True

    return False


def _visual_appeal_score(pin_saves: int, description_len: int) -> float:
    """
    Compute a heuristic visual appeal score (0–10).

    Signals:
      - Save count is the strongest proxy for visual quality on Pinterest.
      - A longer, keyword-rich description adds a small uplift.

    Formula:
      base = log10(saves + 1) * 2.5  → maps 0 saves→0, 1000 saves≈7.5, 10000 saves→10
      desc_bonus = min(description_len / 200, 1) * 1.5
      total = min(base + desc_bonus, 10)
    """
    import math
    base       = min(math.log10(pin_saves + 1) * 2.5, 8.5)
    desc_bonus = min(description_len / 200, 1.0) * 1.5
    return round(min(base + desc_bonus, 10.0), 2)


def _shop_link_present(item: dict[str, Any]) -> bool:
    """Return True if the pin links to a known shopping destination."""
    link = str(item.get("link") or item.get("url") or "").lower()
    if not link:
        return False
    return any(domain in link for domain in _SHOP_DOMAINS)


class PinterestConnector(AbstractDataConnector):
    """
    Pinterest shopping connector.

    Fetches pin data from Pinterest search results via Apify, enriching each
    record with save counts, product-pin detection, a visual appeal score,
    and shop-link presence — critical for visual commerce trend analysis.
    """

    meta = ConnectorMeta(
        connector_id="pinterest-shopping",
        domain="social",
        rate_limit_rpm=300,
        fallback_ids=["meta-ads"],
    )

    APIFY_ACTOR       = "fatihtahta~pinterest-scraper-search"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Pinterest pins for the given search queries.

        Args:
            queries: List of search terms to query on Pinterest.

        Returns:
            Raw item dicts from the Apify Pinterest dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="pinterest-shopping",
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

        1. POST to actor run endpoint with queries and pin type/limit.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "queries": queries,
            "type":    "all-pins",
            "limit":   200,
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
                    message="Apify rate limit hit for Pinterest actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Pinterest actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Pinterest response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Pinterest dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "pinterest_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Pinterest output to enriched, normalised records.

        Computed fields:
          - pin_saves:           int   — number of times the pin has been saved
          - is_product_pin:      bool  — True if the pin is a shoppable product pin
          - visual_appeal_score: float — heuristic 0–10 score based on saves + description
          - shop_link_present:   bool  — True if the pin links to a known shop domain
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                pin_saves   = _to_int(
                    item.get("pinSaves")
                    or item.get("saves")
                    or item.get("saveCount")
                    or item.get("repinCount")
                )
                description = str(item.get("description") or item.get("altText") or "")
                title       = str(item.get("title") or item.get("name") or "")

                remapped.append({
                    "pin_id":              item.get("id") or item.get("pinId", ""),
                    "title":               title,
                    "description":         description,
                    "pin_url":             item.get("url") or item.get("pinUrl", ""),
                    "image_url":           item.get("imageUrl") or item.get("image", ""),
                    "link":                item.get("link") or item.get("destination", ""),
                    "domain":              item.get("domain") or item.get("siteName", ""),
                    "board_name":          item.get("boardName") or item.get("board", ""),
                    "pinner":              item.get("pinner") or item.get("creator", ""),
                    "created_at":          item.get("createdAt") or item.get("date"),
                    # Pinterest shopping computed fields
                    "pin_saves":           pin_saves,
                    "is_product_pin":      _is_product_pin(item),
                    "visual_appeal_score": _visual_appeal_score(pin_saves, len(description)),
                    "shop_link_present":   _shop_link_present(item),
                })

            except Exception:
                logger.warning(
                    "pinterest_transform_item_error",
                    item_id=item.get("id") or item.get("pinId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
