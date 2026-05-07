"""
app/core/events.py

Domain event definitions for the EDA bus.

Design:
  - All events are immutable dataclasses with a UTC timestamp.
  - The EventBus is an in-process pub/sub backed by asyncio queues.
    For multi-process fan-out (Motor Mode), events are also published
    to the Redis Pub/Sub channel "sail:events".
  - Handlers are registered with @bus.subscribe(EventType).
"""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Type, TypeVar
from uuid import uuid4

import structlog

logger = structlog.get_logger(__name__)

E = TypeVar("E", bound="DomainEvent")
Handler = Callable[[Any], Awaitable[None]]


# ── Base ──────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DomainEvent:
    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_json(self) -> str:
        return json.dumps(asdict(self))


# ── Connector events ──────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ConnectorRunStarted(DomainEvent):
    connector_id: str = ""
    queries: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ConnectorRunSucceeded(DomainEvent):
    connector_id: str = ""
    record_count: int = 0
    duration_ms: int = 0


@dataclass(frozen=True)
class ConnectorRunFailed(DomainEvent):
    connector_id: str = ""
    error_code: str = ""
    will_retry: bool = False
    fallback_connector_id: str = ""


# ── Ontology / normalisation events ───────────────────────────────────────────

@dataclass(frozen=True)
class EntitiesNormalised(DomainEvent):
    source_connector_id: str = ""
    entity_count: int = 0


@dataclass(frozen=True)
class OntologyValidationFailed(DomainEvent):
    source_connector_id: str = ""
    error_summary: str = ""


# ── Agent events ──────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class AgentJobQueued(DomainEvent):
    job_id: str = ""
    agent_name: str = ""


@dataclass(frozen=True)
class AgentJobCompleted(DomainEvent):
    job_id: str = ""
    agent_name: str = ""
    result_summary: str = ""


@dataclass(frozen=True)
class AgentJobFailed(DomainEvent):
    job_id: str = ""
    agent_name: str = ""
    error_code: str = ""


# ── Motor Mode (anomaly / HITL) events ───────────────────────────────────────

@dataclass(frozen=True)
class AnomalyDetected(DomainEvent):
    signal_id: str = ""
    entity_id: str = ""
    metric: str = ""
    sigma: float = 0.0
    current_value: float = 0.0
    baseline_value: float = 0.0


@dataclass(frozen=True)
class HITLActionQueued(DomainEvent):
    action_id: str = ""
    action_type: str = ""
    payload: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class HITLActionApproved(DomainEvent):
    action_id: str = ""
    approved_by: str = ""


@dataclass(frozen=True)
class HITLActionRejected(DomainEvent):
    action_id: str = ""
    rejected_by: str = ""
    reason: str = ""


# ── In-process event bus ──────────────────────────────────────────────────────

class EventBus:
    """
    Lightweight asyncio pub/sub bus for in-process event delivery.

    Usage:
        bus = EventBus()

        @bus.subscribe(AnomalyDetected)
        async def on_anomaly(evt: AnomalyDetected) -> None:
            ...

        await bus.publish(AnomalyDetected(signal_id="s1", ...))
    """

    def __init__(self) -> None:
        self._handlers: dict[type, list[Handler]] = defaultdict(list)

    def subscribe(self, event_type: Type[E]) -> Callable[[Handler], Handler]:
        """Decorator — registers an async handler for the given event type."""
        def decorator(fn: Handler) -> Handler:
            self._handlers[event_type].append(fn)
            return fn
        return decorator

    async def publish(self, event: DomainEvent) -> None:
        """
        Dispatch event to all registered handlers concurrently.
        Handler exceptions are logged but never propagate — a failing handler
        must not crash the publisher.
        """
        handlers = self._handlers.get(type(event), [])
        if not handlers:
            return

        results = await asyncio.gather(
            *(h(event) for h in handlers),
            return_exceptions=True,
        )
        for result in results:
            if isinstance(result, Exception):
                logger.error(
                    "event_handler_error",
                    event_type=type(event).__name__,
                    error=str(result),
                )


# ── Singleton bus — import this everywhere ────────────────────────────────────
bus = EventBus()
