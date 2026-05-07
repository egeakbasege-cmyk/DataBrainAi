"""
app/connectors/ecommerce/amazon.py

Amazon product-price connector (via Apify's Amazon-Scraper actor).

Apify actor: apify/amazon-crawler
Outputs: price, BSR, stock depth, seller info, ASIN

Resilience:
  - with_resilience() wraps _apify_run() — 4 attempts, exp backoff with jitter.
  - Fallback connector: "ebay-product-price"
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from app.connectors.base import AbstractDataConnector, ConnectorMeta
from app.connectors.resilience import with_resilience
from app.core.exceptions import ConnectorTimeoutError, ConnectorRateLimitError, ConnectorError
from app.config import get_settings

logger = structlog.get_logger(__name__)

settings = get_settings()


class AmazonConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="amazon-product-price",
        domain="ecommerce",
        rate_limit_rpm=20,
        fallback_ids=["ebay-product-price"],
    )

    # Apify actor ID for Amazon scraping
    APIFY_ACTOR = "apify/amazon-crawler"
    APIFY_RUN_URL = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Launch Apify Amazon actor, wait for completion, return raw items.
        Each query maps to a product search or direct ASIN lookup.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="amazon-product-price",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        actor_input = {
            "searchKeywords": queries,
            "maxItems": 10,
            "country": "US",
            "proxyConfiguration": {
                "useApifyProxy": True,
                "apifyProxyGroups": ["RESIDENTIAL"],
            },
        }

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            # 1. Start actor run
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=self.APIFY_ACTOR),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message="Apify rate limit hit for Amazon actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # 2. Poll for dataset items (actor may still be running)
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "amazon_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Amazon-specific field remapping before calling the base normaliser.
        Apify Amazon output uses non-standard keys.
        """
        remapped: list[dict[str, Any]] = []
        for item in raw:
            remapped.append({
                "asin":          item.get("asin", ""),
                "seller_name":   item.get("sellerName") or item.get("brand", ""),
                "item_url":      item.get("url", ""),
                "brand":         item.get("brand", ""),
                "marketplace":   item.get("country", "US"),
                # PricePoint data (normalised separately — kept in attributes)
                "price":         item.get("price"),
                "currency":      item.get("currency", "USD"),
                "bsr":           item.get("bestSellerRank"),
                "stock":         item.get("stockQuantity"),
                "title":         item.get("title", ""),
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
