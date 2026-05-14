"""
app/connectors/secondhand/poshmark.py

Poshmark resale connector (via Apify piotrv1001~poshmark-listings-scraper).

Surfaces secondhand / resale listings from Poshmark, enriching each record
with brand premium signals, condition scoring, days-listed staleness, and
estimated resale value — useful for resale arbitrage and recommerce trend analysis.

Apify actor: piotrv1001~poshmark-listings-scraper
Outputs: title, price, brand, size, condition, listedAt, likesCount, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: none (terminal node for secondhand domain)
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()


# Premium brands command a significant resale premium
_PREMIUM_BRANDS = {
    "louis vuitton", "gucci", "chanel", "hermes", "prada", "burberry", "versace",
    "fendi", "dior", "balenciaga", "ysl", "saint laurent", "off-white", "supreme",
    "nike", "jordan", "adidas", "yeezy", "new balance", "new balance 550",
    "ralph lauren", "polo ralph lauren", "tommy hilfiger", "calvin klein",
    "lululemon", "patagonia", "north face", "canada goose", "moncler",
    "coach", "kate spade", "michael kors", "tory burch", "marc jacobs",
}

# Condition-to-score mapping (Poshmark uses these labels)
_CONDITION_SCORES: dict[str, float] = {
    "nwt":             1.0,   # New With Tags
    "new with tags":   1.0,
    "nwot":            0.9,   # New Without Tags
    "new without tags": 0.9,
    "excellent":       0.85,
    "like new":        0.85,
    "good":            0.70,
    "fair":            0.55,
    "poor":            0.35,
}


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


def _brand_premium(brand: str) -> bool:
    """Return True if the brand is in the premium brand set."""
    return brand.lower().strip() in _PREMIUM_BRANDS


def _condition_score(condition: str) -> float:
    """Map a condition label to a 0–1 numeric score."""
    return _CONDITION_SCORES.get(condition.lower().strip(), 0.60)


def _days_listed(listed_at: str | None) -> int | None:
    """
    Calculate the number of days a listing has been active.

    Args:
        listed_at: ISO datetime string or date string of when listed.

    Returns:
        Number of days as int, or None if the date cannot be parsed.
    """
    if not listed_at:
        return None
    try:
        dt = datetime.fromisoformat(str(listed_at).replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        return max((now - dt).days, 0)
    except Exception:
        return None


def _resale_value_est(price: float | None, condition_score: float, brand_premium: bool) -> float | None:
    """
    Estimate the resale value of an item.

    Formula:
      base = price * condition_score
      if brand_premium: base * 1.25  (premium brand uplift)
    """
    if price is None:
        return None
    base = price * condition_score
    if brand_premium:
        base = base * 1.25
    return round(base, 2)


class PoshmarkConnector(AbstractDataConnector):
    """
    Poshmark resale connector.

    Fetches secondhand clothing and accessory listings from Poshmark search
    result pages via Apify, enriching each record with brand premium flags,
    condition scores, listing staleness, and estimated resale values.
    """

    meta = ConnectorMeta(
        connector_id="poshmark-resale",
        domain="secondhand",
        rate_limit_rpm=300,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "piotrv1001~poshmark-listings-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Poshmark listings for the given search queries.

        Args:
            queries: List of search terms to query on poshmark.com.

        Returns:
            Raw item dicts from the Apify Poshmark dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="poshmark-resale",
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

        1. POST to actor run endpoint with searchUrls built from queries.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "searchUrls": [
                f"https://poshmark.com/search?query={q.replace(' ', '+')}"
                for q in queries
            ],
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
                    message="Apify rate limit hit for Poshmark actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Poshmark actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Poshmark response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Poshmark dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "poshmark_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Poshmark output to enriched, normalised records.

        Computed fields:
          - brand_premium:      bool  — True if brand is in the premium set
          - condition_score:    float — 0–1 numeric score mapped from condition label
          - days_listed:        int   — number of days the listing has been active
          - resale_value_est:   float — estimated fair resale price
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                price     = _to_float(item.get("price") or item.get("listingPrice"))
                brand     = str(item.get("brand") or item.get("brandName") or "")
                condition = str(item.get("condition") or item.get("itemCondition") or "")
                listed_at = item.get("listedAt") or item.get("createdAt") or item.get("date")

                b_premium   = _brand_premium(brand)
                c_score     = _condition_score(condition)
                days        = _days_listed(listed_at)
                resale_est  = _resale_value_est(price, c_score, b_premium)

                remapped.append({
                    "item_id":          item.get("id") or item.get("listingId", ""),
                    "title":            item.get("title") or item.get("name", ""),
                    "listing_url":      item.get("url") or item.get("listingUrl", ""),
                    "price":            price,
                    "currency":         item.get("currency", "USD"),
                    "brand":            brand,
                    "size":             item.get("size") or item.get("itemSize", ""),
                    "condition":        condition,
                    "seller":           item.get("seller") or item.get("sellerName", ""),
                    "image_url":        item.get("image") or (item.get("images") or [""])[0],
                    "likes_count":      _to_int(item.get("likesCount") or item.get("likes")),
                    "listed_at":        listed_at,
                    "category":         item.get("category") or item.get("department", ""),
                    # Poshmark resale computed fields
                    "brand_premium":    b_premium,
                    "condition_score":  c_score,
                    "days_listed":      days,
                    "resale_value_est": resale_est,
                })

            except Exception:
                logger.warning(
                    "poshmark_transform_item_error",
                    item_id=item.get("id") or item.get("listingId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
