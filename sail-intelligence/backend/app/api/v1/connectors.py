"""
app/api/v1/connectors.py

Connector management endpoints.

POST /api/v1/connectors/run          — trigger a connector run (MOTOR mode)
GET  /api/v1/connectors/status       — health snapshot of all registered connectors
GET  /api/v1/connectors/{id}/circuit — circuit breaker state for one connector
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.connectors.orchestrator import orchestrator
from app.connectors.registry import registry
from app.connectors.resilience import circuit_registry
from app.core.exceptions import AllConnectorsFailed
from app.api.v1.auth import require_auth

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ConnectorRunRequest(BaseModel):
    connector_id: str = Field(..., description="Registered connector_id to run.")
    queries:      list[str] = Field(..., min_length=1, max_length=20)


class ConnectorRunResponse(BaseModel):
    connector_id: str
    record_count: int
    duration_ms:  int
    queries_used: list[str]
    warnings:     list[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/run",
    response_model=ConnectorRunResponse,
    summary="Trigger a single connector run (Motor mode)",
)
async def run_connector(
    body:    ConnectorRunRequest,
    _user:   Annotated[dict, Depends(require_auth)],
) -> ConnectorRunResponse:
    """
    Dispatches a Motor-mode run for the specified connector.
    Respects rate limits and circuit breaker state.
    Raises 404 if connector_id is not registered; 503 if all retries fail.
    """
    if body.connector_id not in registry.connector_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connector '{body.connector_id}' is not registered.",
        )

    try:
        result = await orchestrator.run_motor_mode(
            connector_id=body.connector_id,
            queries=body.queries,
        )
    except AllConnectorsFailed as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.to_dict(),
        ) from exc

    return ConnectorRunResponse(
        connector_id=result.connector_id,
        record_count=len(result.records),
        duration_ms=result.duration_ms,
        queries_used=result.queries_used,
        warnings=result.warnings,
    )


@router.get(
    "/status",
    summary="Health snapshot for all registered connectors",
)
async def connector_status(
    _user: Annotated[dict, Depends(require_auth)],
) -> dict:
    return {
        "connectors": registry.status(),
        "circuit_breakers": circuit_registry.status(),
    }


@router.get(
    "/{connector_id}/circuit",
    summary="Circuit breaker state for a single connector",
)
async def connector_circuit(
    connector_id: str,
    _user:        Annotated[dict, Depends(require_auth)],
) -> dict:
    if connector_id not in registry.connector_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Connector '{connector_id}' not found.",
        )
    breaker = circuit_registry.get(connector_id)
    return {"connector_id": connector_id, "state": breaker.state.value}
