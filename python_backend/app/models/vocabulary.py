"""
词汇模型定义
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
    DECIMAL,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class MasteryLevel(str):
    """掌握程度"""
    NEW = "new"
    LEARNING = "learning"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    MASTERED = "mastered"


class VocabularyWord(Base, TimestampMixin):
    """词汇表"""

    __tablename__ = "vocabulary_words"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    word = Column(String(255), nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_vocab_language"),
        nullable=False,
    )

    # 词汇信息
    definition = Column(Text, nullable=True)
    pronunciation = Column(String(255), nullable=True)
    part_of_speech = Column(String(50), nullable=True)

    # 难度和频率
    difficulty = Column(Integer, CheckConstraint("difficulty >= 1 AND difficulty <= 10"))
    frequency = Column(Integer, default=1)

    # 掌握程度
    mastery_level = Column(
        String(20),
        CheckConstraint(
            "mastery_level IN ('new', 'learning', 'short_term', 'long_term', 'mastered')",
            name="check_mastery_level",
        ),
        default=MasteryLevel.NEW,
    )
    mastery_score = Column(Integer, CheckConstraint("mastery_score >= 0 AND mastery_score <= 100"))

    # 复习时间
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    next_review_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # 遗忘曲线相关
    added_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    first_encountered_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    initial_strength = Column(DECIMAL(5, 2), default=1.0)
    decay_rate = Column(DECIMAL(5, 2), default=0.1)
    review_count = Column(Integer, default=0)
    last_review_score = Column(Integer, default=0)

    # 关系
    user = relationship("User", back_populates="vocabulary_words")

    __table_args__ = (
        UniqueConstraint("user_id", "word", "language", name="uq_vocabulary_user_word_language"),
        Index("idx_vocabulary_user_language", "user_id", "language"),
        Index(
            "idx_vocabulary_next_review",
            "next_review_at",
            postgresql_where=text("next_review_at IS NOT NULL"),
        ),
    )

    def __repr__(self) -> str:
        return f"<VocabularyWord(id={self.id}, word={self.word}, language={self.language})>"
