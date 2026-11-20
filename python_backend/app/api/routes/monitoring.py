"""
监控路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Optional, Dict, Any, List
import psutil
import time

from app.api.deps import get_db
from app.core.database import health_check as db_health
from app.core.redis import redis_health_check
from app.models.user import User

router = APIRouter(prefix="/api/monitoring", tags=["监控"])

_RESOLVED_ALERT_IDS: set[str] = set()


async def _get_active_connections(db: AsyncSession) -> int:
    try:
        result = await db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"))
        return int(result.scalar() or 0)
    except Exception:
        return 0


def _to_service_status(service_data: Dict[str, Any], fallback_name: str, response_time: float) -> Dict[str, Any]:
    healthy = service_data.get("healthy")
    if healthy is True:
        status_value = "healthy"
        message = f"{fallback_name} service is healthy"
    elif healthy is False:
        status_value = "critical"
        message = service_data.get("error") or service_data.get("message") or f"{fallback_name} service check failed"
    else:
        status_value = "degraded"
        message = service_data.get("message") or f"{fallback_name} status is degraded"

    return {
        "status": status_value,
        "message": message,
        "lastCheck": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "responseTime": response_time,
    }


async def _build_monitoring_snapshot(db: AsyncSession) -> Dict[str, Any]:
    db_start = time.perf_counter()
    db_status = await db_health()
    db_response_time = round((time.perf_counter() - db_start) * 1000, 2)

    redis_start = time.perf_counter()
    redis_status = await redis_health_check()
    redis_response_time = round((time.perf_counter() - redis_start) * 1000, 2)

    cpu_percent = float(psutil.cpu_percent(interval=0.1))
    memory = psutil.virtual_memory()
    active_connections = await _get_active_connections(db)

    db_service = _to_service_status(db_status, "Database", db_response_time)
    redis_service = _to_service_status(redis_status, "Redis", redis_response_time)

    memory_status = "critical" if memory.percent >= 90 else "degraded" if memory.percent >= 80 else "healthy"
    cpu_status = "critical" if cpu_percent >= 90 else "degraded" if cpu_percent >= 80 else "healthy"

    services = {
        "database": db_service,
        "redis": redis_service,
        "memory": {
            "status": memory_status,
            "message": f"Memory usage at {memory.percent:.1f}%",
            "lastCheck": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "responseTime": None,
        },
        "cpu": {
            "status": cpu_status,
            "message": f"CPU usage at {cpu_percent:.1f}%",
            "lastCheck": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "responseTime": None,
        },
    }

    status_candidates = [services["database"]["status"], services["redis"]["status"], memory_status, cpu_status]
    if "critical" in status_candidates:
        overall_status = "critical"
    elif "degraded" in status_candidates:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    response_time_candidates = [
        value for value in [db_service.get("responseTime"), redis_service.get("responseTime")] if isinstance(value, (int, float))
    ]
    response_time = float(sum(response_time_candidates) / len(response_time_candidates)) if response_time_candidates else 0.0

    error_sources = [services["database"]["status"], services["redis"]["status"]]
    error_rate = (sum(1 for status_value in error_sources if status_value != "healthy") / max(len(error_sources), 1)) * 100.0

    return {
        "status": overall_status,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime": int(time.time() - psutil.boot_time()),
        "services": services,
        "metrics": {
            "activeConnections": active_connections,
            "memoryUsage": float(memory.percent),
            "cpuUsage": float(cpu_percent),
            "responseTime": float(response_time),
            "errorRate": float(error_rate),
        },
    }


def _build_alerts(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    metrics = snapshot["metrics"]
    services = snapshot["services"]

    for service_name, service_data in services.items():
        if service_data["status"] != "healthy":
            severity = "error" if service_data["status"] == "critical" else "warning"
            alert_id = f"service-{service_name}-{service_data['status']}"
            alerts.append({
                "id": alert_id,
                "type": severity,
                "service": service_name,
                "message": service_data.get("message", f"{service_name} is not healthy"),
                "timestamp": now_iso,
                "resolved": alert_id in _RESOLVED_ALERT_IDS,
                "metadata": {
                    "status": service_data["status"],
                    "lastCheck": service_data.get("lastCheck"),
                },
            })

    if metrics["memoryUsage"] >= 80:
        alert_id = "metric-memory-high"
        alerts.append({
            "id": alert_id,
            "type": "error" if metrics["memoryUsage"] >= 90 else "warning",
            "service": "memory",
            "message": f"Memory usage is high ({metrics['memoryUsage']:.1f}%)",
            "timestamp": now_iso,
            "resolved": alert_id in _RESOLVED_ALERT_IDS,
            "metadata": {"usage": metrics["memoryUsage"]},
        })

    if metrics["cpuUsage"] >= 80:
        alert_id = "metric-cpu-high"
        alerts.append({
            "id": alert_id,
            "type": "error" if metrics["cpuUsage"] >= 90 else "warning",
            "service": "cpu",
            "message": f"CPU usage is high ({metrics['cpuUsage']:.1f}%)",
            "timestamp": now_iso,
            "resolved": alert_id in _RESOLVED_ALERT_IDS,
            "metadata": {"usage": metrics["cpuUsage"]},
        })

    if not alerts:
        alert_id = "system-healthy-info"
        alerts.append({
            "id": alert_id,
            "type": "info",
            "service": "system",
            "message": "All monitored services are healthy",
            "timestamp": now_iso,
            "resolved": False,
            "metadata": {"status": snapshot["status"]},
        })

    return alerts


@router.get("/health")
async def health_endpoint(
    *,
    db: AsyncSession = Depends(get_db),
):
    """健康检查"""
    snapshot = await _build_monitoring_snapshot(db)
    return {
        "success": True,
        "data": snapshot,
    }


@router.get("/metrics")
async def get_metrics():
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
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
):
    """获取警报列表"""
    snapshot = await _build_monitoring_snapshot(db)
    alerts = _build_alerts(snapshot)

    unresolved = [a for a in alerts if not a["resolved"]]
    resolved = [a for a in alerts if a["resolved"]]
    ordered_alerts = unresolved + resolved

    return {
        "success": True,
        "data": ordered_alerts[:limit],
    }


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(
    *,
    alert_id: str,
):
    """解决警报"""
    _RESOLVED_ALERT_IDS.add(alert_id)
    return {
        "success": True,
        "message": f"Alert {alert_id} resolved",
    }


@router.get("/database/stats")
async def get_database_stats(
    *,
    db: AsyncSession = Depends(get_db),
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
async def get_cache_stats():
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
