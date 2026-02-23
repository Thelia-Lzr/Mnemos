"""
数据库连接配置
"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncEngine
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy 基础模型类"""
    pass


# 数据库引擎
engine: AsyncEngine = None
# Session 工厂
AsyncSessionLocal: async_sessionmaker[AsyncSession] = None


def init_database() -> None:
    """初始化数据库连接"""
    global engine, AsyncSessionLocal

    engine = create_async_engine(
        settings.database_url,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_timeout=30,
        echo=settings.NODE_ENV == "development",
    )

    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    logger.info("Database connection pool initialized")


async def get_database_session() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话（依赖注入用）"""
    if AsyncSessionLocal is None:
        init_database()

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_engine() -> AsyncEngine:
    """获取数据库引擎"""
    if engine is None:
        init_database()
    return engine


async def close_database() -> None:
    """关闭数据库连接"""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database connection pool closed")


async def health_check() -> dict:
    """数据库健康检查"""
    try:
        if engine is None:
            return {"healthy": False, "error": "Database engine not initialized"}

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            return {
                "healthy": True,
                "pool_size": engine.pool.size() if engine.pool else 0,
                "pool_checked_out": engine.pool.checkedout() if engine.pool else 0,
            }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"healthy": False, "error": str(e)}


# 导入所有模型以确保它们被注册
# 这需要在创建表之前完成
def import_all_models() -> None:
    """导入所有模型"""
    # 这些导入会在模型定义完成后使用
    # from app.models import user, chat_message, practice, vocabulary, pk, payment
    pass
