"""
异步任务路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import uuid

from app.api.deps import get_db, get_current_user
from app.schemas.task import (
    TaskStatus,
    TaskPriority,
    AsyncTaskResponse,
    TaskStatusResponse,
    TaskResultResponse,
)
from app.models.user import User
from app.models.task import AsyncTask

router = APIRouter(prefix="/api/tasks", tags=["任务"])


@router.get("/user")
async def get_user_tasks(
    *,
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """获取用户任务列表"""
    query = select(AsyncTask).where(AsyncTask.user_id == uuid.UUID(str(current_user.id)))

    if status_filter:
        query = query.where(AsyncTask.status == status_filter)

    query = query.order_by(AsyncTask.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    tasks = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            AsyncTaskResponse(
                id=str(t.id),
                userId=str(t.user_id),
                taskType=t.task_type,
                status=t.status,
                priority=t.priority,
                progressPercent=t.progress_percent,
                statusMessage=t.status_message,
                inputData=t.input_data,
                resultData=t.result_data,
                errorMessage=t.error_message,
                startedAt=t.started_at,
                completedAt=t.completed_at,
                createdAt=t.created_at,
            )
            for t in tasks
        ],
    }


@router.get("/{task_id}", response_model=AsyncTaskResponse)
async def get_task(
    *,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务详情"""
    result = await db.execute(
        select(AsyncTask).where(
            AsyncTask.id == uuid.UUID(task_id),
            AsyncTask.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return AsyncTaskResponse(
        id=str(task.id),
        userId=str(task.user_id),
        taskType=task.task_type,
        status=task.status,
        priority=task.priority,
        progressPercent=task.progress_percent,
        statusMessage=task.status_message,
        inputData=task.input_data,
        resultData=task.result_data,
        errorMessage=task.error_message,
        startedAt=task.started_at,
        completedAt=task.completed_at,
        createdAt=task.created_at,
    )


@router.get("/{task_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    *,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务状态"""
    result = await db.execute(
        select(AsyncTask).where(
            AsyncTask.id == uuid.UUID(task_id),
            AsyncTask.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskStatusResponse(
        taskId=str(task.id),
        taskType=task.task_type,
        status=task.status,
        progressPercent=task.progress_percent,
        statusMessage=task.status_message,
        estimatedTimeRemaining=None,  # TODO: 计算剩余时间
    )


@router.get("/{task_id}/result", response_model=TaskResultResponse)
async def get_task_result(
    *,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取任务结果"""
    result = await db.execute(
        select(AsyncTask).where(
            AsyncTask.id == uuid.UUID(task_id),
            AsyncTask.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Task not completed yet. Status: {task.status}",
        )

    return TaskResultResponse(
        taskId=str(task.id),
        taskType=task.task_type,
        status=task.status,
        result=task.result_data,
        error=task.error_message,
        completedAt=task.completed_at,
    )


@router.post("/{task_id}/cancel")
async def cancel_task(
    *,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取消任务"""
    result = await db.execute(
        select(AsyncTask).where(
            AsyncTask.id == uuid.UUID(task_id),
            AsyncTask.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status in [TaskStatus.COMPLETED, TaskStatus.CANCELLED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel task with status: {task.status}",
        )

    task.status = TaskStatus.CANCELLED
    task.status_message = "Cancelled by user"
    await db.commit()

    return {
        "success": True,
        "message": "Task cancelled successfully",
    }
