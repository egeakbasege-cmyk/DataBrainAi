"""
app/connectors/local_markets/real_estate.py

Real estate listing connector (via Apify zillow-com-scraper actor).

Apify actor: apify/zillow-com-scraper
Outputs: listing_id, property_name, listing_url, city, country,
         price, currency, price_per_sqm, bedrooms, bathrooms,
         sqft, property_type, is_for_rent

For Turkish market: uses apify/sahibinden-scraper as fallback actor
when country param is "TR".

Resilience:
  - with_resilience() — 4 attempts, exp backoff with jitter.
  - Fallback connector: none
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


class RealEstateConnector(AbstractDataConnector):
    meta = ConnectorMeta(
        connector_id="real-estate",
        domain="local_markets",
        rate_limit_rpm=10,
        fallback_ids=[],
    )

    # Primary: Zillow (global / US)
    APIFY_ACTOR_ZILLOW     = "apify/zillow-com-scraper"
    # Turkish market fallback
    APIFY_ACTOR_SAHIBINDEN = "apify/sahibinden-scraper"

    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="real-estate",
        max_attempts=4,
        base_wait_secs=2.0,
        max_wait_secs=30.0,
    )
    async def _fetch_with_resilience(self, queries: list[str]) -> list[dict[str, Any]]:
        # Detect Turkish market queries (crude heuristic — location keyword match)
        tr_keywords = {"istanbul", "ankara", "izmir", "türkiye", "turkey", "antalya", "bursa"}
        is_turkish  = any(kw in q.lower() for q in queries for kw in tr_keywords)

        actor      = self.APIFY_ACTOR_SAHIBINDEN if is_turkish else self.APIFY_ACTOR_ZILLOW
        actor_input = (
            {
                "searchQuery": queries[0] if queries else "",
                "maxItems":    15,
                "listingType": "forRent",
            }
            if is_turkish else
            {
                "searchUrls": [
                    f"https://www.zillow.com/homes/{q.replace(' ', '-')}_rb/"
                    for q in queries
                ],
                "maxItems":   15,
                "proxyConfiguration": {
                    "useApifyProxy": True,
                    "apifyProxyGroups": ["RESIDENTIAL"],
                },
            }
        )

        async with httpx.AsyncClient(timeout=settings.apify_default_timeout_secs) as client:
            run_resp = await client.post(
                self.APIFY_RUN_URL.format(actor=actor),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                json={"input": actor_input},
            )

            if run_resp.status_code == 429:
                raise ConnectorRateLimitError(
                    message="Apify rate limit hit for Real Estate actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Real Estate actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Real Estate response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                headers={"Authorization": f"Bearer {settings.apify_api_token}"},
                params={"clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Real Estate dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "real_estate_fetch_done",
                actor=actor,
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        remapped: list[dict[str, Any]] = []
        for item in raw:
            address = item.get("address", {})
            remapped.append({
                "listing_id":    item.get("zpid") or item.get("id", ""),
                "property_name": item.get("streetAddress") or item.get("title", ""),
                "listing_url":   item.get("hdpUrl") or item.get("url", ""),
                "city":          address.get("city") or item.get("city", ""),
                "country":       address.get("state") or item.get("country", ""),
                "price":         item.get("price") or item.get("unformattedPrice"),
                "currency":      item.get("currency", "USD"),
                "price_per_sqm": item.get("pricePerSquareFoot"),
                "bedrooms":      item.get("beds") or item.get("bedrooms"),
                "bathrooms":     item.get("baths") or item.get("bathrooms"),
                "sqft":          item.get("livingArea") or item.get("sqft"),
                "property_type": item.get("homeType") or item.get("propertyType", ""),
                "is_for_rent":   item.get("isRentalWithReducedLease", False) or
                                 "rent" in str(item.get("listingType", "")).lower(),
                "year_built":    item.get("yearBuilt"),
                "description":   item.get("description", "")[:500],
            })

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
