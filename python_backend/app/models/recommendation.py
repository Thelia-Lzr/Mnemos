"""
每日学习推荐模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Text,
    Integer,
    Boolean,
    CheckConstraint,
    text,
    Index,
    UniqueConstraint,
    DATE,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class DailyLearningRecommendation(Base, TimestampMixin):
    """每日学习推荐表"""

    __tablename__ = "daily_learning_recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_recommendation_language"),
        nullable=False,
    )

    # 推荐日期
    date = Column(DATE, nullable=False)

    # 推荐内容
    recommendation_data = Column(JSONB, nullable=False)

    # 状态
    is_viewed = Column(Boolean, default=False)
    viewed_at = Column(DateTime(timezone=True), nullable=True)

    # 反馈
    feedback_rating = Column(Integer, CheckConstraint("feedback_rating >= 1 AND feedback_rating <= 5"))
    feedback_is_helpful = Column(Boolean)
    feedback_comments = Column(Text)

    # 生成的练习选项
    quick_practice_options = Column(JSONB, default=list)

    # 关系
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "language", "date", name="uq_recommendation_user_language_date"),
        Index("idx_daily_recommendations_user_date", "user_id", "date"),
    )

    def __repr__(self) -> str:
        return f"<DailyLearningRecommendation(user_id={self.user_id}, language={self.language}, date={self.date})>"


DailyRecommendation = DailyLearningRecommendation
