"""
app/connectors/ecommerce/ebay.py

eBay product-price connector (via Apify ebay-scraper actor).

Apify actor: apify/ebay-scraper
Outputs: item_id, title, price, currency, seller, listing_url, condition, bids

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


class EbayConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="ebay-product-price",
        domain="ecommerce",
        rate_limit_rpm=15,
        fallback_ids=[],   # terminal node — Amazon falls back to eBay, not further
    )

    APIFY_ACTOR       = "apify/ebay-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="ebay-product-price",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        actor_input = {
            "search": queries,
            "maxItems": 10,
            "country": "US",
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

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify eBay dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info("ebay_fetch_done", queries=len(queries), items_returned=len(items))
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        remapped: list[dict[str, Any]] = []
        for item in raw:
            remapped.append({
                "item_id":     item.get("itemId", ""),
                "title":       item.get("title", ""),
                "listing_url": item.get("itemUrl") or item.get("url", ""),
                "seller":      item.get("sellerName", ""),
                "price":       item.get("price"),
                "currency":    item.get("currency", "USD"),
                "condition":   item.get("condition", ""),
                "bids":        item.get("bidCount"),
                "is_auction":  item.get("isAuction", False),
                "ships_from":  item.get("itemLocation", ""),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
