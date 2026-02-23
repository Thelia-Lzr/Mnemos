"""
聊天消息模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    CheckConstraint,
    text,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class MessageType(str):
    """消息类型"""
    USER_TEXT = "user_text"
    USER_FILE = "user_file"
    AI_RESPONSE = "ai_response"
    SYSTEM = "system"


class ProcessingStatus(str):
    """处理状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ChatMessage(Base, TimestampMixin):
    """聊天消息表"""

    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    type = Column(
        String(20),
        CheckConstraint(
            "type IN ('user_text', 'user_file', 'ai_response', 'system')",
            name="check_message_type",
        ),
        nullable=False,
    )

    # AI 响应相关
    ai_response = Column(JSONB, nullable=True)
    processing_status = Column(
        String(20),
        default=ProcessingStatus.PENDING,
        CheckConstraint(
            "processing_status IN ('pending', 'processing', 'completed', 'failed')",
            name="check_processing_status",
        ),
    )
    detected_intent = Column(String(100), nullable=True)
    function_calls = Column(JSONB, default=list)
    function_results = Column(JSONB, default=list)

    # 文件上传相关
    attachments = Column(JSONB, default=list)

    # 学习数据提取
    extracted_vocabulary = Column(ARRAY(String), default=list)
    identified_grammar = Column(ARRAY(String), default=list)

    # 关系
    user = relationship("User", back_populates="chat_messages")

    __table_args__ = (
        Index("idx_chat_messages_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, user_id={self.user_id}, type={self.type})>"
