"""本地能力评估，包括练习报告和可继续作答的自测。"""

import uuid

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.base import Base, TimestampMixin


class AssessmentRecord(Base, TimestampMixin):
    __tablename__ = "assessment_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    language = Column(String(10), nullable=False)
    source = Column(String(20), nullable=False)
    evidence_key = Column(String(64))
    questions = Column(JSONB(none_as_null=True))
    report = Column(JSONB(none_as_null=True))
    completed_at = Column(DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint("language IN ('en', 'ja', 'fr')", name="ck_assessments_language"),
        CheckConstraint(
            "(source = 'practice' AND questions IS NULL AND evidence_key IS NOT NULL AND completed_at IS NOT NULL)"
            " OR (source = 'self_test' AND questions IS NOT NULL AND evidence_key IS NULL)",
            name="ck_assessments_source",
        ),
        CheckConstraint("(completed_at IS NULL) = (report IS NULL)", name="ck_assessments_completion"),
        UniqueConstraint("user_id", "language", "evidence_key", name="uq_assessments_evidence"),
        Index("ix_assessments_history", "user_id", "language", "completed_at", "id"),
        Index(
            "uq_assessments_active_test", "user_id", "language", unique=True,
            postgresql_where=text("completed_at IS NULL"),
        ),
    )
