"""
认证服务
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import uuid

from app.models.user import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)


class AuthService:
    """认证服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """
        验证用户凭证

        Args:
            email: 用户邮箱
            password: 用户密码

        Returns:
            验证成功的用户，失败返回 None
        """
        result = await self.db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user

    async def register_user(
        self,
        username: str,
        email: str,
        password: str,
    ) -> User:
        """
        注册新用户

        Args:
            username: 用户名
            email: 邮箱
            password: 密码

        Returns:
            新创建的用户
        """
        from app.models.user import UserPreferences, UserCredit

        user = User(
            username=username,
            email=email,
            password_hash=get_password_hash(password),
        )
        self.db.add(user)
        await self.db.flush()

        # 创建默认偏好
        preferences = UserPreferences(user_id=user.id)
        self.db.add(preferences)

        # 创建默认积分（新用户赠送 100）
        credits = UserCredit(user_id=user.id, balance=100, total_earned=100)
        self.db.add(credits)

        await self.db.commit()
        await self.db.refresh(user)

        return user

    def generate_tokens(self, user: User) -> dict:
        """
        生成访问令牌和刷新令牌

        Args:
            user: 用户对象

        Returns:
            包含令牌的字典
        """
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "username": user.username,
                "role": user.role,
            }
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": 1800,  # 30 分钟
        }

    async def update_last_login(self, user: User) -> None:
        """更新最后登录时间"""
        user.last_login_at = datetime.utcnow()
        await self.db.commit()

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        修改密码

        Args:
            user: 用户对象
            current_password: 当前密码
            new_password: 新密码

        Returns:
            是否成功
        """
        if not verify_password(current_password, user.password_hash):
            return False

        user.password_hash = get_password_hash(new_password)
        await self.db.commit()
        return True

    async def get_user_by_token(self, token: str) -> Optional[User]:
        """从令牌获取用户"""
        payload = decode_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        try:
            result = await self.db.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            )
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None


# 工厂函数
def get_auth_service(db: AsyncSession) -> AuthService:
    """获取认证服务实例"""
    return AuthService(db)
