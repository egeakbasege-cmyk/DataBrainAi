"""
app/connectors/base.py

AbstractDataConnector — the single interface every connector must implement.

Design principles:
  - Connectors are stateless per run. All state lives in the returned records.
  - fetch() is the only mandatory method. Subclasses may override validate()
    and transform() to customise the normalisation step.
  - run() is the public entry point: fetch → validate → transform → emit events.
    It is final (not overridable) to guarantee the resilience wrappers always fire.
  - Connectors never raise raw exceptions outward — they raise ConnectorError
    subclasses defined in app.core.exceptions.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar, final

import structlog

from app.core.events import bus, ConnectorRunStarted, ConnectorRunSucceeded, ConnectorRunFailed
from app.core.exceptions import ConnectorError
from app.ontology.models import MarketEntity

logger = structlog.get_logger(__name__)


# ── Connector metadata ────────────────────────────────────────────────────────

@dataclass
class ConnectorMeta:
    """
    Declarative metadata every connector subclass must supply as a class variable.

    connector_id:   unique kebab-case slug  (e.g. "amazon-product-price")
    domain:         top-level data domain   (e.g. "ecommerce", "real_estate")
    rate_limit_rpm: max requests per minute enforced by the orchestrator
    fallback_ids:   ordered list of connector_ids to try if this one fails
    """
    connector_id: str
    domain: str
    rate_limit_rpm: int = 20
    fallback_ids: list[str] = field(default_factory=list)


# ── Connector result ──────────────────────────────────────────────────────────

@dataclass
class ConnectorResult:
    connector_id: str
    records: list[MarketEntity]
    raw_count: int                        # records before dedup / validation
    duration_ms: int
    queries_used: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


# ── Abstract base ─────────────────────────────────────────────────────────────

class AbstractDataConnector(ABC):
    """
    Base class for all Sail Intelligence data connectors.

    Subclass contract:
        1. Define a class-level `meta: ClassVar[ConnectorMeta]`.
        2. Implement `fetch(queries)` — returns raw dicts from the source.
        3. Optionally override `validate(raw)` to add source-specific checks.
        4. Optionally override `transform(raw)` to map to MarketEntity.
        5. Never call `run()` recursively or override it.

    Example:
        class AmazonConnector(AbstractDataConnector):
            meta = ConnectorMeta(
                connector_id="amazon-product-price",
                domain="ecommerce",
                rate_limit_rpm=20,
                fallback_ids=["ebay-product-price"],
            )

            async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
                ...
    """

    meta: ClassVar[ConnectorMeta]

    # ── Abstract methods ──────────────────────────────────────────────────────

    @abstractmethod
    async def fetch(self, queries: list[str]) -> list[dict[str, Any]]:
        """
        Retrieve raw records from the data source.

        Args:
            queries: List of search terms / product IDs / URLs to ingest.

        Returns:
            Raw dicts — one per source record. Structure is connector-specific;
            the normaliser in transform() maps these to MarketEntity.

        Raises:
            ConnectorError (or subclass) on any unrecoverable failure.
        """

    # ── Optional overrides ────────────────────────────────────────────────────

    async def validate(self, raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Source-specific pre-transform validation.
        Default: pass-through. Override to drop/flag malformed records.
        """
        return raw

    async def transform(self, raw: list[dict[str, Any]]) -> list[MarketEntity]:
        """
        Map raw source dicts to unified MarketEntity objects.
        Default: delegates to the global ontology normaliser.
        Override when the source has non-standard field names.
        """
        from app.ontology.normalizer import normalise_records
        return normalise_records(raw, source_connector=self.meta.connector_id)

    # ── Final entry point ─────────────────────────────────────────────────────

    @final
    async def run(self, queries: list[str]) -> ConnectorResult:
        """
        Orchestrated pipeline:  fetch → validate → transform → events.

        This method is final.  The resilience wrapper (retries, circuit breaker)
        is applied by the ConnectorRegistry / orchestrator — not here.
        """
        log = logger.bind(connector_id=self.meta.connector_id, queries=queries)
        start_ms = int(time.monotonic() * 1000)

        await bus.publish(
            ConnectorRunStarted(connector_id=self.meta.connector_id, queries=queries)
        )

        try:
            raw      = await self.fetch(queries)
            log.info("connector_fetched", raw_count=len(raw))

            valid    = await self.validate(raw)
            entities = await self.transform(valid)

            duration = int(time.monotonic() * 1000) - start_ms

            await bus.publish(
                ConnectorRunSucceeded(
                    connector_id=self.meta.connector_id,
                    record_count=len(entities),
                    duration_ms=duration,
                )
            )

            return ConnectorResult(
                connector_id=self.meta.connector_id,
                records=entities,
                raw_count=len(raw),
                duration_ms=duration,
                queries_used=queries,
            )

        except ConnectorError as exc:
            duration = int(time.monotonic() * 1000) - start_ms
            log.error("connector_failed", error_code=exc.code, message=exc.message)

            await bus.publish(
                ConnectorRunFailed(
                    connector_id=self.meta.connector_id,
                    error_code=exc.code,
                    will_retry=bool(self.meta.fallback_ids),
                    fallback_connector_id=self.meta.fallback_ids[0]
                    if self.meta.fallback_ids
                    else "",
                )
            )
            raise   # propagate upward to the orchestrator for fallback logic

        except Exception as exc:
            # Wrap unexpected exceptions so callers always see ConnectorError
            duration = int(time.monotonic() * 1000) - start_ms
            log.exception("connector_unexpected_error")

            await bus.publish(
                ConnectorRunFailed(
                    connector_id=self.meta.connector_id,
                    error_code="unexpected_error",
                    will_retry=bool(self.meta.fallback_ids),
                )
            )
            raise ConnectorError(
                message=str(exc),
                code="connector_unexpected_error",
                connector_id=self.meta.connector_id,
            ) from exc
