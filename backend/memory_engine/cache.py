"""
Phase 3 — Redis Cache with In-Memory Fallback

Redis is optional. If Redis is not running, an in-process LRU cache is used.
This keeps local development zero-dependency while supporting Redis in production.

Usage:
    from backend.memory_engine.cache import cache
    await cache.set("key", value, ttl=300)
    val = await cache.get("key")
    await cache.delete("key")
"""
import json
import asyncio
import time
from typing import Any, Optional
from collections import OrderedDict
from backend.utils.logger import logger


# ── In-Process LRU Cache ───────────────────────────────────────────────────────

class _LRUCache:
    """Thread-safe in-memory LRU cache with TTL support."""

    def __init__(self, maxsize: int = 1024):
        self._store: OrderedDict = OrderedDict()
        self._maxsize = maxsize
        self._lock = asyncio.Lock()

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        async with self._lock:
            expires_at = time.monotonic() + ttl
            self._store[key] = (value, expires_at)
            self._store.move_to_end(key)
            if len(self._store) > self._maxsize:
                self._store.popitem(last=False)

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self) -> None:
        async with self._lock:
            self._store.clear()

    async def keys_matching(self, prefix: str) -> list:
        async with self._lock:
            now = time.monotonic()
            return [k for k, (_, exp) in self._store.items()
                    if k.startswith(prefix) and now <= exp]


# ── Redis Adapter ──────────────────────────────────────────────────────────────

class _RedisCache:
    """Wraps aioredis with the same interface as _LRUCache."""

    def __init__(self, url: str):
        self._url = url
        self._client = None

    async def _get_client(self):
        if self._client is None:
            import redis.asyncio as aioredis
            self._client = await aioredis.from_url(self._url, decode_responses=False)
        return self._client

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        client = await self._get_client()
        await client.set(key, json.dumps(value, default=str), ex=ttl)

    async def get(self, key: str) -> Optional[Any]:
        client = await self._get_client()
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, key: str) -> None:
        client = await self._get_client()
        await client.delete(key)

    async def clear(self) -> None:
        client = await self._get_client()
        await client.flushdb()

    async def keys_matching(self, prefix: str) -> list:
        client = await self._get_client()
        keys = await client.keys(f"{prefix}*")
        return [k.decode() if isinstance(k, bytes) else k for k in keys]


# ── Smart Cache: Redis if available, else LRU ─────────────────────────────────

class SmartCache:
    """
    Tries Redis first; falls back to in-process LRU cache.
    Falls back silently on any Redis error — the application never crashes
    due to a missing Redis server.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._redis_url = redis_url
        self._redis: Optional[_RedisCache] = None
        self._lru = _LRUCache(maxsize=2048)
        self._use_redis = False
        self._checked = False

    async def _init(self) -> None:
        if self._checked:
            return
        self._checked = True
        if not self._redis_url:
            logger.info("[Cache] No REDIS_URL configured — using in-process LRU cache.")
            return
        try:
            import redis.asyncio as aioredis  # noqa: F401
            r = _RedisCache(self._redis_url)
            client = await r._get_client()
            await client.ping()
            self._redis = r
            self._use_redis = True
            logger.info(f"[Cache] Redis connected at {self._redis_url}.")
        except Exception as e:
            logger.warning(f"[Cache] Redis unavailable ({e}) — using in-process LRU cache.")

    @property
    def _backend(self):
        return self._redis if self._use_redis else self._lru

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._init()
        try:
            await self._backend.set(key, value, ttl=ttl)
        except Exception as e:
            logger.debug(f"[Cache] set error: {e}")
            await self._lru.set(key, value, ttl=ttl)

    async def get(self, key: str) -> Optional[Any]:
        await self._init()
        try:
            return await self._backend.get(key)
        except Exception as e:
            logger.debug(f"[Cache] get error: {e}")
            return await self._lru.get(key)

    async def delete(self, key: str) -> None:
        await self._init()
        try:
            await self._backend.delete(key)
        except Exception:
            await self._lru.delete(key)

    async def clear(self) -> None:
        await self._init()
        try:
            await self._backend.clear()
        except Exception:
            await self._lru.clear()

    async def invalidate_prefix(self, prefix: str) -> None:
        """Delete all keys starting with prefix."""
        await self._init()
        try:
            keys = await self._backend.keys_matching(prefix)
            for k in keys:
                await self._backend.delete(k)
        except Exception:
            keys = await self._lru.keys_matching(prefix)
            for k in keys:
                await self._lru.delete(k)


# ── Singleton ──────────────────────────────────────────────────────────────────

import os
_REDIS_URL = os.getenv("REDIS_URL", "")
cache = SmartCache(redis_url=_REDIS_URL if _REDIS_URL else None)
