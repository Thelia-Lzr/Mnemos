"""Persist local assessment reports and unfinished self-tests.

Revision ID: 113c23e854a5
Revises: 7d93afb43210
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "113c23e854a5"
down_revision = "7d93afb43210"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assessment_records",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(10), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("evidence_key", sa.String(64)),
        sa.Column("questions", postgresql.JSONB()),
        sa.Column("report", postgresql.JSONB()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("language IN ('en', 'ja', 'fr')", name="ck_assessments_language"),
        sa.CheckConstraint(
            "(source = 'practice' AND questions IS NULL AND evidence_key IS NOT NULL AND completed_at IS NOT NULL)"
            " OR (source = 'self_test' AND questions IS NOT NULL AND evidence_key IS NULL)",
            name="ck_assessments_source",
        ),
        sa.CheckConstraint("(completed_at IS NULL) = (report IS NULL)", name="ck_assessments_completion"),
        sa.UniqueConstraint("user_id", "language", "evidence_key", name="uq_assessments_evidence"),
    )
    op.create_index("ix_assessment_records_created_at", "assessment_records", ["created_at"])
    op.create_index("ix_assessments_history", "assessment_records", ["user_id", "language", "completed_at", "id"])
    op.create_index(
        "uq_assessments_active_test", "assessment_records", ["user_id", "language"],
        unique=True, postgresql_where=sa.text("completed_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_table("assessment_records")
