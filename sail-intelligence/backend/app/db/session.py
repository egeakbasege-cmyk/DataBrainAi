"""
app/db/session.py

Async SQLAlchemy engine + session factory.

Usage:
    async with get_session() as session:
        result = await session.execute(select(User))

All database operations MUST go through this session factory —
never instantiate AsyncSession directly.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",   # SQL logging in dev only
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,    # verify connections before checkout
    pool_recycle=3600,     # recycle connections hourly
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """
    Async context manager that yields a database session.
    Commits on clean exit; rolls back on any exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
