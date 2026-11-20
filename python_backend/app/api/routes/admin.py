"""
管理员路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, or_
from typing import Literal, Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
import uuid

from app.api.deps import get_db, get_workspace_user
from app.models.user import User, UserCapability
from app.models.task import AsyncTask
from app.models.practice import PracticeResult

router = APIRouter(prefix="/api/admin", tags=["管理员"])



@router.get("/users")
async def get_users(
    *,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str = Query("", max_length=255),
    sortBy: Literal["created_at", "username", "email", "last_login_at"] = "created_at",
    sortOrder: Literal["asc", "desc"] = "desc",
):
    """获取用户列表"""
    if page > 1 and offset == 0:
        offset = (page - 1) * limit

    filters = []
    if search.strip():
        term = search.strip().lower()
        filters.append(or_(
            func.lower(User.username).contains(term, autoescape=True),
            func.lower(User.email).contains(term, autoescape=True),
        ))
    column = getattr(User, sortBy)
    order = column.asc() if sortOrder == "asc" else column.desc()
    result = await db.execute(
        select(User).where(*filters).order_by(order.nulls_last(), User.id).offset(offset).limit(limit)
    )
    users = list(result.scalars().all())

    total_result = await db.execute(select(func.count(User.id)).where(*filters))
    total = total_result.scalar() or 0

    user_rows = []
    for u in users:
        user_rows.append(
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "createdAt": u.created_at.isoformat() if u.created_at else None,
                "lastLoginAt": u.last_login_at.isoformat() if u.last_login_at else None,
            }
        )

    total_pages = max((total + limit - 1) // limit, 1)
    current_page = (offset // limit) + 1

    return {
        "success": True,
        "data": {
            "users": user_rows,
            "pagination": {
                "currentPage": current_page,
                "totalPages": total_pages,
                "totalUsers": total,
                "limit": limit,
            },
        },
        "pagination": {"total": total, "limit": limit, "offset": offset},
    }


@router.get("/users/{user_id}")
async def get_user(
    *,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """获取用户详情"""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    capability_rows = await db.scalars(
        select(UserCapability).where(UserCapability.user_id == user.id)
    )
    capabilities = [
        {
            "language": c.language,
            "currentLevel": c.current_level,
            "overallLevel": c.overall_level,
            "confidenceScore": c.confidence_score,
            "listeningLevel": c.listening_level,
            "speakingLevel": c.speaking_level,
            "readingLevel": c.reading_level,
            "writingLevel": c.writing_level,
            "lastAssessedAt": c.last_assessed_at.isoformat() if c.last_assessed_at else None,
        }
        for c in capability_rows
    ]

    stats_result = await db.execute(
        select(
            func.count(PracticeResult.id),
            func.avg(PracticeResult.accuracy),
            func.sum(PracticeResult.total_time),
            func.max(PracticeResult.completed_at),
        ).where(PracticeResult.user_id == user.id)
    )
    total_practices, average_accuracy, total_practice_time, last_practice_at = stats_result.one()

    return {
        "success": True,
        "data": {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "createdAt": user.created_at.isoformat() if user.created_at else None,
                "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
            },
            "capabilities": capabilities,
            "practiceStats": {
                "total_practices": total_practices or 0,
                "average_accuracy": float(average_accuracy or 0),
                "total_practice_time": int(total_practice_time or 0),
                "last_practice_at": last_practice_at.isoformat() if last_practice_at else None,
            },
        },
    }


@router.get("/statistics")
async def get_system_statistics(
    *,
    db: AsyncSession = Depends(get_db),
):
    """获取系统统计"""
    # 用户统计
    user_count_result = await db.execute(select(func.count(User.id)))
    user_count = user_count_result.scalar() or 0

    practice_count = await db.scalar(select(func.count(PracticeResult.id)))
    task_count = await db.scalar(select(func.count(AsyncTask.id)))
    return {
        "success": True,
        "data": {
            "totalUsers": user_count,
            "completedPractices": practice_count,
            "totalTasks": task_count,
        },
    }


@router.get("/queue-metrics")
async def get_queue_metrics(
    *,
    db: AsyncSession = Depends(get_db),
):
    """获取任务队列指标"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    status_counts_result = await db.execute(
        select(AsyncTask.status, func.count(AsyncTask.id))
        .where(AsyncTask.created_at >= cutoff)
        .group_by(AsyncTask.status)
    )
    status_counts = {row[0]: row[1] for row in status_counts_result.all()}
    total_tasks = sum(status_counts.values())
    completed = status_counts.get("completed", 0)
    failed = status_counts.get("failed", 0)

    return {
        "success": True,
        "data": {
            "totalTasks": total_tasks,
            "queuedTasks": status_counts.get("queued", 0) + status_counts.get("pending", 0),
            "processingTasks": status_counts.get("processing", 0),
            "completedTasks": completed,
            "failedTasks": failed,
            "averageWaitTime": 0,
            "averageProcessingTime": 0,
            "throughputPerMinute": 0,
            "resourceUtilization": 0,
            "errorRate": float((failed / total_tasks) * 100) if total_tasks else 0,
            "statusBreakdown": status_counts,
        },
    }


@router.get("/tasks")
async def get_admin_tasks(
    *,
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """获取管理员任务列表"""
    query = select(AsyncTask)
    count_query = select(func.count(AsyncTask.id))

    if status:
        query = query.where(AsyncTask.status == status)
        count_query = count_query.where(AsyncTask.status == status)
    if type:
        query = query.where(AsyncTask.task_type == type)
        count_query = count_query.where(AsyncTask.task_type == type)

    query = query.order_by(AsyncTask.created_at.desc()).offset(offset).limit(limit)
    task_result = await db.execute(query)
    tasks = list(task_result.scalars().all())

    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    return {
        "success": True,
        "data": {
            "tasks": [
                {
                    "id": str(t.id),
                    "user_id": str(t.user_id),
                    "type": t.task_type,
                    "status": t.status,
                    "priority": t.priority,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "started_at": t.started_at.isoformat() if t.started_at else None,
                    "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                    "progress": t.progress_percent or 0,
                    "execution_time": (t.completed_at - t.started_at).total_seconds() * 1000
                    if t.completed_at and t.started_at else None,
                    "error_message": t.error_message,
                }
                for t in tasks
            ],
            "totalCount": total_count,
        },
    }


@router.post("/retry-failed-tasks", include_in_schema=False)
async def retry_failed_tasks():
    raise HTTPException(status_code=501, detail="暂不支持从历史记录重新提交任务。")


class TaskCleanupRequest(BaseModel):
    days: int = Field(7, ge=1, le=3650)
    includeCompleted: bool = True
    includeFailed: bool = False


@router.post("/clear-queue")
async def clear_queue(
    request: TaskCleanupRequest,
    db: AsyncSession = Depends(get_db),
):
    """按保留期删除已结束的任务记录。"""
    statuses = []
    if request.includeCompleted:
        statuses.append("completed")
    if request.includeFailed:
        statuses.append("failed")

    deleted_count = 0
    if statuses:
        cutoff = datetime.now(timezone.utc) - timedelta(days=request.days)
        result = await db.execute(delete(AsyncTask).where(
            AsyncTask.status.in_(statuses),
            func.coalesce(AsyncTask.completed_at, AsyncTask.updated_at, AsyncTask.created_at) < cutoff,
        ))
        deleted_count = result.rowcount
        await db.commit()

    return {
        "success": True,
        "data": {"deletedTasks": deleted_count, "clearedDays": request.days},
    }
