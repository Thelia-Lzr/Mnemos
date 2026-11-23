"""add user AI credentials

Revision ID: b4c82a6e713d
Revises: 24ad4412ca2d
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "b4c82a6e713d"
down_revision = "24ad4412ca2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_ai_credentials",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("encrypted_api_key", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("user_ai_credentials")
