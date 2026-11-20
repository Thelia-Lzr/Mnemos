"""
Mnemos Python Backend - FastAPI 应用入口
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.database import init_database, close_database
from app.core.redis import init_redis, close_redis
from app.api.error_handlers import register_exception_handlers
from app.api.routes import (
    ai_settings,
    users,
    chat,
    practice,
    vocabulary,
    pk,
    payment,
    assessment,
    daily_recommendations,
    tasks,
    monitoring,
    admin,
    user_languages,
)

# 配置日志
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    logger.info("Starting Mnemos backend...")

    # 初始化数据库
    init_database()
    logger.info("Database connection initialized")

    # 初始化 Redis
    await init_redis()
    logger.info("Redis connection initialized")

    yield

    # 关闭时清理
    logger.info("Shutting down Mnemos backend...")

    # 关闭数据库连接
    await close_database()

    # 关闭 Redis 连接
    await close_redis()

    logger.info("Shutdown complete")


# 创建 FastAPI 应用
app = FastAPI(
    title="Mnemos API",
    description="Mnemos AI Language Learning Workspace - Python Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 工作台只通过本机地址访问。
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1"],
)


# 注册异常处理器
register_exception_handlers(app)

# 注册路由
app.include_router(ai_settings.router)
app.include_router(users.router)
app.include_router(chat.router)
app.include_router(practice.router)
app.include_router(vocabulary.router)
app.include_router(pk.router)
app.include_router(payment.router)
app.include_router(assessment.router)
app.include_router(daily_recommendations.router)
app.include_router(tasks.router)
app.include_router(monitoring.router)
app.include_router(admin.router)
app.include_router(user_languages.router)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    from app.core.database import health_check as db_health
    from app.core.redis import redis_health_check

    db_status = await db_health()
    redis_status = await redis_health_check()

    overall_status = "healthy"
    if not db_status.get("healthy"):
        overall_status = "degraded"
    if not redis_status.get("healthy"):
        overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "Mnemos API",
        "version": "1.0.0",
        "description": "AI Language Learning Workspace",
        "docs": "/docs",
    }


# 中间件：请求日志
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录请求日志"""
    origin = request.headers.get("origin")
    if request.url.path.startswith("/api/"):
        cross_site = request.headers.get("sec-fetch-site") == "cross-site"
        if (origin is not None or cross_site) and origin not in settings.allowed_origins:
            return JSONResponse({"detail": "工作台拒绝此浏览器来源。"}, status_code=403)
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} - {response.status_code}")
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.NODE_ENV == "development",
    )
