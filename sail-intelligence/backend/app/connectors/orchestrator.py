"""
app/connectors/orchestrator.py

Apify Orchestrator — manages connector discovery, registration,
and the three processing-mode pipelines.

Processing modes:
  SAIL   (Batch)     — nightly macro-trend ingestion across all connectors
  YACHT  (Stream)    — scheduled synthesis for a specific entity or domain
  MOTOR  (Tactical)  — event-triggered micro-ingestion for anomaly follow-up

Usage:
    orchestrator = ApifyOrchestrator()
    orchestrator.bootstrap()           # registers all connectors

    # SAIL mode (called by Celery Beat at 02:00 UTC)
    results = await orchestrator.run_sail_mode(queries=["ergonomic chair", ...])

    # MOTOR mode (called on AnomalyDetected event)
    result = await orchestrator.run_motor_mode(
        connector_id="amazon-product-price",
        queries=["B09X4VMBKL"],
    )
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import structlog

from app.connectors.base import ConnectorResult
from app.connectors.registry import registry
from app.connectors.ecommerce.amazon import AmazonConnector
from app.connectors.ecommerce.ebay import EbayConnector
from app.connectors.ecommerce.etsy import EtsyConnector
from app.connectors.ecommerce.walmart import WalmartConnector
from app.connectors.ecommerce.aliexpress import AliexpressConnector
from app.connectors.ecommerce.shopify import ShopifyConnector
from app.connectors.analytics.google_trends import GoogleTrendsConnector
from app.connectors.creator.youtube import YouTubeConnector
from app.connectors.secondhand.poshmark import PoshmarkConnector
from app.connectors.social.tiktok import TikTokAdsConnector
from app.connectors.social.meta import MetaAdsConnector
from app.connectors.social.pinterest import PinterestConnector
from app.connectors.creator.spotify import SpotifyConnector
from app.connectors.local_markets.real_estate import RealEstateConnector
from app.core.exceptions import AllConnectorsFailed
from app.core.events import bus, ConnectorRunFailed

logger = structlog.get_logger(__name__)


@dataclass
class OrchestratorSummary:
    mode: str
    total_connectors: int
    succeeded: int
    failed: int
    total_records: int
    results: list[ConnectorResult]
    errors: list[dict[str, Any]]


class ApifyOrchestrator:
    """
    Central orchestrator for all Apify-backed data connectors.

    Responsibilities:
      - Bootstrap: instantiate and register every connector on startup.
      - SAIL mode: parallel fan-out across all connectors.
      - YACHT mode: sequential run for a specific domain.
      - MOTOR mode: single targeted connector run (low-latency).
    """

    def __init__(self) -> None:
        self._bootstrapped = False

    def bootstrap(self) -> None:
        """
        Instantiate and register all connectors.
        Called once from the FastAPI lifespan startup hook.
        Add new connectors here — nowhere else.
        """
        if self._bootstrapped:
            return

        connectors = [
            # ── E-commerce ────────────────────────────────────────────────────
            AmazonConnector(),       # amazon-product-price  → fallback: ebay
            EbayConnector(),         # ebay-product-price    → terminal
            EtsyConnector(),         # etsy-marketplace      → fallback: ebay-product-price
            WalmartConnector(),      # walmart-marketplace   → fallback: amazon-product-price
            AliexpressConnector(),   # aliexpress-sourcing   → terminal
            ShopifyConnector(),      # shopify-store         → terminal

            # ── Analytics ─────────────────────────────────────────────────────
            GoogleTrendsConnector(), # google-trends         → terminal

            # ── Social / Ads ──────────────────────────────────────────────────
            TikTokAdsConnector(),    # tiktok-ads            → fallback: meta-ads
            MetaAdsConnector(),      # meta-ads              → terminal
            PinterestConnector(),    # pinterest-shopping    → fallback: meta-ads

            # ── Creator economy ───────────────────────────────────────────────
            SpotifyConnector(),      # spotify-creator       → terminal
            YouTubeConnector(),      # youtube-creator       → terminal

            # ── Secondhand / Resale ───────────────────────────────────────────
            PoshmarkConnector(),     # poshmark-resale       → terminal

            # ── Local markets ─────────────────────────────────────────────────
            RealEstateConnector(),   # real-estate           → terminal
        ]

        for connector in connectors:
            registry.register(connector)

        self._bootstrapped = True
        logger.info(
            "orchestrator_bootstrapped",
            connector_count=len(connectors),
            connector_ids=registry.connector_ids,
        )

    # ── SAIL mode ─────────────────────────────────────────────────────────────

    async def run_sail_mode(
        self,
        queries: list[str],
        domains: list[str] | None = None,
    ) -> OrchestratorSummary:
        """
        Nightly batch: run all registered connectors (or filtered by domain)
        in parallel.  Failures are captured and logged — they never abort the batch.

        Args:
            queries: Search terms to pass to every connector.
            domains: Optional filter — only connectors whose domain is in this list.
        """
        target_ids = [
            cid for cid, info in registry.status().items()
            if domains is None or info["domain"] in domains
        ]

        logger.info("sail_mode_start", connector_count=len(target_ids), queries=len(queries))

        tasks = {
            cid: asyncio.create_task(registry.dispatch(cid, queries))
            for cid in target_ids
        }

        return await self._collect(tasks, mode="sail")

    # ── YACHT mode ────────────────────────────────────────────────────────────

    async def run_yacht_mode(
        self,
        domain: str,
        queries: list[str],
    ) -> OrchestratorSummary:
        """
        Executive synthesis run: all connectors in `domain`, sequential.
        Sequential to respect per-connector rate limits precisely.
        """
        target_ids = [
            cid for cid, info in registry.status().items()
            if info["domain"] == domain
        ]

        logger.info("yacht_mode_start", domain=domain, connector_count=len(target_ids))

        results:   list[ConnectorResult] = []
        errors:    list[dict[str, Any]]  = []

        for cid in target_ids:
            try:
                result = await registry.dispatch(cid, queries)
                results.append(result)
            except AllConnectorsFailed as exc:
                errors.append({"connector_id": cid, "error": exc.code, "message": exc.message})
                logger.warning("yacht_connector_failed", connector_id=cid, error=exc.code)

        return OrchestratorSummary(
            mode="yacht",
            total_connectors=len(target_ids),
            succeeded=len(results),
            failed=len(errors),
            total_records=sum(len(r.records) for r in results),
            results=results,
            errors=errors,
        )

    # ── MOTOR mode ────────────────────────────────────────────────────────────

    async def run_motor_mode(
        self,
        connector_id: str,
        queries: list[str],
    ) -> ConnectorResult:
        """
        Low-latency single-connector run for anomaly follow-up.
        Raises AllConnectorsFailed on failure (no swallowing in Motor mode).
        """
        logger.info("motor_mode_start", connector_id=connector_id, queries=queries)
        return await registry.dispatch(connector_id, queries)

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    async def _collect(
        tasks: dict[str, asyncio.Task],
        mode: str,
    ) -> OrchestratorSummary:
        results: list[ConnectorResult] = []
        errors:  list[dict[str, Any]]  = []

        outcomes = await asyncio.gather(*tasks.values(), return_exceptions=True)

        for cid, outcome in zip(tasks.keys(), outcomes):
            if isinstance(outcome, Exception):
                errors.append({
                    "connector_id": cid,
                    "error": getattr(outcome, "code", "unknown"),
                    "message": str(outcome),
                })
                logger.error(
                    "orchestrator_connector_error",
                    mode=mode,
                    connector_id=cid,
                    error=str(outcome),
                )
            else:
                results.append(outcome)

        return OrchestratorSummary(
            mode=mode,
            total_connectors=len(tasks),
            succeeded=len(results),
            failed=len(errors),
            total_records=sum(len(r.records) for r in results),
            results=results,
            errors=errors,
        )


# ── Singleton ─────────────────────────────────────────────────────────────────
orchestrator = ApifyOrchestrator()
