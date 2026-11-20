"""工作台的数据库会话和本地资料依赖。"""
from collections.abc import AsyncIterator

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_database_session
from app.models.user import User
from app.models.workspace import WorkspaceSettings


async def get_db() -> AsyncIterator[AsyncSession]:
    async for session in get_database_session():
        yield session


async def get_workspace_user(db: AsyncSession = Depends(get_db)) -> User:
    """解析本机工作台资料，学习记录仍按资料 ID 关联。"""
    if settings.WORKSPACE_USER_ID:
        profile = await db.get(User, settings.WORKSPACE_USER_ID)
    else:
        profile = await db.scalar(
            select(User).join(WorkspaceSettings, WorkspaceSettings.user_id == User.id)
            .where(WorkspaceSettings.id == 1)
        )
    if profile is None:
        raise HTTPException(status_code=503, detail="本地资料不可用，请检查数据库迁移或 WORKSPACE_USER_ID。")
    return profile
