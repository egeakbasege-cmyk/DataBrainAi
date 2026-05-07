"""
app/tasks/motor_mode.py

MOTOR Mode — event-triggered anomaly follow-up task.
Dispatched by the AnomalyDetected handler; runs a single targeted connector.
"""

from __future__ import annotations

import asyncio

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.tasks.motor_mode.run_motor_mode_task",
    bind=True,
    max_retries=1,          # fail fast — anomaly signals are time-sensitive
    default_retry_delay=10,
    soft_time_limit=120,
    time_limit=180,
)
def run_motor_mode_task(
    self,
    connector_id: str,
    queries:      list[str],
    signal_id:    str = "",
) -> dict:
    try:
        return asyncio.run(_motor_mode_async(connector_id, queries, signal_id))
    except Exception as exc:
        logger.error(
            "motor_mode_task_failed",
            connector_id=connector_id,
            signal_id=signal_id,
            error=str(exc),
        )
        raise self.retry(exc=exc)


async def _motor_mode_async(
    connector_id: str,
    queries: list[str],
    signal_id: str,
) -> dict:
    from app.connectors.orchestrator import orchestrator

    if not orchestrator._bootstrapped:
        orchestrator.bootstrap()

    result = await orchestrator.run_motor_mode(
        connector_id=connector_id,
        queries=queries,
    )

    logger.info(
        "motor_mode_complete",
        connector_id=connector_id,
        signal_id=signal_id,
        record_count=len(result.records),
        duration_ms=result.duration_ms,
    )

    return {
        "mode":         "motor",
        "connector_id": connector_id,
        "signal_id":    signal_id,
        "record_count": len(result.records),
        "duration_ms":  result.duration_ms,
    }
