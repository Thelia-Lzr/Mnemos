"""
测试配置
"""
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import asyncio

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# 测试数据库 URL
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5433/ai_language_learning_test"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_engine():
    """创建测试数据库引擎"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        pool_pre_ping=True,
        echo=True,
    )

    # 创建所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # 删除所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def test_db(test_engine) -> AsyncSession:
    """创建测试数据库会话"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
def client(test_db: AsyncSession):
    """创建测试客户端"""

    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_client(client: TestClient) -> Generator[TestClient, None, None]:
    """创建已认证的测试客户端"""
    # 这里可以添加自动登录逻辑
    yield client


# 测试数据工厂
@pytest.fixture
def user_factory():
    """用户工厂"""
    def create_user(
        username: str = "testuser",
        email: str = "test@example.com",
        password: str = "testpassword123",
    ):
        return {
            "username": username,
            "email": email,
            "password": password,
        }
    return create_user


@pytest.fixture
def token_factory():
    """令牌工厂"""
    def create_token(
        access_token: str = "test_access_token",
        refresh_token: str = "test_refresh_token",
    ):
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,
        }
    return create_token
