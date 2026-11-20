"""Add the local workspace profile and AI settings.

Revision ID: 7d93afb43210
Revises: 24ad4412ca2d
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "7d93afb43210"
down_revision = "24ad4412ca2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_settings",
        sa.Column("id", sa.Integer(), autoincrement=False, primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ai_revision", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ai_settings", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.CheckConstraint("id = 1", name="ck_workspace_singleton"),
    )
    op.execute("""
        WITH reserved(id) AS (
            VALUES ('eb66c1a9-42b0-4dda-83fb-b549c6c9f952'::uuid)
        ), chosen AS (
            SELECT id FROM users WHERE id = (SELECT id FROM reserved)
            UNION ALL
            SELECT id FROM users
            WHERE (SELECT count(*) FROM users) = 1 AND id <> (SELECT id FROM reserved)
        ), created AS (
            INSERT INTO users (id, username, email, password_hash, role)
            SELECT id,
                CASE WHEN EXISTS (SELECT 1 FROM users WHERE username = '本地工作台')
                    THEN '工作台-' || id ELSE '本地工作台' END,
                id || '@mnemos.example.com', '!', 'user'
            FROM reserved
            WHERE NOT EXISTS (SELECT 1 FROM chosen)
            RETURNING id
        )
        INSERT INTO workspace_settings (id, user_id)
        SELECT 1, id FROM created
        UNION ALL
        SELECT 1, id FROM chosen
    """)


def downgrade() -> None:
    op.drop_table("workspace_settings")
