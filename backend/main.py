"""
Starcoins Strategy AI — FastAPI application entry point.
"""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from api.analyse import router as analyse_router
from api.auth    import router as auth_router
from api.credits import router as credits_router
from api.history import router as history_router
from api.deps    import get_db, get_redis

# ── Startup env validation ────────────────────────────────────────────
# Fail fast and loud rather than silently misbehave at runtime.

_REQUIRED_ENV = [
    "DATABASE_URL",
    "REDIS_URL",
    "GEMINI_API_KEY",
    "NEXTAUTH_SECRET",
]

_missing = [k for k in _REQUIRED_ENV if not os.environ.get(k)]
if _missing:
    print(
        f"FATAL: Missing required environment variables: {', '.join(_missing)}\n"
        "       Copy .env.example → .env and fill in the values.",
        file=sys.stderr,
    )
    sys.exit(1)

# ── Logging ───────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── Sentry ────────────────────────────────────────────────────────────

sentry_dsn = os.environ.get("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration(), StarletteIntegration()],
        traces_sample_rate=0.1,
        environment=os.environ.get("APP_ENV", "production"),
    )


# ── App lifecycle ─────────────────────────────────────────────────────

async def _init_db() -> None:
    """Apply schema.sql on startup using the shared engine from deps."""
    import pathlib
    from sqlalchemy import text as sa_text
    # Use the same engine (with SSL + pool config) already built in deps
    from api.deps import _engine

    schema_path = pathlib.Path(__file__).parent / "schema.sql"
    if not schema_path.exists():
        logger.warning("schema.sql not found — skipping DB init")
        return

    schema_sql = schema_path.read_text()
    try:
        async with _engine.begin() as conn:
            raw = await conn.get_raw_connection()
            await raw.driver_connection.execute(schema_sql)
        logger.info("DB schema applied OK")
    except Exception as e:
        # Non-fatal: tables may already exist (IF NOT EXISTS guards most stmts)
        logger.error(f"DB init warning: {type(e).__name__}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starcoins API starting",
        extra={"env": os.environ.get("APP_ENV", "production"), "version": "1.0.0"},
    )
    await _init_db()
    yield
    logger.info("Starcoins API shutting down")


app = FastAPI(
    title="Starcoins Strategy AI",
    version="1.0.0",
    docs_url="/docs" if os.environ.get("APP_ENV") != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────

_allowed_origins = [
    os.environ.get("NEXTAUTH_URL", "http://localhost:3000"),
    "http://localhost:3001",   # dev alt port
]
_extra = os.environ.get("ALLOWED_ORIGIN")
if _extra:
    _allowed_origins.append(_extra)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Correlation-ID"],
)

# ── Correlation ID + timing middleware ────────────────────────────────

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    cid = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
    request.state.correlation_id = cid
    t0 = time.monotonic()
    response = await call_next(request)
    duration = round((time.monotonic() - t0) * 1000)
    response.headers["X-Correlation-ID"] = cid
    response.headers["X-Response-Time"]  = f"{duration}ms"
    return response


# ── Exception handlers ────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code":    "VALIDATION_ERROR",
                "message": "Invalid request data",
                "details": exc.errors(),
            },
        },
    )


@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    cid = getattr(request.state, "correlation_id", "unknown")
    logger.exception(
        "Unhandled exception",
        extra={"correlation_id": cid, "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code":             "INTERNAL_SERVER_ERROR",
                "message":          "An unexpected error occurred.",
                "correlation_id":   cid,
            },
        },
    )


# ── Prometheus metrics ────────────────────────────────────────────────

Instrumentator().instrument(app).expose(app, endpoint="/metrics")

# ── Routers ───────────────────────────────────────────────────────────

app.include_router(auth_router,    prefix="/api")
app.include_router(analyse_router, prefix="/api")
app.include_router(credits_router, prefix="/api")
app.include_router(history_router, prefix="/api")


# ── Health check ─────────────────────────────────────────────────────

@app.get("/api/health", tags=["ops"])
async def health():
    from sqlalchemy import text as sa_text

    db_ok    = "ok"
    redis_ok = "ok"

    try:
        gen     = get_db()
        session = await gen.__anext__()
        try:
            await session.execute(sa_text("SELECT 1"))
        finally:
            await gen.aclose()
    except Exception as e:
        db_ok = f"error: {e}"

    try:
        r = await get_redis()
        await r.ping()
    except Exception as e:
        redis_ok = f"error: {e}"

    overall = "ok" if db_ok == "ok" and redis_ok == "ok" else "degraded"
    return {
        "status":     overall,
        "db_ping":    db_ok,
        "redis_ping": redis_ok,
        "version":    "1.0.0",
        "env":        os.environ.get("APP_ENV", "production"),
    }
