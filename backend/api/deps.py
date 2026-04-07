"""
Shared FastAPI dependencies: DB session, Redis, JWT auth, StrategyEngine.
"""

from __future__ import annotations

import os
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.strategy_engine import StrategyEngine

# ── Database ──────────────────────────────────────────────────────────

# Railway provides postgresql:// but asyncpg needs postgresql+asyncpg://.
# asyncpg does NOT understand ?sslmode= URL parameters — strip it and pass
# ssl via connect_args instead (Railway postgres requires SSL externally).
import re as _re

_db_raw = os.environ["DATABASE_URL"].strip()
_db_url = _re.sub(r"[?&]sslmode=[^&]*", "", _db_raw).replace(
    "postgresql://", "postgresql+asyncpg://", 1
).replace(
    "postgres://", "postgresql+asyncpg://", 1
)

_engine = create_async_engine(
    _db_url,
    pool_size=10,
    max_overflow=20,
    echo=False,
    connect_args={"ssl": "require"},
)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session


# ── Redis ─────────────────────────────────────────────────────────────

_redis: Redis | None = None


async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)
    return _redis


# ── StrategyEngine singleton ──────────────────────────────────────────

_engine_instance: StrategyEngine | None = None


def get_strategy_engine() -> StrategyEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = StrategyEngine(os.environ["GEMINI_API_KEY"])
    return _engine_instance


# ── JWT auth ──────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("NEXTAUTH_SECRET", "")
if not JWT_SECRET:
    raise RuntimeError("NEXTAUTH_SECRET environment variable is required.")
ALGORITHM = "HS256"


async def get_current_user(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
