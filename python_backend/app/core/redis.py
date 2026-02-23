"""
Redis 连接配置
"""
import redis.asyncio as redis
from typing import Optional
import logging
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis 客户端
redis_client: Optional[redis.Redis] = None


async def init_redis() -> None:
    """初始化 Redis 连接"""
    global redis_client

    redis_client = redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True,
    )

    try:
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
        redis_client = None


async def get_redis() -> Optional[redis.Redis]:
    """获取 Redis 客户端"""
    if redis_client is None:
        await init_redis()
    return redis_client


async def close_redis() -> None:
    """关闭 Redis 连接"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


async def redis_health_check() -> dict:
    """Redis 健康检查"""
    try:
        if redis_client is None:
            return {"healthy": False, "error": "Redis client not initialized"}

        await redis_client.ping()
        info = await redis_client.info("server")
        return {
            "healthy": True,
            "version": info.get("redis_version", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return {"healthy": False, "error": str(e)}


class RedisCache:
    """Redis 缓存工具类"""

    def __init__(self, prefix: str = ""):
        self.prefix = prefix
        self.client: Optional[redis.Redis] = None

    async def _get_client(self) -> Optional[redis.Redis]:
        if self.client is None:
            self.client = await get_redis()
        return self.client

    def _make_key(self, key: str) -> str:
        return f"{self.prefix}:{key}" if self.prefix else key

    async def get(self, key: str) -> Optional[str]:
        """获取字符串值"""
        client = await self._get_client()
        if not client:
            return None
        return await client.get(self._make_key(key))

    async def get_json(self, key: str) -> Optional[dict]:
        """获取 JSON 值"""
        client = await self._get_client()
        if not client:
            return None
        value = await client.get(self._make_key(key))
        if value:
            return json.loads(value)
        return None

    async def set(self, key: str, value: str, expire: int = None) -> bool:
        """设置字符串值"""
        client = await self._get_client()
        if not client:
            return False
        return await client.set(self._make_key(key), value, ex=expire)

    async def set_json(self, key: str, value: dict, expire: int = None) -> bool:
        """设置 JSON 值"""
        client = await self._get_client()
        if not client:
            return False
        return await client.set(
            self._make_key(key),
            json.dumps(value, ensure_ascii=False),
            ex=expire,
        )

    async def delete(self, key: str) -> int:
        """删除键"""
        client = await self._get_client()
        if not client:
            return 0
        return await client.delete(self._make_key(key))

    async def delete_pattern(self, pattern: str) -> int:
        """批量删除匹配模式的键"""
        client = await self._get_client()
        if not client:
            return 0
        keys = []
        async for key in client.scan_iter(f"{self.prefix}:{pattern}"):
            keys.append(key)
        if keys:
            return await client.delete(*keys)
        return 0

    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        client = await self._get_client()
        if not client:
            return False
        return await client.exists(self._make_key(key))

    async def incr(self, key: str, amount: int = 1) -> int:
        """自增"""
        client = await self._get_client()
        if not client:
            return 0
        return await client.incr(self._make_key(key), amount)

    async def expire(self, key: str, seconds: int) -> bool:
        """设置过期时间"""
        client = await self._get_client()
        if not client:
            return False
        return await client.expire(self._make_key(key), seconds)


# 常用缓存实例
user_cache = RedisCache(prefix="user")
session_cache = RedisCache(prefix="session")
task_cache = RedisCache(prefix="task")
rate_limit_cache = RedisCache(prefix="ratelimit")
