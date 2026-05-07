"""
app/connectors/social/meta.py

Meta (Facebook/Instagram) Ads intelligence connector
via Apify facebook-ads-scraper actor.

Apify actor: apify/facebook-ads-scraper
Outputs: page_id, page_name, page_url, country, ad_text,
         media_type, start_date, is_active, estimated_reach

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback: none (terminal social fallback)
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


class MetaAdsConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="meta-ads",
        domain="social",
        rate_limit_rpm=10,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "apify/facebook-ads-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="meta-ads",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        actor_input = {
            "searchTerms":  queries,
            "maxAds":       20,
            "country":      "US",
            "adType":       "ALL",       # IMAGE | VIDEO | ALL
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
                    message="Apify rate limit hit for Meta Ads actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Meta Ads actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Meta Ads response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Meta Ads dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info("meta_ads_fetch_done", queries=len(queries), items_returned=len(items))
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        remapped: list[dict[str, Any]] = []
        for item in raw:
            page = item.get("page", {})
            remapped.append({
                "page_id":         item.get("adArchiveId") or page.get("id", ""),
                "page_name":       page.get("name", ""),
                "page_url":        page.get("url") or f"https://facebook.com/{page.get('id', '')}",
                "country":         item.get("publisherPlatform", ""),
                "ad_text":         item.get("bodyText", ""),
                "media_type":      item.get("adType", ""),
                "media_url":       item.get("mediaUrl", ""),
                "start_date":      item.get("startDate"),
                "end_date":        item.get("endDate"),
                "is_active":       item.get("isActive", True),
                "estimated_reach": item.get("estimatedAudienceSize", {}).get("upper"),
                "cta":             item.get("callToActionType", ""),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
