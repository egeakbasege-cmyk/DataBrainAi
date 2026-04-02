"""
Celery async tasks — for analyses that exceed SSE timeout (>25s).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os

from celery import Celery

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "starcoins",
    broker=REDIS_URL,
    backend=REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=120,
    task_time_limit=150,
    result_expires=3600,
)


@celery_app.task(bind=True, max_retries=2, soft_time_limit=120)
def run_deep_analysis(self, user_id: str, input_text: str, analysis_id: str):
    """
    Background strategy pipeline for long-running analyses.
    Result is stored in Redis under task_result:{analysis_id}.
    Frontend polls GET /api/analyses/task/{analysis_id} every 2s.
    """
    import redis as sync_redis

    r = sync_redis.from_url(REDIS_URL, decode_responses=True)

    try:
        from core.strategy_engine import StrategyEngine

        engine = StrategyEngine(os.environ["ANTHROPIC_API_KEY"])

        # We need an async event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def _run():
            import redis.asyncio as aioredis

            aredis = aioredis.from_url(REDIS_URL, decode_responses=True)
            # No DB writes inside the task — just compute the result
            result = await engine.run_pipeline(input_text, user_id, None, aredis)
            return result

        result = loop.run_until_complete(_run())
        loop.close()

        payload = json.dumps(
            {
                "status": "complete",
                "result": result.strategy,
                "metrics": result.metrics,
                "confidence": result.confidence,
                "intent": result.intent,
                "pipeline_steps": result.pipeline_steps,
            }
        )
        r.setex(f"task_result:{analysis_id}", 3600, payload)
        logger.info("Deep analysis complete", extra={"analysis_id": analysis_id})

    except Exception as exc:
        logger.exception("Deep analysis failed", extra={"analysis_id": analysis_id})
        r.setex(
            f"task_result:{analysis_id}",
            3600,
            json.dumps({"status": "error", "message": str(exc)}),
        )
        raise self.retry(exc=exc, countdown=10)
