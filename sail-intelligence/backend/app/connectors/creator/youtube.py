"""
app/connectors/creator/youtube.py

YouTube creator connector (via Apify streamers~youtube-channel-scraper).

Surfaces YouTube video and channel data for given search queries, enriching
each record with view velocity, engagement rate, sponsor likelihood, and
content category classification.

Apify actor: streamers~youtube-channel-scraper
Outputs: title, viewCount, likeCount, commentCount, subscriberCount,
         channelName, publishedAt, description, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: none (terminal node for creator domain)
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


def _sponsor_likelihood(view_count: int) -> str:
    """
    Estimate sponsor likelihood based on view count.

    Thresholds:
      - high:   > 500,000 views (strong brand-deal candidate)
      - medium: > 50,000 views (mid-tier influencer)
      - low:    <= 50,000 views (micro / nano creator)
    """
    if view_count > 500_000:
        return "high"
    if view_count > 50_000:
        return "medium"
    return "low"


# Simple keyword-based content category classifier
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "tech":        ["tech", "gadget", "software", "coding", "review", "unboxing"],
    "fitness":     ["fitness", "workout", "gym", "health", "diet", "nutrition"],
    "beauty":      ["beauty", "makeup", "skincare", "fashion", "style", "haul"],
    "gaming":      ["gaming", "game", "playthrough", "esports", "stream"],
    "finance":     ["invest", "stock", "crypto", "finance", "money", "trading"],
    "food":        ["recipe", "food", "cooking", "kitchen", "bake", "eat"],
    "education":   ["tutorial", "learn", "course", "education", "how to", "explained"],
    "travel":      ["travel", "vlog", "trip", "destination", "explore"],
    "music":       ["music", "song", "album", "cover", "lyrics", "artist"],
    "ecommerce":   ["dropship", "amazon", "etsy", "shop", "sell", "product"],
}


def _content_category(title: str, description: str) -> str:
    """Classify content category from title + description using keyword matching."""
    text = (title + " " + description).lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "general"


class YouTubeConnector(AbstractDataConnector):
    """
    YouTube creator connector.

    Fetches video and channel data from YouTube search results via Apify,
    enriching each record with view velocity, engagement rate, sponsor
    likelihood, and content category.
    """

    meta = ConnectorMeta(
        connector_id="youtube-creator",
        domain="creator",
        rate_limit_rpm=200,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "streamers~youtube-channel-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch YouTube video/channel data for the given search queries.

        Args:
            queries: List of search terms to query on YouTube.

        Returns:
            Raw item dicts from the Apify YouTube dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="youtube-creator",
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

        1. POST to actor run endpoint with startUrls from queries.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "startUrls": [
                {"url": f"https://www.youtube.com/results?search_query={q.replace(' ', '+')}"}
                for q in queries
            ],
            "maxResults": 50,
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
                    message="Apify rate limit hit for YouTube actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify YouTube actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify YouTube response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify YouTube dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "youtube_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify YouTube output to enriched, normalised records.

        Computed fields:
          - view_velocity:       float — views per day since publish (approx)
          - engagement_rate:     float — (likes + comments) / views * 100
          - sponsor_likelihood:  str   — high / medium / low
          - content_category:    str   — tech / beauty / gaming / finance / etc.
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                title       = item.get("title") or item.get("name", "")
                description = item.get("description") or item.get("text", "")
                view_count  = _to_int(item.get("viewCount") or item.get("views"))
                like_count  = _to_int(item.get("likeCount") or item.get("likes"))
                comment_count = _to_int(item.get("commentCount") or item.get("comments"))

                # ── Engagement rate ─────────────────────────────────────────────
                engagement_rate: float | None = None
                if view_count > 0:
                    engagement_rate = round(
                        (like_count + comment_count) / view_count * 100, 4
                    )

                # ── View velocity (views / days since published) ─────────────────
                view_velocity: float | None = None
                published_at = item.get("publishedAt") or item.get("uploadDate") or item.get("date")
                if published_at and view_count > 0:
                    try:
                        from datetime import datetime, timezone
                        dt = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
                        now = datetime.now(timezone.utc)
                        days_since = max((now - dt).days, 1)
                        view_velocity = round(view_count / days_since, 2)
                    except Exception:
                        view_velocity = None

                remapped.append({
                    "video_id":           item.get("id") or item.get("videoId", ""),
                    "title":              title,
                    "url":                item.get("url") or item.get("videoUrl", ""),
                    "channel_name":       item.get("channelName") or item.get("author", ""),
                    "channel_url":        item.get("channelUrl") or item.get("authorUrl", ""),
                    "published_at":       published_at,
                    "duration_secs":      _to_int(item.get("duration") or item.get("durationSecs")),
                    "view_count":         view_count,
                    "like_count":         like_count,
                    "comment_count":      comment_count,
                    "subscriber_count":   _to_int(
                        item.get("subscriberCount") or item.get("subscribers")
                    ),
                    "thumbnail_url":      item.get("thumbnail") or item.get("thumbnailUrl", ""),
                    # YouTube creator computed fields
                    "view_velocity":      view_velocity,
                    "engagement_rate":    engagement_rate,
                    "sponsor_likelihood": _sponsor_likelihood(view_count),
                    "content_category":   _content_category(title, description),
                })

            except Exception:
                logger.warning(
                    "youtube_transform_item_error",
                    item_id=item.get("id") or item.get("videoId"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
