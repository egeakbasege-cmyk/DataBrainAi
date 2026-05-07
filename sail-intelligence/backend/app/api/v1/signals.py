"""
app/api/v1/signals.py

Motor Mode signal endpoints.

GET  /api/v1/signals/live      — SSE stream of live tactical signals
POST /api/v1/signals/approve   — approve a HITL-queued action
POST /api/v1/signals/reject    — reject a HITL-queued action
GET  /api/v1/signals/queue     — current HITL pending queue

CRITICAL: approve is gated behind enable_hitl_enforcement.
          If HITL is enabled (always in prod), capital actions require
          a valid approved signal_id before dispatch.
"""

from __future__ import annotations

import asyncio
import json
from typing import Annotated, AsyncIterator
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.api.v1.auth import require_auth
from app.config import get_settings
from app.core.events import bus, HITLActionQueued, HITLActionApproved, HITLActionRejected
from app.core.exceptions import HITLViolationError

router   = APIRouter()
settings = get_settings()

# In-memory HITL queue (Motor Mode)
# Production: swap for Redis HASH keyed by action_id
_hitl_queue: dict[str, dict] = {}


# ── SSE live feed ─────────────────────────────────────────────────────────────

async def _signal_event_generator(request: Request) -> AsyncIterator[str]:
    """
    Yields SSE-formatted events from the internal EventBus.
    Reconnects automatically on client disconnect.
    """
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=256)

    @bus.subscribe(HITLActionQueued)
    async def _on_queued(evt: HITLActionQueued) -> None:
        payload = json.dumps({
            "type":       "hitl_queued",
            "action_id":  evt.action_id,
            "action_type": evt.action_type,
            "payload":    evt.payload,
            "occurred_at": evt.occurred_at,
        })
        await queue.put(f"data: {payload}\n\n")

    try:
        while not await request.is_disconnected():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield event
            except asyncio.TimeoutError:
                # Heartbeat — keeps the connection alive through proxies/LBs
                yield ": heartbeat\n\n"
    except asyncio.CancelledError:
        pass


@router.get(
    "/live",
    summary="SSE stream of live Motor Mode signals",
    response_class=StreamingResponse,
)
async def live_signals(
    request: Request,
    _user:   Annotated[dict, Depends(require_auth)],
) -> StreamingResponse:
    return StreamingResponse(
        _signal_event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering for SSE
        },
    )


# ── HITL queue ────────────────────────────────────────────────────────────────

@router.get("/queue", summary="Current HITL pending queue")
async def hitl_queue(
    _user: Annotated[dict, Depends(require_auth)],
) -> dict:
    return {"pending_actions": list(_hitl_queue.values())}


class HITLDecisionRequest(BaseModel):
    action_id: str
    reason:    str = ""


@router.post("/approve", summary="Approve a HITL-queued capital action")
async def approve_signal(
    body:  HITLDecisionRequest,
    _user: Annotated[dict, Depends(require_auth)],
) -> dict:
    """
    CRITICAL: This endpoint authorises a capital-deployment action.
    - HITL enforcement cannot be disabled via API — only via env flag (prod: always ON).
    - The approved action_id is published to the EventBus for downstream dispatch.
    """
    if settings.enable_hitl_enforcement and body.action_id not in _hitl_queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action '{body.action_id}' not found in HITL queue.",
        )

    action = _hitl_queue.pop(body.action_id, {})
    user_id = _user.get("sub", "unknown")

    await bus.publish(
        HITLActionApproved(action_id=body.action_id, approved_by=user_id)
    )

    return {
        "status":    "approved",
        "action_id": body.action_id,
        "action":    action,
        "approved_by": user_id,
    }


@router.post("/reject", summary="Reject a HITL-queued action")
async def reject_signal(
    body:  HITLDecisionRequest,
    _user: Annotated[dict, Depends(require_auth)],
) -> dict:
    action = _hitl_queue.pop(body.action_id, {})
    user_id = _user.get("sub", "unknown")

    await bus.publish(
        HITLActionRejected(
            action_id=body.action_id,
            rejected_by=user_id,
            reason=body.reason,
        )
    )

    return {
        "status":      "rejected",
        "action_id":   body.action_id,
        "reason":      body.reason,
        "rejected_by": user_id,
    }
