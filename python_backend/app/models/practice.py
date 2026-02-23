"""
练习相关模型定义
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
    DECIMAL,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class PracticeGroup(Base, TimestampMixin):
    """练习组"""

    __tablename__ = "practice_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_practice_language"),
        nullable=False,
    )
    difficulty = Column(
        String(20),
        CheckConstraint(
            "difficulty IN ('beginner', 'intermediate', 'advanced')",
            name="check_difficulty",
        ),
    )
    type = Column(String(50), nullable=False)
    estimated_duration = Column(Integer)  # 分钟
    focus_areas = Column(ARRAY(String), default=list)

    # 关系
    user = relationship("User", back_populates="practice_groups")
    questions = relationship("Question", back_populates="practice_group", cascade="all, delete-orphan")
    results = relationship("PracticeResult", back_populates="practice_group", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<PracticeGroup(id={self.id}, title={self.title})>"


class Question(Base, TimestampMixin):
    """练习题目"""

    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("practice_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    options = Column(ARRAY(String), nullable=False)
    correct_answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)

    # 学习数据
    vocabulary_words = Column(ARRAY(String), default=list)
    grammar_points = Column(ARRAY(String), default=list)

    # 难度和顺序
    difficulty = Column(Integer, CheckConstraint("difficulty >= 1 AND difficulty <= 10"))
    order_index = Column(Integer, nullable=False)

    # 关系
    practice_group = relationship("PracticeGroup", back_populates="questions")

    __table_args__ = (
        Index("idx_questions_practice_order", "practice_group_id", "order_index"),
    )

    def __repr__(self) -> str:
        return f"<Question(id={self.id}, type={self.type})>"


class PracticeResult(Base, TimestampMixin):
    """练习结果"""

    __tablename__ = "practice_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    practice_group_id = Column(
        UUID(as_uuid=True),
        ForeignKey("practice_groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # 答案数据
    answers = Column(JSONB, default=dict)
    wrong_answers_summary = Column(JSONB, default=list)

    # 统计数据
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    accuracy = Column(DECIMAL(5, 2), nullable=False)  # 正确率
    total_time = Column(Integer)  # 秒
    average_time_per_question = Column(DECIMAL(8, 2))

    # 分析结果
    weak_areas = Column(ARRAY(String), default=list)
    improved_areas = Column(ARRAY(String), default=list)
    recommended_focus = Column(ARRAY(String), default=list)

    # 能力更新
    capability_updates = Column(JSONB, default=list)
    vocabulary_updates = Column(JSONB, default=list)
    milestone_progress = Column(JSONB, default=list)

    # 完成时间
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # 关系
    user = relationship("User", back_populates="practice_results")
    practice_group = relationship("PracticeGroup", back_populates="results")
    ai_analysis = relationship(
        "PracticeAIAnalysis",
        back_populates="practice_result",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_practice_results_user_completed", "user_id", "completed_at"),
    )

    def __repr__(self) -> str:
        return f"<PracticeResult(id={self.id}, accuracy={self.accuracy})>"


class PracticeAIAnalysis(Base, TimestampMixin):
    """AI 练习分析"""

    __tablename__ = "practice_ai_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    practice_result_id = Column(
        UUID(as_uuid=True),
        ForeignKey("practice_results.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 分析内容
    analysis_content = Column(Text, nullable=False)
    learning_advice = Column(Text, nullable=False)

    # 分析结果
    strengths_identified = Column(ARRAY(String), default=list)
    weaknesses_identified = Column(ARRAY(String), default=list)
    improvement_suggestions = Column(ARRAY(String), default=list)

    # AI 元数据
    confidence_score = Column(Integer, CheckConstraint("confidence_score >= 0 AND confidence_score <= 100"))
    ai_model = Column(String(100))
    tokens_used = Column(Integer)

    # 能力变化
    capability_changes = Column(JSONB, default=dict)

    # 进度方向
    overall_progress_direction = Column(
        String(20),
        CheckConstraint(
            "overall_progress_direction IN ('improved', 'maintained', 'declined')",
            name="check_progress_direction",
        ),
    )
    progress_message = Column(Text)

    # 关系
    practice_result = relationship("PracticeResult", back_populates="ai_analysis")

    def __repr__(self) -> str:
        return f"<PracticeAIAnalysis(id={self.id})>"
