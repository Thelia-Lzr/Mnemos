"""
PK 对战相关模型定义
"""
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Integer,
    CheckConstraint,
    text,
    Index,
    DECIMAL,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.models.base import Base, TimestampMixin


class PKBattleStatus(str):
    """PK 对战状态"""
    WAITING = "waiting"
    GENERATING_PRACTICE = "generating_practice"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class PKBattle(Base, TimestampMixin):
    """PK 对战表"""

    __tablename__ = "pk_battles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 玩家
    player1_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    player2_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # 对战信息
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_battle_language"),
        nullable=False,
    )
    practice_group_id = Column(UUID(as_uuid=True), ForeignKey("practice_groups.id"))

    # 时间
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)

    # 分数
    player1_score = Column(Integer, default=0)
    player2_score = Column(Integer, default=0)
    player1_time = Column(Integer)  # 秒
    player2_time = Column(Integer)  # 秒

    # 胜者
    winner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # MMR 变化
    player1_mmr_change = Column(Integer, default=0)
    player2_mmr_change = Column(Integer, default=0)

    # 状态
    status = Column(
        String(20),
        CheckConstraint(
            "status IN ('waiting', 'generating_practice', 'in_progress', 'completed', 'cancelled', 'timeout')",
            name="check_battle_status",
        ),
        default=PKBattleStatus.WAITING,
    )

    # 关系
    player1 = relationship("User", foreign_keys=[player1_id], back_populates="pk_battles_player1")
    player2 = relationship("User", foreign_keys=[player2_id], back_populates="pk_battles_player2")
    answers = relationship("BattleAnswer", back_populates="battle", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_pk_battles_players", "player1_id", "player2_id"),
        Index("idx_pk_battles_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<PKBattle(id={self.id}, player1={self.player1_id}, player2={self.player2_id})>"


class BattleAnswer(Base, TimestampMixin):
    """PK 对战答案"""

    __tablename__ = "battle_answers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    battle_id = Column(UUID(as_uuid=True), ForeignKey("pk_battles.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # 答案数据
    question_index = Column(Integer, nullable=False)
    answer = Column(String, nullable=False)
    is_correct = Column(Boolean, default=False)
    time_taken = Column(Integer)  # 秒

    # 关系
    battle = relationship("PKBattle", back_populates="answers")

    __table_args__ = (
        Index("idx_battle_answers_battle_user", "battle_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<BattleAnswer(id={self.id}, battle_id={self.battle_id})>"


class UserMMR(Base, TimestampMixin):
    """用户 MMR 评分"""

    __tablename__ = "user_mmr"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_mmr_language"),
        nullable=False,
    )

    # MMR 分数
    current_mmr = Column(Integer, default=1000)
    peak_mmr = Column(Integer, default=1000)

    # 统计
    total_battles = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    win_rate = Column(DECIMAL(5, 2), default=0.0)

    # 细分评级
    vocabulary_rating = Column(Integer, default=1000)
    grammar_rating = Column(Integer, default=1000)
    speed_rating = Column(Integer, default=1000)
    accuracy_rating = Column(Integer, default=1000)

    # 关系
    user = relationship("User", back_populates="mmr")

    __table_args__ = (
        UniqueConstraint("user_id", "language", name="uq_mmr_user_language"),
    )

    def __repr__(self) -> str:
        return f"<UserMMR(user_id={self.user_id}, language={self.language}, mmr={self.current_mmr})>"


class MMRHistory(Base, TimestampMixin):
    """MMR 历史记录"""

    __tablename__ = "mmr_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_mmr_history_language"),
        nullable=False,
    )

    # MMR 变化
    mmr_before = Column(Integer, nullable=False)
    mmr_after = Column(Integer, nullable=False)
    mmr_change = Column(Integer, nullable=False)

    # 对战信息
    battle_id = Column(UUID(as_uuid=True), ForeignKey("pk_battles.id"), nullable=True)
    is_win = Column(Boolean, default=False)

    # 关系
    battle = relationship("PKBattle")

    __table_args__ = (
        Index("idx_mmr_history_user_language", "user_id", "language"),
        Index("idx_mmr_history_created", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<MMRHistory(id={self.id}, user_id={self.user_id}, mmr_change={self.mmr_change})>"


class MatchRequest(Base, TimestampMixin):
    """匹配请求"""

    __tablename__ = "match_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(
        String(10),
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="check_match_language"),
        nullable=False,
    )

    # 匹配信息
    mmr = Column(Integer, default=1000)
    status = Column(String(20), default="waiting")

    # 关系
    user = relationship("User")

    __table_args__ = (
        Index("idx_match_requests_user_language", "user_id", "language"),
        Index("idx_match_requests_status_mmr", "status", "mmr"),
    )

    def __repr__(self) -> str:
        return f"<MatchRequest(user_id={self.user_id}, language={self.language})>"
