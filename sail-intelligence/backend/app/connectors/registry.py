"""
app/connectors/registry.py

ConnectorRegistry — central register for all AbstractDataConnector subclasses.

Responsibilities:
  - Discover and hold connector instances keyed by connector_id.
  - Dispatch run(queries) with automatic fallback chaining.
  - Enforce per-connector rate limits via a token-bucket per connector_id.
  - Expose status() for health-check endpoints.

Usage:
    registry = ConnectorRegistry()
    registry.register(AmazonConnector())
    registry.register(EbayConnector())

    result = await registry.dispatch("amazon-product-price", ["ergonomic chair"])
    # If amazon fails → automatically tries "ebay-product-price"
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict
from typing import TYPE_CHECKING

import structlog

from app.core.exceptions import AllConnectorsFailed, ConnectorError
from app.connectors.resilience import circuit_registry

if TYPE_CHECKING:
    from app.connectors.base import AbstractDataConnector, ConnectorResult

logger = structlog.get_logger(__name__)


# ── Simple token-bucket rate limiter ─────────────────────────────────────────

class TokenBucket:
    """
    Async token-bucket rate limiter.
    Supports up to `rate_rpm` calls per 60-second window.
    """

    def __init__(self, rate_rpm: int) -> None:
        self._capacity  = rate_rpm
        self._tokens    = float(rate_rpm)
        self._rate      = rate_rpm / 60.0     # tokens per second
        self._last_refill = time.monotonic()
        self._lock      = asyncio.Lock()

    async def acquire(self) -> None:
        """Block until a token is available, then consume it."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(
                self._capacity,
                self._tokens + elapsed * self._rate,
            )
            self._last_refill = now

            if self._tokens < 1:
                wait = (1 - self._tokens) / self._rate
                await asyncio.sleep(wait)
                self._tokens = 0.0
            else:
                self._tokens -= 1.0


# ── Registry ──────────────────────────────────────────────────────────────────

class ConnectorRegistry:
    """
    Central registry for all data connectors.

    Thread-safe (asyncio event-loop model).
    All dispatch calls run within the same event loop — no thread-pool needed.
    """

    def __init__(self) -> None:
        self._connectors:    dict[str, "AbstractDataConnector"] = {}
        self._rate_limiters: dict[str, TokenBucket]            = defaultdict()

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self, connector: "AbstractDataConnector") -> None:
        """
        Register a connector instance.
        Overwrites any existing connector with the same connector_id (idempotent).
        """
        cid = connector.meta.connector_id
        self._connectors[cid]    = connector
        self._rate_limiters[cid] = TokenBucket(connector.meta.rate_limit_rpm)
        logger.info("connector_registered", connector_id=cid, domain=connector.meta.domain)

    def unregister(self, connector_id: str) -> None:
        self._connectors.pop(connector_id, None)
        self._rate_limiters.pop(connector_id, None)

    # ── Dispatch ──────────────────────────────────────────────────────────────

    async def dispatch(
        self,
        connector_id: str,
        queries: list[str],
    ) -> "ConnectorResult":
        """
        Run the requested connector.  On failure, walk the fallback chain.

        Raises:
            AllConnectorsFailed — if primary + all fallbacks fail.
            KeyError            — if connector_id is not registered.
        """
        chain = self._build_fallback_chain(connector_id)
        last_exc: Exception | None = None

        for cid in chain:
            connector = self._connectors.get(cid)
            if connector is None:
                logger.warning("connector_not_found_in_chain", connector_id=cid)
                continue

            breaker = circuit_registry.get(cid)
            if not breaker.is_allowed():
                logger.warning("circuit_open_skip", connector_id=cid)
                continue

            # Honour rate limit before calling
            await self._rate_limiters[cid].acquire()

            try:
                result = await connector.run(queries)
                logger.info(
                    "connector_dispatch_success",
                    connector_id=cid,
                    records=result.record_count if hasattr(result, "record_count") else len(result.records),
                )
                return result

            except (ConnectorError, AllConnectorsFailed) as exc:
                last_exc = exc
                logger.warning(
                    "connector_dispatch_failed_trying_next",
                    failed=cid,
                    next=chain[chain.index(cid) + 1] if chain.index(cid) + 1 < len(chain) else "none",
                    error=exc.code,
                )

        raise AllConnectorsFailed(
            message=(
                f"All connectors in chain {chain} failed. "
                f"Last error: {last_exc}"
            ),
            connector_id=connector_id,
        ) from last_exc

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_fallback_chain(self, connector_id: str) -> list[str]:
        """Return [primary] + fallback_ids, deduplicated, preserving order."""
        if connector_id not in self._connectors:
            raise KeyError(f"Connector '{connector_id}' is not registered.")

        primary    = self._connectors[connector_id]
        chain: list[str] = [connector_id]
        for fid in primary.meta.fallback_ids:
            if fid not in chain and fid in self._connectors:
                chain.append(fid)
        return chain

    # ── Status ────────────────────────────────────────────────────────────────

    def status(self) -> dict[str, dict]:
        """Return health snapshot for all registered connectors."""
        return {
            cid: {
                "domain":       connector.meta.domain,
                "rate_limit_rpm": connector.meta.rate_limit_rpm,
                "fallback_ids": connector.meta.fallback_ids,
                "circuit":      circuit_registry.get(cid).state.value,
            }
            for cid, connector in self._connectors.items()
        }

    @property
    def connector_ids(self) -> list[str]:
        return list(self._connectors.keys())


# ── Singleton — import and use everywhere ────────────────────────────────────
registry = ConnectorRegistry()
