"""
通用 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, Generic, TypeVar, List
from datetime import datetime

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """通用 API 响应模式"""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应模式"""
    data: List[T]
    pagination: dict = Field(
        default_factory=lambda: {"limit": 20, "offset": 0, "total": 0}
    )


class HealthCheckResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: datetime
    uptime: float
    metrics: Optional[dict] = None
    database: Optional[dict] = None
    redis: Optional[dict] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: str
    detail: Optional[dict] = None
    code: Optional[str] = None
