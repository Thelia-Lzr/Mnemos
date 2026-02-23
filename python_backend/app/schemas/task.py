"""
异步任务相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    """任务状态"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    """任务优先级"""
    LOW = 0
    NORMAL = 5
    HIGH = 10
    URGENT = 20


class AsyncTaskResponse(BaseModel):
    """异步任务响应"""
    id: str
    userId: str
    taskType: str
    status: TaskStatus
    priority: int
    progressPercent: int
    statusMessage: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime

    class Config:
        from_attributes = True


class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    taskId: str
    taskType: str
    status: TaskStatus
    progressPercent: int
    statusMessage: Optional[str] = None
    estimatedTimeRemaining: Optional[int] = None  # 秒


class TaskResultResponse(BaseModel):
    """任务结果响应"""
    taskId: str
    taskType: str
    status: TaskStatus
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    completedAt: Optional[datetime] = None


class TaskCreateRequest(BaseModel):
    """任务创建请求"""
    taskType: str
    inputData: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL


class TaskCancelRequest(BaseModel):
    """任务取消请求"""
    taskId: str
    reason: Optional[str] = None


class TaskRetryRequest(BaseModel):
    """任务重试请求"""
    taskId: str


class BatchTaskStatusRequest(BaseModel):
    """批量任务状态请求"""
    taskIds: List[str]


class BatchTaskStatusResponse(BaseModel):
    """批量任务状态响应"""
    tasks: List[TaskStatusResponse]


class TaskStatsResponse(BaseModel):
    """任务统计响应"""
    totalTasks: int
    pendingTasks: int
    processingTasks: int
    completedTasks: int
    failedTasks: int
    cancelledTasks: int
    averageCompletionTime: float  # 秒
