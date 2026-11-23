"""
用户模型定义
"""
from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Boolean,
    Integer,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    text,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
import enum

from app.models.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    """用户角色"""
    USER = "user"
    ADMIN = "admin"


class LanguageLevel(str, enum.Enum):
    """语言等级"""
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class LearningIntensity(str, enum.Enum):
    """学习强度"""
    CASUAL = "casual"
    REGULAR = "regular"
    INTENSIVE = "intensive"
    IMMERSIVE = "immersive"


class User(Base, TimestampMixin):
    """用户表"""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        String(20),
        CheckConstraint("role IN ('user', 'admin')", name="check_role"),
        default=UserRole.USER,
    )
    created_at = Column(DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"))
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )

    # 关系
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    capabilities = relationship("UserCapability", back_populates="user", cascade="all, delete-orphan")
    learning_languages = relationship("UserLearningLanguage", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    practice_groups = relationship("PracticeGroup", back_populates="user", cascade="all, delete-orphan")
    practice_results = relationship("PracticeResult", back_populates="user", cascade="all, delete-orphan")
    vocabulary_words = relationship("VocabularyWord", back_populates="user", cascade="all, delete-orphan")
    pk_battles_player1 = relationship("PKBattle", foreign_keys="PKBattle.player1_id", back_populates="player1")
    pk_battles_player2 = relationship("PKBattle", foreign_keys="PKBattle.player2_id", back_populates="player2")
    mmr = relationship("UserMMR", back_populates="user", cascade="all, delete-orphan")
    credits = relationship("UserCredit", back_populates="user", uselist=False, cascade="all, delete-orphan")
    payment_orders = relationship("PaymentOrder", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")
    async_tasks = relationship("AsyncTask", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, email={self.email})>"


class UserAiCredential(Base):
    """个人 AI API 密钥（加密保存）"""

    __tablename__ = "user_ai_credentials"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    encrypted_api_key = Column(Text, nullable=False)


class UserPreferences(Base, TimestampMixin):
    """用户偏好设置"""

    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(
        String(20),
        CheckConstraint("theme IN ('light', 'dark')", name="check_theme"),
        default="light",
    )
    notifications_email = Column(Boolean, default=True)
    notifications_push = Column(Boolean, default=True)
    practice_reminders = Column(Boolean, default=True)
    daily_quote_enabled = Column(Boolean, default=True)
    review_reminders = Column(Boolean, default=True)
    milestone_updates = Column(Boolean, default=True)
    pk_invitations = Column(Boolean, default=True)

    # 关系
    user = relationship("User", back_populates="preferences")

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_preferences_user"),
    )

    def __repr__(self) -> str:
        return f"<UserPreferences(user_id={self.user_id})>"


class UserCapability(Base, TimestampMixin):
    """用户语言能力"""

    __tablename__ = "user_capabilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_language"),
        nullable=False,
    )
    current_level = Column(
        String(10),
        CheckConstraint(
            "current_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')",
            name="check_current_level",
        ),
    )
    learning_goal = Column(
        String(10),
        CheckConstraint(
            "learning_goal IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')",
            name="check_learning_goal",
        ),
    )
    is_active_learning = Column(Boolean, default=True)

    # 能力细分
    overall_level = Column(String(10), nullable=False)
    confidence_score = Column(Integer, CheckConstraint("confidence_score >= 0 AND confidence_score <= 100"))
    listening_level = Column(Integer, CheckConstraint("listening_level >= 0 AND listening_level <= 100"))
    speaking_level = Column(Integer, CheckConstraint("speaking_level >= 0 AND speaking_level <= 100"))
    reading_level = Column(Integer, CheckConstraint("reading_level >= 0 AND reading_level <= 100"))
    writing_level = Column(Integer, CheckConstraint("writing_level >= 0 AND writing_level <= 100"))

    # 词汇统计
    estimated_vocabulary_size = Column(Integer, default=0)
    mastered_words_count = Column(Integer, default=0)
    learning_words_count = Column(Integer, default=0)

    # 评估时间
    last_assessed_at = Column(DateTime(timezone=True), nullable=True)
    next_assessment_due = Column(DateTime(timezone=True), nullable=True)

    # 关系
    user = relationship("User", back_populates="capabilities")

    __table_args__ = (
        UniqueConstraint("user_id", "language", name="uq_capability_user_language"),
    )

    def __repr__(self) -> str:
        return f"<UserCapability(user_id={self.user_id}, language={self.language})>"


class UserLearningLanguage(Base, TimestampMixin):
    """用户学习语言配置"""

    __tablename__ = "user_learning_languages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_language_config"),
        nullable=False,
    )
    current_level = Column(
        String(10),
        CheckConstraint(
            "current_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')",
            name="check_current_level_config",
        ),
    )
    target_level = Column(
        String(10),
        CheckConstraint(
            "target_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')",
            name="check_target_level",
        ),
    )
    is_primary = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # 学习偏好
    learning_intensity = Column(
        String(20),
        CheckConstraint(
            "learning_intensity IN ('casual', 'regular', 'intensive', 'immersive')",
            name="check_learning_intensity",
        ),
    )
    preferred_practice_types = Column(JSONB, default=list)
    daily_goal_minutes = Column(
        Integer,
        CheckConstraint("daily_goal_minutes >= 5 AND daily_goal_minutes <= 180"),
    )
    weekly_goal_sessions = Column(
        Integer,
        CheckConstraint("weekly_goal_sessions >= 1 AND weekly_goal_sessions <= 21"),
    )
    difficulty_preference = Column(
        String(20),
        CheckConstraint(
            "difficulty_preference IN ('easy', 'adaptive', 'challenging')",
            name="check_difficulty_preference",
        ),
        default="adaptive",
    )

    # 学习风格
    visual_learning_enabled = Column(Boolean, default=True)
    auditory_learning_enabled = Column(Boolean, default=True)
    kinesthetic_learning_enabled = Column(Boolean, default=False)

    # 通知设置
    practice_reminders = Column(Boolean, default=True)
    milestone_notifications = Column(Boolean, default=True)
    weekly_progress_reports = Column(Boolean, default=True)

    # 元数据
    last_modified_by = Column(String(50), default="user")

    # 关系
    user = relationship("User", back_populates="learning_languages")

    __table_args__ = (
        UniqueConstraint("user_id", "language", name="uq_learning_language_user"),
    )

    def __repr__(self) -> str:
        return f"<UserLearningLanguage(user_id={self.user_id}, language={self.language})>"
