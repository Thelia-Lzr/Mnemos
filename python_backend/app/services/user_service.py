"""
用户服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Dict, Any
import uuid

from app.models.user import (
    User,
    UserPreferences,
    UserCapability,
    UserLearningLanguage,
)
from app.models.payment import UserCredit


class UserService:
    """用户服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """根据 ID 获取用户"""
        try:
            result = await self.db.execute(
                select(User).where(User.id == uuid.UUID(user_id))
            )
            return result.scalar_one_or_none()
        except (ValueError, TypeError):
            return None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """根据邮箱获取用户"""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_preferences(self, user_id: str) -> Optional[UserPreferences]:
        """获取用户偏好"""
        result = await self.db.execute(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_preferences(
        self,
        user_id: str,
        preferences_data: Dict[str, Any],
    ) -> Optional[UserPreferences]:
        """更新用户偏好"""
        result = await self.db.execute(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            preferences = UserPreferences(user_id=user_id)
            self.db.add(preferences)

        for key, value in preferences_data.items():
            if hasattr(preferences, key):
                setattr(preferences, key, value)

        await self.db.commit()
        await self.db.refresh(preferences)
        return preferences

    async def get_capability(
        self,
        user_id: str,
        language: str,
    ) -> Optional[UserCapability]:
        """获取用户语言能力"""
        result = await self.db.execute(
            select(UserCapability).where(
                UserCapability.user_id == user_id,
                UserCapability.language == language,
            )
        )
        return result.scalar_one_or_none()

    async def create_capability(
        self,
        user_id: str,
        language: str,
        current_level: str,
        learning_goal: str,
    ) -> UserCapability:
        """创建用户语言能力"""
        capability = UserCapability(
            user_id=user_id,
            language=language,
            current_level=current_level,
            learning_goal=learning_goal,
            overall_level=current_level,
        )
        self.db.add(capability)
        await self.db.commit()
        await self.db.refresh(capability)
        return capability

    async def update_capability(
        self,
        user_id: str,
        language: str,
        updates: Dict[str, Any],
    ) -> Optional[UserCapability]:
        """更新用户语言能力"""
        capability = await self.get_capability(user_id, language)
        if not capability:
            return None

        for key, value in updates.items():
            if hasattr(capability, key):
                setattr(capability, key, value)

        await self.db.commit()
        await self.db.refresh(capability)
        return capability

    async def get_learning_language(
        self,
        user_id: str,
        language: str,
    ) -> Optional[UserLearningLanguage]:
        """获取用户学习语言配置"""
        result = await self.db.execute(
            select(UserLearningLanguage).where(
                UserLearningLanguage.user_id == user_id,
                UserLearningLanguage.language == language,
            )
        )
        return result.scalar_one_or_none()

    async def add_learning_language(
        self,
        user_id: str,
        language: str,
        current_level: str,
        target_level: str,
        is_primary: bool = False,
    ) -> UserLearningLanguage:
        """添加学习语言"""
        learning_lang = UserLearningLanguage(
            user_id=user_id,
            language=language,
            current_level=current_level,
            target_level=target_level,
            is_primary=is_primary,
        )
        self.db.add(learning_lang)
        await self.db.commit()
        await self.db.refresh(learning_lang)
        return learning_lang

    async def get_user_credits(self, user_id: str) -> Optional[UserCredit]:
        """获取用户积分"""
        result = await self.db.execute(
            select(UserCredit).where(UserCredit.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_credits(
        self,
        user_id: str,
        amount: int,
        transaction_type: str,
        description: Optional[str] = None,
        reference_id: Optional[str] = None,
    ) -> Optional[UserCredit]:
        """更新用户积分"""
        from app.models.user import CreditTransaction

        credits = await self.get_user_credits(user_id)
        if not credits:
            credits = UserCredit(user_id=user_id, balance=0)
            self.db.add(credits)

        old_balance = credits.balance
        credits.balance += amount
        if amount > 0:
            credits.total_earned += amount
        else:
            credits.total_spent += abs(amount)

        # 创建交易记录
        transaction = CreditTransaction(
            user_id=user_id,
            amount=amount,
            balance_after=credits.balance,
            transaction_type=transaction_type,
            description=description,
            reference_id=reference_id,
        )
        self.db.add(transaction)

        await self.db.commit()
        await self.db.refresh(credits)
        return credits

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """获取用户统计信息"""
        # 这里可以添加更多统计逻辑
        return {
            "total_practice_groups": 0,
            "total_practice_time": 0,
            "total_words_learned": 0,
            "total_battles": 0,
        }


# 工厂函数
def get_user_service(db: AsyncSession) -> UserService:
    """获取用户服务实例"""
    return UserService(db)
