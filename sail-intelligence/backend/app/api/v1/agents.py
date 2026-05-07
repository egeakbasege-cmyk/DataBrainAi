"""
app/api/v1/agents.py

Cognitive Engine API endpoints.

POST /api/v1/agents/run          — launch a full cognitive engine run
GET  /api/v1/agents/results/{id} — poll for results by job_id
GET  /api/v1/agents/status       — graph topology + last run summary
"""

from __future__ import annotations

import asyncio
from typing import Annotated, Any
from uuid import uuid4

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.v1.auth import require_auth
from app.agents.graph import run_cognitive_engine
from app.ontology.models import MarketEntity, PricePoint, AdAsset, TrendSignal

logger = structlog.get_logger(__name__)
router = APIRouter()

# In-memory job store (swap for Redis HASH in production)
_job_store: dict[str, dict[str, Any]] = {}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    query:         str = Field(..., min_length=3, max_length=500)
    entities:      list[dict] = Field(default_factory=list)
    price_points:  list[dict] = Field(default_factory=list)
    ad_assets:     list[dict] = Field(default_factory=list)
    trend_signals: list[dict] = Field(default_factory=list)


class AgentRunResponse(BaseModel):
    job_id: str
    status: str = "queued"
    message: str = "Cognitive engine run queued. Poll /agents/results/{job_id}."


class AgentResultResponse(BaseModel):
    job_id:           str
    status:           str             # queued | running | complete | failed
    completed_agents: list[str]
    error_count:      int
    summary:          dict[str, Any]
    # Agent outputs
    pl_simulations:   list[dict]
    arbitrage_ops:    list[dict]
    entity_links:     list[dict]
    forecasts:        list[dict]
    anomalies:        list[dict]
    archetypes:       list[dict]
    unmet_needs:      list[str]
    copy_angles:      list[dict]
    errors:           list[dict]


# ── Background runner ─────────────────────────────────────────────────────────

async def _run_engine_background(
    job_id:        str,
    query:         str,
    entities:      list,
    price_points:  list,
    ad_assets:     list,
    trend_signals: list,
) -> None:
    _job_store[job_id]["status"] = "running"
    try:
        # Deserialise dicts → Pydantic models (best-effort; skip invalid)
        def safe_parse(model, items):
            out = []
            for item in items:
                try:
                    out.append(model(**item))
                except Exception:
                    pass
            return out

        result = await run_cognitive_engine(
            entities=      safe_parse(MarketEntity, entities),
            price_points=  safe_parse(PricePoint,   price_points),
            ad_assets=     safe_parse(AdAsset,       ad_assets),
            trend_signals= safe_parse(TrendSignal,   trend_signals),
            query=query,
        )

        # Serialise EntityLink objects → dicts for JSON storage
        er_links_raw = [
            link.model_dump() for link in result.get("er_links", [])
        ]

        _job_store[job_id].update({
            "status":           "complete",
            "completed_agents": result.get("completed_agents", []),
            "errors":           result.get("errors", []),
            "summary":          result.get("__summary", {}),
            "pl_simulations":   result.get("ff_pl_simulations", []),
            "arbitrage_ops":    result.get("ff_arbitrage_ops",  []),
            "entity_links":     er_links_raw,
            "forecasts":        result.get("ps_forecasts",      []),
            "anomalies":        result.get("ps_anomalies",      []),
            "archetypes":       result.get("nlp_archetypes",    []),
            "unmet_needs":      result.get("nlp_unmet_needs",   []),
            "copy_angles":      result.get("nlp_copy_angles",   []),
        })

        logger.info("agent_job_complete", job_id=job_id)

    except Exception as exc:
        logger.error("agent_job_failed", job_id=job_id, error=str(exc))
        _job_store[job_id].update({
            "status": "failed",
            "errors": [{"fatal": True, "error": str(exc)}],
        })


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/run",
    response_model=AgentRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Launch a cognitive engine run (async)",
)
async def run_agents(
    body:       AgentRunRequest,
    background: BackgroundTasks,
    _user:      Annotated[dict, Depends(require_auth)],
) -> AgentRunResponse:
    """
    Accepts the run request, queues it as a background task, and returns
    a job_id immediately. Results are available via GET /agents/results/{job_id}.

    All four agents run in the same async event loop — no Celery needed for
    on-demand runs. The Celery tasks (sail/yacht/motor modes) handle scheduled
    batch runs separately.
    """
    job_id = str(uuid4())
    _job_store[job_id] = {
        "status":           "queued",
        "completed_agents": [],
        "errors":           [],
        "summary":          {},
        "pl_simulations":   [],
        "arbitrage_ops":    [],
        "entity_links":     [],
        "forecasts":        [],
        "anomalies":        [],
        "archetypes":       [],
        "unmet_needs":      [],
        "copy_angles":      [],
    }

    background.add_task(
        _run_engine_background,
        job_id=job_id,
        query=body.query,
        entities=body.entities,
        price_points=body.price_points,
        ad_assets=body.ad_assets,
        trend_signals=body.trend_signals,
    )

    return AgentRunResponse(job_id=job_id)


@router.get(
    "/results/{job_id}",
    response_model=AgentResultResponse,
    summary="Poll cognitive engine results by job_id",
)
async def agent_results(
    job_id: str,
    _user:  Annotated[dict, Depends(require_auth)],
) -> AgentResultResponse:
    job = _job_store.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    return AgentResultResponse(
        job_id=job_id,
        status=job["status"],
        completed_agents=job.get("completed_agents", []),
        error_count=len(job.get("errors", [])),
        summary=job.get("summary", {}),
        pl_simulations=job.get("pl_simulations", []),
        arbitrage_ops=job.get("arbitrage_ops", []),
        entity_links=job.get("entity_links", []),
        forecasts=job.get("forecasts", []),
        anomalies=job.get("anomalies", []),
        archetypes=job.get("archetypes", []),
        unmet_needs=job.get("unmet_needs", []),
        copy_angles=job.get("copy_angles", []),
        errors=job.get("errors", []),
    )


@router.get("/status", summary="Graph topology and last run summary")
async def agent_status(
    _user: Annotated[dict, Depends(require_auth)],
) -> dict:
    recent_jobs = [
        {"job_id": jid, "status": j["status"], "summary": j.get("summary", {})}
        for jid, j in list(_job_store.items())[-10:]
    ]
    return {
        "graph_nodes": [
            "financial_forensics",
            "entity_resolution",
            "nlp_psychographic",
            "predictive_signal",
            "merge",
        ],
        "parallel_nodes":     ["financial_forensics", "entity_resolution", "nlp_psychographic"],
        "sequential_nodes":   ["predictive_signal", "merge"],
        "total_jobs":         len(_job_store),
        "recent_jobs":        recent_jobs,
    }
