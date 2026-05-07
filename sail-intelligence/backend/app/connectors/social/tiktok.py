"""
app/connectors/social/tiktok.py

TikTok Ads intelligence connector (via Apify tiktok-scraper actor).

Apify actor: apify/tiktok-scraper
Outputs: ad_id, brand_name, profile_url, region, video_url,
         views, likes, shares, hashtags, description

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


class TikTokAdsConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="tiktok-ads",
        domain="social",
        rate_limit_rpm=10,
        fallback_ids=["meta-ads"],
    )

    APIFY_ACTOR       = "clockworks/free-tiktok-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="tiktok-ads",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        actor_input = {
            "hashtags":       queries,
            "resultsPerPage": 10,
            "proxyConfiguration": {
                "useApifyProxy": True,
                "apifyProxyGroups": ["RESIDENTIAL"],
            },
        }

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=self.APIFY_ACTOR),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message="Apify rate limit hit for TikTok actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify TikTok actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify TikTok response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify TikTok dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info("tiktok_fetch_done", queries=len(queries), items_returned=len(items))
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        remapped: list[dict[str, Any]] = []
        for item in raw:
            author = item.get("authorMeta", {})
            stats  = item.get("stats", {})
            remapped.append({
                "ad_id":        item.get("id", ""),
                "brand_name":   author.get("name") or author.get("nickName", ""),
                "profile_url":  f"https://tiktok.com/@{author.get('name', '')}",
                "region":       item.get("locationCreated", ""),
                "video_url":    item.get("videoUrl", ""),
                "views":        stats.get("playCount"),
                "likes":        stats.get("diggCount"),
                "shares":       stats.get("shareCount"),
                "comments":     stats.get("commentCount"),
                "description":  item.get("text", ""),
                "hashtags":     [h.get("name", "") for h in item.get("hashtags", [])],
                "duration_secs": item.get("videoMeta", {}).get("duration"),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
