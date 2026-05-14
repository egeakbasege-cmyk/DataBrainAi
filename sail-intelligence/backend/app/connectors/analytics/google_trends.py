"""
app/connectors/analytics/google_trends.py

Google Trends connector (via Apify apify~google-trends-scraper).

Surfaces search-interest time-series data for given keywords over the past
12 months in the US, enriching each record with trend direction, peak month,
and related query clusters — critical for macro-trend forecasting.

Apify actor: apify~google-trends-scraper
Outputs: term, interestOverTime, relatedQueries, peakMonth, and more.

Resilience:
  - with_resilience() wraps _fetch_with_resilience() — 10 attempts, exp backoff.
  - Fallback connector: none (terminal analytics node)
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


def _to_float(v: Any) -> float | None:
    """Safely cast a value to float; returns None on failure."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    m = re.search(r'[\d.]+', str(v).replace(",", ""))
    return float(m.group()) if m else None


def _trend_direction(interest_over_time: list[dict[str, Any]]) -> str:
    """
    Determine trend direction from an interest-over-time series.

    Compares the mean of the first half of the series against the second half.
    Returns 'rising', 'falling', or 'stable'.
    """
    if not interest_over_time or len(interest_over_time) < 4:
        return "stable"

    values: list[float] = []
    for entry in interest_over_time:
        v = _to_float(entry.get("value") or entry.get("interest") or entry.get("score"))
        if v is not None:
            values.append(v)

    if len(values) < 4:
        return "stable"

    mid      = len(values) // 2
    first_h  = sum(values[:mid]) / mid
    second_h = sum(values[mid:]) / (len(values) - mid)

    delta_pct = ((second_h - first_h) / first_h * 100) if first_h > 0 else 0

    if delta_pct > 10:
        return "rising"
    if delta_pct < -10:
        return "falling"
    return "stable"


def _peak_month(interest_over_time: list[dict[str, Any]]) -> str | None:
    """
    Return the time label (month string) with the highest interest value.
    Returns None if the series is empty or values are missing.
    """
    if not interest_over_time:
        return None

    best_val   = -1.0
    best_label = None

    for entry in interest_over_time:
        v = _to_float(entry.get("value") or entry.get("interest") or entry.get("score"))
        if v is not None and v > best_val:
            best_val   = v
            best_label = (
                entry.get("date")
                or entry.get("time")
                or entry.get("period")
                or entry.get("formattedTime")
            )

    return str(best_label) if best_label else None


class GoogleTrendsConnector(AbstractDataConnector):
    """
    Google Trends analytics connector.

    Fetches 12-month US interest-over-time data for the supplied search terms
    via Apify, enriching each record with interest score, trend direction,
    peak month, and related query clusters.
    """

    meta = ConnectorMeta(
        connector_id="google-trends",
        domain="analytics",
        rate_limit_rpm=60,
        fallback_ids=[],
    )

    APIFY_ACTOR       = "apify~google-trends-scraper"
    APIFY_RUN_URL     = "https://api.apify.com/v2/acts/{actor}/runs"
    APIFY_DATASET_URL = "https://api.apify.com/v2/datasets/{dataset_id}/items"

    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Fetch Google Trends interest data for the given search terms.

        Args:
            queries: List of search terms to query on Google Trends.

        Returns:
            Raw item dicts from the Apify Google Trends dataset.
        """
        return await self._fetch_with_resilience(queries)

    @with_resilience(
        connector_id="google-trends",
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

        1. POST to actor run endpoint with searchTerms, timeRange, and geo.
        2. Extract defaultDatasetId from the run response.
        3. GET dataset items and return them as raw dicts.
        """
        actor_input: dict[str, Any] = {
            "searchTerms": queries,
            "timeRange":   "today 12-m",
            "geo":         "US",
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
                    message="Apify rate limit hit for Google Trends actor.",
                    connector_id=self.meta.connector_id,
                    retry_after_seconds=60,
                )

            if not run_resp.is_success:
                raise ConnectorError(
                    message=f"Apify Google Trends actor launch failed: HTTP {run_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            run_data   = run_resp.json()
            dataset_id = run_data.get("data", {}).get("defaultDatasetId")

            if not dataset_id:
                raise ConnectorError(
                    message="Apify Google Trends response missing defaultDatasetId.",
                    connector_id=self.meta.connector_id,
                )

            # ── Step 2: Fetch dataset items ─────────────────────────────────────
            dataset_resp = await client.get(
                self.APIFY_DATASET_URL.format(dataset_id=dataset_id),
                params={"token": settings.apify_api_token, "clean": "true", "format": "json"},
            )

            if not dataset_resp.is_success:
                raise ConnectorTimeoutError(
                    message=f"Apify Google Trends dataset fetch failed: HTTP {dataset_resp.status_code}",
                    connector_id=self.meta.connector_id,
                )

            items: list[dict[str, Any]] = dataset_resp.json()
            logger.info(
                "google_trends_fetch_done",
                queries=len(queries),
                items_returned=len(items),
            )
            return items

    # ── Transform ─────────────────────────────────────────────────────────────

    async def transform(self, raw: list[dict[str, Any]]) -> list[Any]:
        """
        Map Apify Google Trends output to enriched, normalised records.

        Computed fields:
          - interest_score:   float — current or average interest level (0–100)
          - trend_direction:  str   — rising / falling / stable
          - peak_month:       str   — date label of highest interest point
          - related_queries:  list  — top related search queries
        """
        remapped: list[dict[str, Any]] = []

        for item in raw:
            try:
                term = (
                    item.get("term")
                    or item.get("keyword")
                    or item.get("searchTerm")
                    or item.get("query", "")
                )

                interest_over_time: list[dict[str, Any]] = (
                    item.get("interestOverTime")
                    or item.get("timelineData")
                    or item.get("data")
                    or []
                )

                # ── Current / average interest score ────────────────────────────
                interest_score: float | None = None
                if interest_over_time:
                    values = [
                        _to_float(e.get("value") or e.get("interest") or e.get("score"))
                        for e in interest_over_time
                    ]
                    valid = [v for v in values if v is not None]
                    if valid:
                        interest_score = round(sum(valid) / len(valid), 2)
                else:
                    interest_score = _to_float(
                        item.get("interestScore") or item.get("interest") or item.get("score")
                    )

                # ── Related queries ──────────────────────────────────────────────
                related_raw = (
                    item.get("relatedQueries")
                    or item.get("relatedSearches")
                    or item.get("related")
                    or []
                )
                if isinstance(related_raw, list):
                    related_queries = [
                        (
                            rq.get("query") or rq.get("term") or str(rq)
                            if isinstance(rq, dict) else str(rq)
                        )
                        for rq in related_raw[:20]
                    ]
                else:
                    related_queries = []

                remapped.append({
                    "term":             term,
                    "geo":              item.get("geo", "US"),
                    "time_range":       item.get("timeRange", "today 12-m"),
                    # Google Trends specific computed fields
                    "interest_score":   interest_score,
                    "trend_direction":  _trend_direction(interest_over_time),
                    "peak_month":       _peak_month(interest_over_time),
                    "related_queries":  related_queries,
                    # Raw series for downstream charting
                    "interest_over_time": interest_over_time,
                })

            except Exception:
                logger.warning(
                    "google_trends_transform_item_error",
                    term=item.get("term") or item.get("keyword"),
                    exc_info=True,
                )
                continue

        from app.ontology.normalizer import normalise_records
        return normalise_records(remapped, source_connector=self.meta.connector_id)
