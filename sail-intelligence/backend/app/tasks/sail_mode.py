"""
app/tasks/sail_mode.py

SAIL Mode — nightly batch ingestion task.
Runs all connectors in parallel, stores results to Postgres + Pinecone.
"""

from __future__ import annotations

import asyncio

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.tasks.sail_mode.run_sail_mode_task",
    bind=True,
    max_retries=2,
    default_retry_delay=300,   # 5 min before retry
    soft_time_limit=3_600,     # 1 h soft limit
    time_limit=4_200,          # 70 min hard kill
)
def run_sail_mode_task(self, queries: list[str], domains: list[str] | None = None) -> dict:
    """
    Celery task wrapper — runs the async SAIL mode pipeline.
    Celery workers are synchronous; asyncio.run() bridges to async code.
    """
    try:
        return asyncio.run(_sail_mode_async(queries, domains))
    except Exception as exc:
        logger.error("sail_mode_task_failed", error=str(exc))
        raise self.retry(exc=exc)


async def _sail_mode_async(queries: list[str], domains: list[str] | None) -> dict:
    from app.connectors.orchestrator import orchestrator

    if not orchestrator._bootstrapped:
        orchestrator.bootstrap()

    summary = await orchestrator.run_sail_mode(queries=queries, domains=domains)

    logger.info(
        "sail_mode_complete",
        succeeded=summary.succeeded,
        failed=summary.failed,
        total_records=summary.total_records,
    )

    return {
        "mode":          "sail",
        "succeeded":     summary.succeeded,
        "failed":        summary.failed,
        "total_records": summary.total_records,
        "errors":        summary.errors,
    }
