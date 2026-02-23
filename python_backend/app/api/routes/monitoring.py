"""
监控路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import psutil
import time

from app.api.deps import get_db, get_current_user, require_admin
from app.core.database import health_check as db_health
from app.core.redis import redis_health_check
from app.models.user import User

router = APIRouter(prefix="/api/monitoring", tags=["监控"])


@router.get("/health")
async def health_endpoint(
    *,
    db: AsyncSession = Depends(get_db),
):
    """健康检查"""
    db_status = await db_health()
    redis_status = await redis_health_check()

    overall_status = "healthy"
    if not db_status.get("healthy"):
        overall_status = "degraded"
    if not redis_status.get("healthy"):
        overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": time.time(),
        "services": {
            "database": db_status,
            "redis": redis_status,
        },
    }


@router.get("/metrics")
async def get_metrics(
    *,
    current_user: User = Depends(require_admin),
):
    """获取系统指标"""
    # CPU 使用率
    cpu_percent = psutil.cpu_percent(interval=0.1)

    # 内存使用
    memory = psutil.virtual_memory()

    # 磁盘使用
    disk = psutil.disk_usage("/")

    return {
        "success": True,
        "data": {
            "cpu": {
                "usage_percent": cpu_percent,
                "cores": psutil.cpu_count(),
            },
            "memory": {
                "total_mb": memory.total / (1024 * 1024),
                "used_mb": memory.used / (1024 * 1024),
                "available_mb": memory.available / (1024 * 1024),
                "usage_percent": memory.percent,
            },
            "disk": {
                "total_gb": disk.total / (1024 * 1024 * 1024),
                "used_gb": disk.used / (1024 * 1024 * 1024),
                "free_gb": disk.free / (1024 * 1024 * 1024),
                "usage_percent": disk.percent,
            },
        },
    }


@router.get("/alerts")
async def get_alerts(
    *,
    current_user: User = Depends(require_admin),
):
    """获取警报列表"""
    # TODO: 实现警报系统
    return {
        "success": True,
        "data": {
            "alerts": [],
            "totalCount": 0,
        },
    }


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    *,
    alert_id: str,
    current_user: User = Depends(require_admin),
):
    """解决警报"""
    # TODO: 实现警报解决逻辑
    return {
        "success": True,
        "message": f"Alert {alert_id} resolved",
    }


@router.get("/database/stats")
async def get_database_stats(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """获取数据库统计"""
    # 用户总数
    user_count_result = await db.execute(select(func.count(User.id)))
    user_count = user_count_result.scalar() or 0

    # TODO: 添加更多数据库统计
    return {
        "success": True,
        "data": {
            "totalUsers": user_count,
            "activeUsers": 0,  # TODO: 实现
            "totalPractices": 0,  # TODO: 实现
            "totalChatMessages": 0,  # TODO: 实现
        },
    }


@router.get("/cache/stats")
async def get_cache_stats(
    *,
    current_user: User = Depends(require_admin),
):
    """获取缓存统计"""
    # TODO: 实现 Redis 缓存统计
    return {
        "success": True,
        "data": {
            "hitRate": 0.0,
            "missRate": 0.0,
            "totalKeys": 0,
            "memoryUsage": "0 MB",
        },
    }
