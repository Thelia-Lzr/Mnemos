"""
依赖注入和工具函数
"""
from typing import Optional, Generator
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_database_session
from app.core.security import decode_token, get_user_id_from_token
from app.models.user import User
import uuid


# HTTP Bearer 认证
security = HTTPBearer(auto_error=False)


async def get_db() -> Generator[AsyncSession, None, None]:
    """获取数据库会话"""
    async for session in get_database_session():
        yield session


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    获取当前登录用户

    Raises:
        HTTPException: 401 未授权
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_id = get_user_id_from_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 获取用户
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """获取当前用户（可选，允许未登录）"""
    try:
        if credentials is None:
            return None

        token = credentials.credentials
        user_id = get_user_id_from_token(token)

        if user_id is None:
            return None

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
        return result.scalar_one_or_none()
    except Exception:
        return None


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    要求管理员权限

    Raises:
        HTTPException: 403 禁止访问
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def verify_user_access(
    user_id: str,
    current_user: User = Depends(get_current_user),
) -> User:
    """
    验证用户是否有权限访问指定用户资源

    Raises:
        HTTPException: 403 禁止访问
    """
    # 管理员可以访问任何资源
    if current_user.role == "admin":
        return current_user

    # 普通用户只能访问自己的资源
    if str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return current_user
