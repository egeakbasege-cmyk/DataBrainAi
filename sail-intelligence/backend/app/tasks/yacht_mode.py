"""
app/tasks/yacht_mode.py

YACHT Mode — scheduled executive synthesis task.
Runs domain-specific connectors sequentially and synthesises a report.
"""

from __future__ import annotations

import asyncio

import structlog

from app.tasks.celery_app import celery_app

logger = structlog.get_logger(__name__)


@celery_app.task(
    name="app.tasks.yacht_mode.run_yacht_mode_task",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    soft_time_limit=900,    # 15 min soft
    time_limit=1_200,       # 20 min hard
)
def run_yacht_mode_task(self, domain: str, queries: list[str] | None = None) -> dict:
    try:
        return asyncio.run(_yacht_mode_async(domain, queries or ["market overview"]))
    except Exception as exc:
        logger.error("yacht_mode_task_failed", domain=domain, error=str(exc))
        raise self.retry(exc=exc)


async def _yacht_mode_async(domain: str, queries: list[str]) -> dict:
    from app.connectors.orchestrator import orchestrator

    if not orchestrator._bootstrapped:
        orchestrator.bootstrap()

    summary = await orchestrator.run_yacht_mode(domain=domain, queries=queries)

    logger.info(
        "yacht_mode_complete",
        domain=domain,
        succeeded=summary.succeeded,
        failed=summary.failed,
        total_records=summary.total_records,
    )

    return {
        "mode":          "yacht",
        "domain":        domain,
        "succeeded":     summary.succeeded,
        "failed":        summary.failed,
        "total_records": summary.total_records,
        "errors":        summary.errors,
    }
