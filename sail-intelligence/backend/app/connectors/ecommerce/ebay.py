"""
app/connectors/ecommerce/ebay.py

Full-stack eBay connector (via Apify ebay-scraper actor).

Supported modes (detected from query prefix):
  - "search"            — standard product search (default)
  - "ARBITRAGE:<query>" — used/discounted items sorted by price for resale analysis
  - "SELLER:<name>"     — seller performance deep-dive
  - "AUCTION:<query>"   — active auction listings only

Apify actor: apify/ebay-scraper
Outputs: item_id, title, price, currency, condition, bid_count, watcher_count,
         seller info, arbitrage_signal, demand_signals, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 4 attempts, exp backoff.
  - Fallback connector: none (terminal fallback from Amazon)
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger   = structlog.get_logger(__name__)
settings = get_settings()

# Common product-related keywords used to detect mentions in descriptions
_PRODUCT_KEYWORDS = {
    "phone", "laptop", "tablet", "watch", "camera", "headphones", "speaker",
    "tv", "console", "gaming", "keyboard", "mouse", "monitor", "charger",
    "case", "cover", "bag", "shoes", "sneakers", "jersey", "shirt", "hat",
    "toy", "book", "supplement", "vitamin", "beauty", "skincare",
}


def _detect_mode(queries: list[str]) -> tuple[str, list[str]]:
    """
    Inspect query prefixes to determine the fetch mode and strip the prefix.

    Returns:
        (mode, cleaned_queries)

    Modes:
        "arbitrage" — prefix "ARBITRAGE:"
        "seller"    — prefix "SELLER:"
        "auction"   — prefix "AUCTION:"
        "search"    — default / no prefix
    """
    if not queries:
        return "search", queries

    first = queries[0].upper()
    if first.startswith("ARBITRAGE:"):
        cleaned = [q[len("ARBITRAGE:"):].strip() for q in queries]
        return "arbitrage", cleaned
    if first.startswith("SELLER:"):
        cleaned = [q[len("SELLER:"):].strip() for q in queries]
        return "seller", cleaned
    if first.startswith("AUCTION:"):
        cleaned = [q[len("AUCTION:"):].strip() for q in queries]
        return "auction", cleaned
    return "search", queries


def _build_actor_input(mode: str, queries: list[str]) -> dict[str, Any]:
    """
    Construct the Apify actor input payload for the detected mode.

    Args:
        mode:    One of "search", "arbitrage", "seller", "auction".
        queries: Cleaned query strings (prefixes already stripped).

    Returns:
        Dict suitable for posting as the actor's ``input`` body.
    """
    base: dict[str, Any] = {
        "searchQueries": queries,
        "maxItems": 200,
        "country": "US",
    }

    if mode == "arbitrage":
        base["sortBy"]    = "lowest_price"
        base["condition"] = "Used"

    elif mode == "auction":
        base["listingType"] = "auction"
        base["sortBy"]      = "ending_soonest"

    elif mode == "seller":
        base["sellerName"] = queries[0] if queries else ""
        base.pop("searchQueries", None)
        base["maxItems"] = 1000

    return base


class EbayConnector(AbstractDataConnector):
    """
    eBay multi-mode connector.

    Supports product search, arbitrage discovery, seller performance analysis,
    and active auction tracking — all routed through a single Apify actor with
    mode-specific actor inputs and a rich post-processing transform step.
    """

    meta = ConnectorMeta(
        connector_id="ebay-product-price",
        domain="ecommerce",
        rate_limit_rpm=500,
        fallback_ids=[],   # terminal node — Amazon falls back to eBay, not further
    )

    APIFY_ACTOR       = "automation-lab~ebay-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Detect mode from query prefixes, build actor input, run Apify scraper.

        Args:
            queries: Raw query list. Prefixes "ARBITRAGE:", "SELLER:", "AUCTION:"
                     switch the fetch mode; undecorated queries use default search.

        Returns:
            Raw item dicts from the Apify eBay dataset.
        """
        mode, cleaned = _detect_mode(queries)
        return await self._fetch_with_resilience(cleaned, mode)

    @with_resilience(
        connector_id="ebay-product-price",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_with_resilience(
        self,
        queries: list[str],
        mode: str = "search",
    ) -> list[dict[str, Any]]:
        """
        Internal resilience-wrapped Apify call.

        1. POST to actor run endpoint with mode-specific input.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input = _build_actor_input(mode, queries)

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # ── Step 1: Launch actor run ────────────────────────────────────────
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=self.APIFY_ACTOR),
                params={"token": settings.apify_api_token, "waitForFinish": 300},
                json=actor_input,
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message="Apify rate limit hit for eBay actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify eBay actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify eBay response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify eBay dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "ebay_fetch_done",
                mode=mode,
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify eBay output to enriched, normalised records.

        Computed fields:
          - discount_pct:       (original_price - price) / original_price * 100
          - arbitrage_signal:   buy/resell margin estimate for Used items
          - demand_signals:     watcher + sales heat score (0-10)
          - product_mentions:   keywords from description matching _PRODUCT_KEYWORDS
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            price          = item.get("price")
            original_price = item.get("originalPrice") or item.get("regularPrice")
            condition      = item.get("condition", "")
            # Force numeric — eBay API returns strings like "23", "178+", "1,234"
            def _to_int(v: Any) -> int:
                if not v:
                    return 0
                if isinstance(v, (int, float)):
                    return int(v)
                import re as _re
                m = _re.search(r'[\d,]+', str(v))
                return int(m.group().replace(",", "")) if m else 0

            watcher_count  = _to_int(item.get("watcherCount") or item.get("watchCount"))
            sold_count     = _to_int(item.get("soldCount") or item.get("unitsSold"))
            is_auction     = bool(item.get("isAuction", False))
            bid_count      = item.get("bidCount") or 0
            description    = item.get("description") or item.get("subtitle") or ""

            # ── Discount percentage ─────────────────────────────────────────
            discount_pct: float | None = None
            if price and original_price and original_price > 0:
                discount_pct = round((original_price - price) / original_price * 100, 2)

            # ── Arbitrage signal ────────────────────────────────────────────
            arbitrage_signal: dict[str, Any] | None = None
            if condition and "used" in condition.lower() and price:
                estimated_amazon = round(price * 1.35, 2)
                arbitrage_signal = {
                    "buy_price":             price,
                    "estimated_amazon_price": estimated_amazon,
                    "margin_pct":            35,
                    "risk":                  "medium",
                }

            # ── Demand signals ──────────────────────────────────────────────
            heat_score = min(10.0, (watcher_count / 10) + (sold_count / 5))
            demand_signals: dict[str, Any] = {
                "watchers":   watcher_count,
                "sold_count": sold_count,
                "heat_score": round(heat_score, 2),
            }

            # ── Product keyword mentions in description ──────────────────────
            desc_lower       = description.lower()
            product_mentions = sorted(
                kw for kw in _PRODUCT_KEYWORDS if kw in desc_lower
            )

            # ── Item location / marketplace ─────────────────────────────────
            item_location = item.get("itemLocation") or {}
            if isinstance(item_location, dict):
                marketplace = item_location.get("country", "US")
                ships_from  = item_location.get("postalCode") or item_location.get("city", "")
            else:
                marketplace = "US"
                ships_from  = str(item_location)

            # ── Time left (seconds) for auctions ────────────────────────────
            time_left_secs: int | None = None
            if is_auction:
                tl = item.get("timeLeft") or item.get("timeLeftSeconds")
                if isinstance(tl, (int, float)):
                    time_left_secs = int(tl)

            remapped.append({
                # Core listing fields
                "item_id":                item.get("itemId", ""),
                "title":                  item.get("title", ""),
                "listing_url":            item.get("itemUrl") or item.get("url", ""),
                "seller":                 item.get("sellerName") or item.get("seller", {}).get("name", ""),
                "price":                  price,
                "currency":               item.get("currency", "USD"),
                "condition":              condition,
                "category":               item.get("categoryName") or item.get("category", ""),
                "image_url":              item.get("image") or (item.get("images") or [""])[0],
                # Auction fields
                "is_auction":             is_auction,
                "bid_count":              bid_count,
                "time_left_secs":         time_left_secs,
                "buy_now_price":          item.get("buyItNowPrice"),
                # Pricing history
                "original_price":         original_price,
                "discount_pct":           discount_pct,
                # Seller performance
                "seller_feedback_score":  item.get("sellerFeedbackScore") or item.get("sellerFeedback"),
                "seller_positive_pct":    item.get("sellerPositivePercent") or item.get("sellerPositiveFeedbackPercent"),
                # Logistics
                "ships_from":             ships_from,
                "ships_to":               item.get("shipsTo") or "Worldwide",
                "return_policy":          item.get("returnPolicy") or item.get("returnsAccepted", False),
                # Demand & engagement
                "watcher_count":          watcher_count,
                "sold_count":             sold_count,
                # Computed signals
                "marketplace":            marketplace,
                "arbitrage_signal":       arbitrage_signal,
                "demand_signals":         demand_signals,
                "product_mentions":       product_mentions,
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
