"""
CacheManager — Redis semantic dedup cache with SHA-256 keys.
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Optional

from redis.asyncio import Redis


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace."""
    t = text.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def make_cache_key(user_input: str) -> str:
    normalised = _normalise(user_input)
    return hashlib.sha256(normalised.encode()).hexdigest()


class CacheManager:
    PREFIX = "strategy"

    def __init__(self, redis: Redis, ttl: int = 3600):
        self.redis = redis
        self.ttl = ttl

    async def get(self, user_input: str) -> Optional[dict]:
        key = f"{self.PREFIX}:{make_cache_key(user_input)}"
        raw = await self.redis.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, user_input: str, value: dict) -> None:
        key = f"{self.PREFIX}:{make_cache_key(user_input)}"
        await self.redis.setex(key, self.ttl, json.dumps(value))

    async def invalidate(self, user_input: str) -> None:
        key = f"{self.PREFIX}:{make_cache_key(user_input)}"
        await self.redis.delete(key)
