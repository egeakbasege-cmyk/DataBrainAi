"""
app/connectors/social/tiktok.py

Full-stack TikTok connector — hashtag/search, creator profiles, and TikTok Shop.

Three Apify actors are selected based on query prefix:
  HASHTAG actor  — clockworks/free-tiktok-scraper
  PROFILE actor  — clockworks/tiktok-profile-scraper  (queries starting with "@")
  SHOP actor     — apify/tiktok-shop-scraper           (queries starting with "SHOP:")

Rich transform step computes:
  - engagement_rate    (likes + comments + shares) / views * 100
  - virality_score     min(1.0, views / 1_000_000)
  - trend_stage        peak / growing / emerging / micro
  - is_trending        views > 500_000
  - product_mentions   keyword matches in description
  - tiktok_shop_link   webVideoUrl if "shop" in description

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback: "meta-ads" (cross-platform ad intelligence)
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

# ── Product keyword vocabulary ────────────────────────────────────────────────

_PRODUCT_KEYWORDS = {
    "phone", "laptop", "tablet", "watch", "camera", "headphones", "speaker",
    "tv", "console", "gaming", "keyboard", "mouse", "monitor", "charger",
    "case", "bag", "shoes", "sneakers", "outfit", "dress", "skincare",
    "serum", "mascara", "lipstick", "supplement", "vitamin", "protein",
    "candle", "hoodie", "toy", "book", "earbuds", "ring", "necklace",
}


def _detect_mode(queries: list[str]) -> tuple[str, list[str]]:
    """
    Inspect the first query to determine the fetch mode.

    Rules:
      - "@…"     → profile mode  (strip "@" from all queries)
      - "SHOP:…" → shop mode     (strip "SHOP:" prefix from all queries)
      - else     → hashtag mode  (strip leading "#" if present)

    Returns:
        (mode, cleaned_queries)
    """
    if not queries:
        return "hashtag", queries

    first = queries[0]
    if first.startswith("@"):
        return "profile", [q.lstrip("@") for q in queries]
    if first.upper().startswith("SHOP:"):
        return "shop", [q[len("SHOP:"):].strip() for q in queries]
    return "hashtag", [q.lstrip("#") for q in queries]


def _engagement_rate(likes: int, comments: int, shares: int, views: int) -> float:
    """
    Compute engagement rate as a percentage of total views.

    Formula: (likes + comments + shares) / views * 100
    Returns 0.0 if views is 0 to avoid ZeroDivisionError.
    """
    if not views:
        return 0.0
    return round((likes + comments + shares) / views * 100, 4)


def _virality_score(views: int) -> float:
    """
    Normalise view count to a 0.0–1.0 virality score.
    Videos with 1M+ views score 1.0.
    """
    return round(min(1.0, views / 1_000_000), 4)


def _trend_stage(views: int) -> str:
    """
    Classify video trend lifecycle stage based on view count thresholds.

    Stages:
      peak     — 1M+ views
      growing  — 100K–999K views
      emerging — 10K–99K views
      micro    — < 10K views
    """
    if views >= 1_000_000:
        return "peak"
    if views >= 100_000:
        return "growing"
    if views >= 10_000:
        return "emerging"
    return "micro"


def _product_mentions(text: str) -> list[str]:
    """Extract product category keywords present in the description text."""
    lower = text.lower()
    return sorted(kw for kw in _PRODUCT_KEYWORDS if kw in lower)


class TikTokAdsConnector(AbstractDataConnector):
    """
    TikTok multi-mode connector.

    Automatically routes to the correct Apify actor based on query prefix:
      - Default hashtag/search scraper for content discovery.
      - Profile scraper for creator-level follower and engagement data.
      - TikTok Shop scraper for product catalogue and pricing intelligence.

    The transform step produces engagement metrics, virality scoring,
    trend lifecycle classification, and shop link detection on top of the
    standard Apify output schema.
    """

    meta = ConnectorMeta(
        connector_id="tiktok-ads",
        domain="social",
        rate_limit_rpm=500,
        fallback_ids=["meta-ads"],
    )

    APIFY_ACTOR_HASHTAG = "clockworks~free-tiktok-scraper"
    APIFY_ACTOR_PROFILE = "clockworks~tiktok-profile-scraper"
    APIFY_ACTOR_SHOP    = "clockworks~tiktok-scraper"

    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    # ── Public entry point ────────────────────────────────────────────────────

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Route to the appropriate Apify actor based on query prefix, then fetch.

        Args:
            queries: Raw query list. Prefix "@" → profile mode;
                     "SHOP:" → shop mode; default → hashtag mode.

        Returns:
            Raw item dicts from the selected Apify actor's dataset, with a
            "_mode" key injected for use in transform().
        """
        mode, cleaned = _detect_mode(queries)
        return await self._fetch_with_resilience(cleaned, mode)

    # ── Resilience-wrapped internal fetcher ───────────────────────────────────

    @with_resilience(
        connector_id="tiktok-ads",
        max_attempts=10,
        base_wait_secs=1.0,
        max_wait_secs=120.0,
    )
    async def _fetch_with_resilience(
        self,
        queries: list[str],
        mode: str = "hashtag",
    ) -> list[dict[str, Any]]:
        """
        Build actor input for the selected mode, POST run, GET dataset.

        Args:
            queries: Cleaned queries (prefix already stripped).
            mode:    "hashtag", "profile", or "shop".

        Returns:
            Parsed JSON list of raw item dicts from the actor's output dataset.

        Raises:
            ConnectorRateLimitError: HTTP 429 from Apify.
            ConnectorError:          Non-success actor launch.
            ConnectorTimeoutError:   Non-success dataset fetch.
        """
        if mode == "profile":
            actor       = self.APIFY_ACTOR_PROFILE
            actor_input: dict[str, Any] = {
                "profiles":       queries,
                "resultsPerPage": 200,
            }
        elif mode == "shop":
            actor = self.APIFY_ACTOR_SHOP
            actor_input = {
                "searchQueries":  queries,
                "maxItems":       500,
                "proxyConfiguration": {
                    "useApifyProxy":    True,
                    "apifyProxyGroups": ["RESIDENTIAL"],
                },
            }
        else:
            # Default: hashtag / keyword search
            actor = self.APIFY_ACTOR_HASHTAG
            actor_input = {
                "hashtags":       queries,
                "resultsPerPage": 500,
                "proxyConfiguration": {
                    "useApifyProxy":    True,
                    "apifyProxyGroups": ["RESIDENTIAL"],
                },
            }

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # ── Step 1: Launch actor ────────────────────────────────────────
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=actor),
                params={"token": settings.apify_api_token, "waitForFinish": 300},
                json=actor_input,
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message=f"Apify rate limit hit for TikTok {mode} actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=(
                        f"Apify TikTok {mode} actor launch failed: "
                        f"HTTP {run_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message=f"Apify TikTok {mode} response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset ───────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=(
                        f"Apify TikTok {mode} dataset fetch failed: "
                        f"HTTP {dataset_resp.status_code}"
                    ),
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            # Tag every item with the mode so transform() can branch correctly
            for item in items:
                item["_mode"] = mode

            logger.info(
                "tiktok_fetch_done",
                mode=mode,
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify TikTok output to enriched, normalised records.

        Hashtag / search records receive full engagement analytics:
          - engagement_rate, virality_score, trend_stage, is_trending
          - product_mentions, tiktok_shop_link

        Profile records are passed through with available creator metrics.
        Shop records receive pricing and product fields.
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            mode       = item.get("_mode", "hashtag")
            author     = item.get("authorMeta", {}) if isinstance(item.get("authorMeta"), dict) else {}
            stats      = item.get("stats", {}) if isinstance(item.get("stats"), dict) else {}
            video_meta = item.get("videoMeta", {}) if isinstance(item.get("videoMeta"), dict) else {}
            music      = item.get("music", {}) if isinstance(item.get("music"), dict) else {}

            if mode == "profile":
                # ── Creator profile record ──────────────────────────────────
                remapped.append({
                    "ad_id":           item.get("id", ""),
                    "brand_name":      item.get("nickname") or item.get("uniqueId", ""),
                    "profile_url":     f"https://tiktok.com/@{item.get('uniqueId', '')}",
                    "region":          item.get("region") or item.get("locationCreated", ""),
                    "views":           item.get("videoCount"),
                    "likes":           item.get("heartCount") or item.get("diggCount"),
                    "followers":       item.get("followerCount"),
                    "following":       item.get("followingCount"),
                    "description":     item.get("signature", "")[:300],
                    "is_verified":     item.get("verified", False),
                    "_mode":           "profile",
                })

            elif mode == "shop":
                # ── TikTok Shop product record ──────────────────────────────
                remapped.append({
                    "ad_id":       item.get("id") or item.get("productId", ""),
                    "brand_name":  item.get("shopName") or item.get("sellerName", ""),
                    "profile_url": item.get("shopUrl") or item.get("productUrl", ""),
                    "region":      item.get("country", "US"),
                    "video_url":   item.get("videoUrl", ""),
                    "price":       item.get("price") or item.get("salePrice"),
                    "currency":    item.get("currency", "USD"),
                    "description": (item.get("description") or item.get("title", ""))[:300],
                    "views":       item.get("salesCount"),
                    "_mode":       "shop",
                })

            else:
                # ── Hashtag / content discovery record ──────────────────────
                views    = stats.get("playCount") or 0
                likes    = stats.get("diggCount") or 0
                shares   = stats.get("shareCount") or 0
                comments = stats.get("commentCount") or 0
                saves    = stats.get("collectCount") or 0
                text     = item.get("text", "")

                author_name = author.get("name") or author.get("nickName", "")

                # Hashtag list
                raw_hashtags = item.get("hashtags") or []
                hashtag_names: list[str] = [
                    h.get("name", "") if isinstance(h, dict) else str(h)
                    for h in raw_hashtags
                ]

                # TikTok Shop link detection
                web_url         = item.get("webVideoUrl", "")
                tiktok_shop_link = web_url if "shop" in text.lower() else ""

                remapped.append({
                    # Identity
                    "ad_id":            item.get("id", ""),
                    "brand_name":       author_name,
                    "profile_url":      f"https://tiktok.com/@{author_name}",
                    "region":           item.get("locationCreated", ""),
                    # Content
                    "video_url":        item.get("videoUrl") or item.get("downloadUrl", ""),
                    "description":      text[:300],
                    "hashtags":         hashtag_names,
                    "duration_secs":    video_meta.get("duration"),
                    "sound_name":       music.get("title", ""),
                    "sound_author":     music.get("authorName", ""),
                    # Raw stats
                    "views":            views,
                    "likes":            likes,
                    "shares":           shares,
                    "comments":         comments,
                    "saves":            saves,
                    # Computed signals
                    "is_trending":      views > 500_000,
                    "engagement_rate":  _engagement_rate(likes, comments, shares, views),
                    "virality_score":   _virality_score(views),
                    "trend_stage":      _trend_stage(views),
                    "product_mentions": _product_mentions(text),
                    "tiktok_shop_link": tiktok_shop_link,
                    "_mode":            "hashtag",
                })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
