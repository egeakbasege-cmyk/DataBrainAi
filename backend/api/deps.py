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

_engine = create_async_engine(
    os.environ["DATABASE_URL"],
    pool_size=10,
    max_overflow=20,
    echo=False,
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
        _engine_instance = StrategyEngine(os.environ["ANTHROPIC_API_KEY"])
    return _engine_instance


# ── JWT auth ──────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("NEXTAUTH_SECRET", "changeme")
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
