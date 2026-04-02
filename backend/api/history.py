"""
GET /api/analyses          — list (last 20)
GET /api/analyses/{id}     — single full record
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .deps import get_current_user, get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/analyses")
async def list_analyses(
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = await db.execute(
        text(
            """
            SELECT id, created_at, input, result, confidence, intent
            FROM analyses
            WHERE user_id = :uid
            ORDER BY created_at DESC
            LIMIT 20
            """
        ),
        {"uid": user_id},
    )
    results = []
    for row in rows.mappings():
        result_json = row["result"] or {}
        if isinstance(result_json, str):
            import json
            result_json = json.loads(result_json)
        results.append(
            {
                "id": str(row["id"]),
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "input_preview": (row["input"] or "")[:100],
                "headline": result_json.get("headline", ""),
                "confidence": float(row["confidence"] or 0),
                "intent": row["intent"],
            }
        )
    return {"analyses": results}


@router.get("/analyses/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    user_id: str = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await db.execute(
        text(
            """
            SELECT id, user_id, created_at, input, intent, confidence,
                   business_context, metrics_computed, result,
                   pipeline_steps, duration_ms, cache_hit
            FROM analyses
            WHERE id = :aid
            """
        ),
        {"aid": analysis_id},
    )
    record = row.mappings().first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if str(record["user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    import json

    def _parse(v):
        if v is None:
            return None
        if isinstance(v, str):
            return json.loads(v)
        return v

    return {
        "id": str(record["id"]),
        "created_at": record["created_at"].isoformat() if record["created_at"] else None,
        "input": record["input"],
        "intent": record["intent"],
        "confidence": float(record["confidence"] or 0),
        "business_context": _parse(record["business_context"]),
        "metrics": _parse(record["metrics_computed"]),
        "result": _parse(record["result"]),
        "pipeline_steps": _parse(record["pipeline_steps"]),
        "duration_ms": record["duration_ms"],
        "cache_hit": record["cache_hit"],
    }
