"""
评估相关模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Integer,
    Boolean,
    CheckConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.models.base import Base, TimestampMixin


# class UserCapability(Base, TimestampMixin):
#     """用户能力评估表
#
#     注意：这个模型已经在 user.py 中定义，这里保留是为了兼容性
#     请使用 app.models.user.UserCapability
#     """
#
#     __tablename__ = "user_capabilities"
#
#     id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
#     user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
#     language = Column(
#         String(10),
#         CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_language"),
#         nullable=False,
#     )
#     current_level = Column(String(10))
#     learning_goal = Column(String(10))
#     is_active_learning = Column(Boolean, default=True)
#     overall_level = Column(String(10), nullable=False)
#     confidence_score = Column(Integer)
#     listening_level = Column(Integer)
#     speaking_level = Column(Integer)
#     reading_level = Column(Integer)
#     writing_level = Column(Integer)
#     estimated_vocabulary_size = Column(Integer, default=0)
#     mastered_words_count = Column(Integer, default=0)
#     learning_words_count = Column(Integer, default=0)
#     last_assessed_at = Column(DateTime(timezone=True), nullable=True)
#     next_assessment_due = Column(DateTime(timezone=True), nullable=True)
#
#     def __repr__(self) -> str:
#         return f"<UserCapability(user_id={self.user_id}, language={self.language})>"
