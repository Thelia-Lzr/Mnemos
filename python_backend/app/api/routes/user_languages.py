"""
用户语言路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Literal
from pydantic import BaseModel
import uuid

from app.api.deps import get_db, get_workspace_user
from app.models.user import User, UserLearningLanguage
from app.models.user import UserCapability

router = APIRouter(prefix="/api/user-languages", tags=["用户语言"])


LanguageLevel = Literal["A1", "A2", "B1", "B2", "C1", "C2"]


class LanguageCreate(BaseModel):
    language: Literal["en", "ja", "fr"]
    proficiencyLevel: LanguageLevel = "A1"
    learningGoal: LanguageLevel | None = "B1"
    isPrimary: bool = False


class LanguageUpdate(BaseModel):
    proficiencyLevel: LanguageLevel | None = None
    learningGoal: LanguageLevel | None = None
    isPrimary: bool | None = None


@router.get("")
async def get_user_languages(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取用户语言列表"""
    result = await db.execute(
        select(UserLearningLanguage).where(UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)))
    )
    languages = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            {
                "id": str(lang.id),
                "userId": str(lang.user_id),
                "language": lang.language,
                "proficiencyLevel": lang.current_level,
                "learningGoal": lang.target_level,
                "isPrimary": lang.is_primary,
                "isActive": lang.is_active,
                "startedAt": lang.created_at.isoformat() if lang.created_at else None,
                "createdAt": lang.created_at.isoformat() if lang.created_at else None,
                "updatedAt": lang.updated_at.isoformat() if lang.updated_at else None,
            }
            for lang in languages
        ],
    }


@router.post("", response_model=dict)
async def add_user_language(
    *,
    request: LanguageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """添加用户语言"""
    language = request.language
    proficiency_level = request.proficiencyLevel
    learning_goal = request.learningGoal
    is_primary = request.isPrimary
    await db.execute(select(User.id).where(User.id == current_user.id).with_for_update())

    # 检查是否已存在
    existing = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)),
            UserLearningLanguage.language == language,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Language already added")

    if is_primary:
        await db.execute(
            update(UserLearningLanguage).where(UserLearningLanguage.user_id == current_user.id).values(is_primary=False)
        )

    user_language = UserLearningLanguage(
        user_id=uuid.UUID(str(current_user.id)),
        language=language,
        current_level=proficiency_level,
        target_level=learning_goal,
        is_primary=is_primary,
        is_active=True,
    )
    db.add(user_language)
    # Reuse capability records when a previously removed language is added again.
    existing_capability = await db.scalar(select(UserCapability).where(
        UserCapability.user_id == current_user.id, UserCapability.language == language,
    ))
    if existing_capability:
        existing_capability.current_level = proficiency_level
        existing_capability.learning_goal = learning_goal

    # 同时创建能力记录
    if not existing_capability:
        capability = UserCapability(
            user_id=uuid.UUID(str(current_user.id)),
            language=language,
            current_level=proficiency_level,
            learning_goal=learning_goal,
            is_active_learning=True,
            overall_level=proficiency_level,
        )
        db.add(capability)
    await db.commit()
    await db.refresh(user_language)

    return {
        "success": True,
        "data": {
            "id": str(user_language.id),
            "userId": str(user_language.user_id),
            "language": user_language.language,
            "proficiencyLevel": user_language.current_level,
            "learningGoal": user_language.target_level,
            "isPrimary": user_language.is_primary,
        },
        "message": f"Language {language} added successfully",
    }


@router.put("/{language_id}", response_model=dict)
async def update_user_language(
    *,
    language_id: uuid.UUID,
    request: LanguageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """更新用户语言设置"""
    await db.execute(select(User.id).where(User.id == current_user.id).with_for_update())
    result = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.id == language_id,
            UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    user_language = result.scalar_one_or_none()

    if not user_language:
        raise HTTPException(status_code=404, detail="User language not found")

    if request.proficiencyLevel is not None:
        user_language.current_level = request.proficiencyLevel
    if "learningGoal" in request.model_fields_set:
        user_language.target_level = request.learningGoal
    if request.proficiencyLevel is not None or "learningGoal" in request.model_fields_set:
        capability = await db.scalar(select(UserCapability).where(
            UserCapability.user_id == current_user.id,
            UserCapability.language == user_language.language,
        ))
        if capability:
            capability.current_level = user_language.current_level
            capability.learning_goal = user_language.target_level
    if request.isPrimary is not None:
        # 如果设为 primary，先取消其他的 primary
        if request.isPrimary:
            await db.execute(
                update(UserLearningLanguage)
                .where(UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)))
                .values(is_primary=False)
            )
        user_language.is_primary = request.isPrimary

    await db.commit()
    await db.refresh(user_language)

    return {
        "success": True,
        "data": {
            "id": str(user_language.id),
            "userId": str(user_language.user_id),
            "language": user_language.language,
            "proficiencyLevel": user_language.current_level,
            "learningGoal": user_language.target_level,
            "isPrimary": user_language.is_primary,
        },
    }


@router.delete("/{language_id}")
async def delete_user_language(
    *,
    language_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """删除用户语言"""
    await db.execute(select(User.id).where(User.id == current_user.id).with_for_update())
    result = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.id == language_id,
            UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    user_language = result.scalar_one_or_none()

    if not user_language:
        raise HTTPException(status_code=404, detail="User language not found")

    await db.delete(user_language)
    await db.commit()

    return {
        "success": True,
        "message": f"Language {user_language.language} removed successfully",
    }
