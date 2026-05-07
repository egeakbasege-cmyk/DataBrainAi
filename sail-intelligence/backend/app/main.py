"""
app/main.py

FastAPI application factory.

Startup sequence (lifespan):
  1. Configure structured logging
  2. Bootstrap connector registry (ApifyOrchestrator.bootstrap)
  3. Mount versioned API router under /api/v1/

Shutdown sequence:
  1. Graceful connector cleanup (if needed)

Global error handler:
  SailBaseError subclasses → structured JSON response with correct HTTP status.
  Unhandled exceptions     → 500 with opaque message (detail never leaked in prod).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.exceptions import SailBaseError
from app.core.logging import configure_logging
from app.connectors.orchestrator import orchestrator
import app.alerts.webhooks  # noqa: F401 — registers EventBus subscribers on import

logger = structlog.get_logger(__name__)
settings = get_settings()


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # ── Startup ───────────────────────────────────────────────────────────────
    configure_logging(settings.log_level)
    logger.info(
        "sail_intelligence_starting",
        env=settings.app_env,
        version=app.version,
    )

    # Register all connectors
    orchestrator.bootstrap()

    logger.info("sail_intelligence_ready")
    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    logger.info("sail_intelligence_shutting_down")


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Sail Intelligence API",
        description=(
            "Enterprise Market Intelligence OS. "
            "Event-driven, CQRS-patterned data ingestion and cognitive analysis."
        ),
        version="1.0.0",
        docs_url="/api/docs"    if not settings.is_production else None,
        redoc_url="/api/redoc"  if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(settings.frontend_url)],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Global error handlers ─────────────────────────────────────────────────
    @app.exception_handler(SailBaseError)
    async def sail_error_handler(request: Request, exc: SailBaseError) -> JSONResponse:
        logger.warning(
            "sail_error",
            code=exc.code,
            message=exc.message,
            path=str(request.url),
        )
        return JSONResponse(
            status_code=exc.http_status,
            content=exc.to_dict(),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", path=str(request.url))
        message = str(exc) if not settings.is_production else "An internal error occurred."
        return JSONResponse(
            status_code=500,
            content={"error": "internal_error", "message": message, "detail": {}},
        )

    # ── Versioned routers ─────────────────────────────────────────────────────
    from app.api.v1 import router as v1_router
    app.include_router(v1_router, prefix="/api/v1")

    # ── Health check (unauthenticated) ────────────────────────────────────────
    @app.get("/health", tags=["system"], include_in_schema=False)
    async def health() -> dict:
        return {
            "status": "ok",
            "env": settings.app_env,
            "connectors": orchestrator._bootstrapped,
        }

    return app


app = create_app()
