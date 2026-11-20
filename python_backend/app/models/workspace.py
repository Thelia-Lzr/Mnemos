"""单用户工作台的持久化设置。"""
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"
    __table_args__ = (CheckConstraint("id = 1", name="ck_workspace_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    ai_revision: Mapped[int] = mapped_column(Integer, server_default="0")
    ai_settings: Mapped[dict] = mapped_column(JSONB, server_default="{}")
