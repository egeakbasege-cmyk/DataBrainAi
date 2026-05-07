"""
app/connectors/resilience.py

Resilience primitives for all connector operations:

  1. exponential_backoff_retry  — tenacity-powered decorator with full jitter.
  2. CircuitBreakerRegistry     — per-connector-id circuit breakers (half-open / open / closed).
  3. with_resilience            — convenience wrapper: applies both to any async callable.

Usage:
    @with_resilience(connector_id="amazon-product-price", max_attempts=4)
    async def fragile_call():
        ...
"""

from __future__ import annotations

import asyncio
import functools
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, TypeVar

import structlog
from tenacity import (
    AsyncRetrying,
    RetryError,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.core.exceptions import (
    ConnectorError,
    ConnectorRateLimitError,
    ConnectorTimeoutError,
    AllConnectorsFailed,
)

logger = structlog.get_logger(__name__)
F = TypeVar("F", bound=Callable[..., Awaitable[Any]])


# ── Exponential backoff with full jitter ─────────────────────────────────────
#
# Wait formula:  min(cap, base * 2^attempt) * random(0, 1)
# This is "Full Jitter" from the AWS architecture blog — optimal for preventing
# thundering herds when many connectors fail simultaneously.

def exponential_backoff_retry(
    *,
    max_attempts: int = 4,
    base_wait_secs: float = 1.0,
    max_wait_secs: float = 30.0,
    reraise_on_rate_limit: bool = True,
) -> Callable[[F], F]:
    """
    Decorator factory.  Wraps an async function with tenacity retry logic.

    - ConnectorRateLimitError: re-raises immediately (no point retrying).
    - ConnectorTimeoutError:   retried up to `max_attempts`.
    - ConnectorError:          retried up to `max_attempts`.
    - Other exceptions:        retried up to `max_attempts`.

    Args:
        max_attempts:            Total attempts (1 = no retry).
        base_wait_secs:          Base for the exponential formula.
        max_wait_secs:           Hard cap on wait between attempts.
        reraise_on_rate_limit:   Skip retries for 429 responses.
    """
    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(max_attempts),
                wait=wait_exponential_jitter(
                    initial=base_wait_secs,
                    max=max_wait_secs,
                    jitter=base_wait_secs,
                ),
                retry=retry_if_exception_type((ConnectorError, ConnectorTimeoutError, Exception)),
                reraise=True,
            ):
                with attempt:
                    try:
                        return await fn(*args, **kwargs)
                    except ConnectorRateLimitError:
                        if reraise_on_rate_limit:
                            raise   # skip retries — honour the rate limit
                        raise
                    except Exception:
                        raise
        return wrapper  # type: ignore[return-value]
    return decorator


# ── Circuit breaker ───────────────────────────────────────────────────────────

class CircuitState(Enum):
    CLOSED    = "closed"     # normal — requests flow through
    OPEN      = "open"       # tripped — requests rejected immediately
    HALF_OPEN = "half_open"  # probe — one test request allowed


@dataclass
class CircuitBreaker:
    """
    Per-connector circuit breaker.

    State transitions:
        CLOSED  →  OPEN       : after `failure_threshold` consecutive failures
        OPEN    →  HALF_OPEN  : after `recovery_timeout_secs`
        HALF_OPEN → CLOSED    : on first successful call
        HALF_OPEN → OPEN      : on failure in probe call
    """
    connector_id: str
    failure_threshold: int = 5
    recovery_timeout_secs: float = 60.0

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _consecutive_failures: int = field(default=0, init=False)
    _opened_at: float = field(default=0.0, init=False)

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            elapsed = asyncio.get_event_loop().time() - self._opened_at
            if elapsed >= self.recovery_timeout_secs:
                self._state = CircuitState.HALF_OPEN
                logger.info(
                    "circuit_half_open",
                    connector_id=self.connector_id,
                    elapsed_secs=round(elapsed, 1),
                )
        return self._state

    def record_success(self) -> None:
        self._consecutive_failures = 0
        if self._state != CircuitState.CLOSED:
            logger.info("circuit_closed", connector_id=self.connector_id)
        self._state = CircuitState.CLOSED

    def record_failure(self) -> None:
        self._consecutive_failures += 1
        if self._state == CircuitState.HALF_OPEN or \
                self._consecutive_failures >= self.failure_threshold:
            self._state    = CircuitState.OPEN
            self._opened_at = asyncio.get_event_loop().time()
            logger.warning(
                "circuit_opened",
                connector_id=self.connector_id,
                consecutive_failures=self._consecutive_failures,
            )

    def is_allowed(self) -> bool:
        return self.state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)


class CircuitBreakerRegistry:
    """Thread-safe registry — one CircuitBreaker per connector_id."""

    def __init__(self) -> None:
        self._breakers: dict[str, CircuitBreaker] = {}

    def get(self, connector_id: str) -> CircuitBreaker:
        if connector_id not in self._breakers:
            self._breakers[connector_id] = CircuitBreaker(connector_id=connector_id)
        return self._breakers[connector_id]

    def status(self) -> dict[str, str]:
        return {cid: cb.state.value for cid, cb in self._breakers.items()}


# Singleton — import and use everywhere
circuit_registry = CircuitBreakerRegistry()


# ── Combined resilience wrapper ───────────────────────────────────────────────

def with_resilience(
    *,
    connector_id: str,
    max_attempts: int = 4,
    base_wait_secs: float = 1.0,
    max_wait_secs: float = 30.0,
) -> Callable[[F], F]:
    """
    Applies both exponential-backoff retry AND circuit breaker to an async fn.

    Order of operations per call:
        1. Circuit breaker check — reject immediately if OPEN.
        2. Execute function with retry wrapper.
        3. On final success → record_success().
        4. On final failure → record_failure(); re-raise as AllConnectorsFailed.
    """
    def decorator(fn: F) -> F:
        retried_fn = exponential_backoff_retry(
            max_attempts=max_attempts,
            base_wait_secs=base_wait_secs,
            max_wait_secs=max_wait_secs,
        )(fn)

        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            breaker = circuit_registry.get(connector_id)

            if not breaker.is_allowed():
                raise AllConnectorsFailed(
                    message=f"Circuit open for connector '{connector_id}' — all retries exhausted.",
                    connector_id=connector_id,
                )

            try:
                result = await retried_fn(*args, **kwargs)
                breaker.record_success()
                return result
            except (RetryError, ConnectorError, Exception) as exc:
                breaker.record_failure()
                raise AllConnectorsFailed(
                    message=f"All {max_attempts} attempts failed for '{connector_id}': {exc}",
                    connector_id=connector_id,
                    detail={"original_error": str(exc)},
                ) from exc

        return wrapper  # type: ignore[return-value]
    return decorator
