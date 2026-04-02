"""
POST /api/analyse          — sync analysis
POST /api/analyse/stream   — SSE streaming analysis
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.strategy_engine import RateLimitError, StrategyEngine

from .deps import get_current_user, get_db, get_redis, get_strategy_engine

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyseRequest(BaseModel):
    input: str


# ── helpers ──────────────────────────────────────────────────────────

async def _deduct_credit_or_free(user_id: str, db: AsyncSession) -> None:
    """
    Deducts 1 credit or marks free analysis used.
    Raises HTTPException if no credits available.
    """
    row = await db.execute(
        text("SELECT free_used, credits FROM users WHERE id = :uid"),
        {"uid": user_id},
    )
    user = row.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user["free_used"]:
        await db.execute(
            text("UPDATE users SET free_used = true WHERE id = :uid"),
            {"uid": user_id},
        )
        await db.commit()
        return

    if user["credits"] < 1:
        raise HTTPException(
            status_code=402,
            detail={"code": "INSUFFICIENT_CREDITS", "message": "Buy credits to continue."},
        )

    await db.execute(
        text("UPDATE users SET credits = credits - 1 WHERE id = :uid"),
        {"uid": user_id},
    )
    await db.commit()


async def _save_analysis(
    user_id: str,
    input_text: str,
    result,
    duration_ms: int,
    cache_hit: bool,
    db: AsyncSession,
) -> str:
    analysis_id = str(uuid.uuid4())
    await db.execute(
        text(
            """
            INSERT INTO analyses
              (id, user_id, input, intent, confidence,
               business_context, metrics_computed, result,
               pipeline_steps, duration_ms, cache_hit)
            VALUES
              (:id, :uid, :inp, :intent, :conf,
               :bctx::jsonb, :metrics::jsonb, :res::jsonb,
               :steps::jsonb, :dur, :cache)
            """
        ),
        {
            "id": analysis_id,
            "uid": user_id,
            "inp": input_text,
            "intent": result.intent,
            "conf": result.confidence,
            "bctx": "{}",
            "metrics": json.dumps(result.metrics),
            "res":     json.dumps(result.strategy),
            "steps":   json.dumps(result.pipeline_steps),
            "dur": duration_ms,
            "cache": cache_hit,
        },
    )
    await db.execute(
        text("UPDATE users SET total_analyses = total_analyses + 1 WHERE id = :uid"),
        {"uid": user_id},
    )
    await db.commit()
    return analysis_id


# ── routes ───────────────────────────────────────────────────────────

@router.post("/analyse")
async def analyse(
    body: AnalyseRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    engine: StrategyEngine = Depends(get_strategy_engine),
):
    if not body.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty.")

    await _deduct_credit_or_free(user_id, db)

    t0 = time.monotonic()
    try:
        result = await engine.run_pipeline(body.input, user_id, db, redis)
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))
    except Exception:
        logger.exception("Pipeline error", extra={"user_id": user_id})
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")

    duration_ms = round((time.monotonic() - t0) * 1000)
    analysis_id = await _save_analysis(
        user_id, body.input, result, duration_ms, result.cache_hit, db
    )

    return {
        "id": analysis_id,
        "result": result.strategy,
        "metrics": result.metrics,
        "confidence": result.confidence,
        "intent": result.intent,
        "pipeline_steps": result.pipeline_steps,
        "cache_hit": result.cache_hit,
        "duration_ms": duration_ms,
    }


@router.post("/analyse/stream")
async def analyse_stream(
    body: AnalyseRequest,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
    engine: StrategyEngine = Depends(get_strategy_engine),
):
    if not body.input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty.")
    if len(body.input) > 2000:
        raise HTTPException(status_code=400, detail="Input exceeds 2000 character limit.")

    await _deduct_credit_or_free(user_id, db)

    t0 = time.monotonic()

    async def event_generator():
        final_result = None
        cache_hit    = False

        async for chunk in engine.stream_pipeline(body.input, user_id, db, redis):
            yield chunk
            # Parse each SSE chunk to capture the complete event so we can persist it
            if chunk.startswith("data: "):
                try:
                    event = json.loads(chunk[6:])
                    if event.get("type") == "complete":
                        from core.strategy_engine import StrategyResult
                        final_result = StrategyResult(
                            strategy=event["result"],
                            metrics=event.get("metrics", {}),
                            confidence=event.get("confidence", 0.0),
                            intent=event.get("intent", "general"),
                            pipeline_steps=event.get("pipeline_steps", []),
                            cache_hit=event.get("cache_hit", False),
                        )
                        cache_hit = event.get("cache_hit", False)
                except Exception:
                    pass

        # Persist after streaming is complete (only for non-cache-hits to avoid duplicate writes)
        if final_result and not cache_hit:
            try:
                duration_ms = round((time.monotonic() - t0) * 1000)
                await _save_analysis(
                    user_id, body.input, final_result, duration_ms, False, db
                )
            except Exception:
                logger.exception("Failed to save streamed analysis", extra={"user_id": user_id})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )
