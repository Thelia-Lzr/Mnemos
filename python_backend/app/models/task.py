"""
异步任务模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    CheckConstraint,
    text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class TaskStatus(str):
    """任务状态"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(int):
    """任务优先级"""
    LOW = 0
    NORMAL = 5
    HIGH = 10
    URGENT = 20


class AsyncTask(Base, TimestampMixin):
    """异步任务表"""

    __tablename__ = "async_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 任务信息
    task_type = Column(String(50), nullable=False)
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')",
            name="check_task_status",
        ),
        default=TaskStatus.PENDING,
    )
    priority = Column(Integer, default=TaskPriority.NORMAL)

    # 任务数据
    input_data = Column(JSONB)
    result_data = Column(JSONB)
    error_message = Column(Text)

    # 进度
    progress_percent = Column(Integer, default=0)
    status_message = Column(String(255))

    # 时间
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Celery 任务 ID
    celery_task_id = Column(String(255), unique=True)

    # 关系
    user = relationship("User", back_populates="async_tasks")

    __table_args__ = (
        Index("idx_async_tasks_user_status", "user_id", "status"),
        Index("idx_async_tasks_status_priority", "status", "priority"),
        Index("idx_async_tasks_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AsyncTask(id={self.id}, type={self.task_type}, status={self.status})>"
