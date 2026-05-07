"""
app/connectors/creator/spotify.py

Spotify creator / artist intelligence connector
via Apify spotify-scraper actor.

Apify actor: apify/spotify-scraper
Outputs: artist_id, artist_name, profile_url, country,
         monthly_listeners, followers, genres, top_tracks,
         popularity_score

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback: none (unique creator data source)
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


class SpotifyConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="spotify-creator",
        domain="creator",
        rate_limit_rpm=15,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "maxcopell/spotify-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="spotify-creator",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        actor_input = {
            "searchQueries": queries,
            "searchType":    "artists",
            "maxResults":    10,
            "proxyConfiguration": {
                "useApifyProxy": True,
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
                    message="Apify rate limit hit for Spotify actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Spotify actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Spotify response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Spotify dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info("spotify_fetch_done", queries=len(queries), items_returned=len(items))
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        remapped: list[dict[str, Any]] = []
        for item in raw:
            remapped.append({
                "artist_id":         item.get("id", ""),
                "artist_name":       item.get("name", ""),
                "profile_url":       item.get("externalUrl", {}).get("spotify", ""),
                "country_code":      item.get("country", ""),
                "monthly_listeners": item.get("monthlyListeners"),
                "followers":         item.get("followers", {}).get("total"),
                "genres":            item.get("genres", []),
                "popularity":        item.get("popularity"),
                "top_tracks":        [t.get("name") for t in item.get("topTracks", [])[:5]],
                "image_url":         (item.get("images") or [{}])[0].get("url", ""),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
