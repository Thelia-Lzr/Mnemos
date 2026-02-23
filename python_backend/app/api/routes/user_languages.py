"""
用户语言路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional, List
import uuid

from app.api.deps import get_db, get_current_user
from app.models.user import User, UserLearningLanguage
from app.models.user import UserCapability

router = APIRouter(prefix="/api/user-languages", tags=["用户语言"])


@router.get("")
async def get_user_languages(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
                "startedAt": lang.started_at.isoformat() if lang.started_at else None,
                "createdAt": lang.created_at.isoformat() if lang.created_at else None,
            }
            for lang in languages
        ],
    }


@router.post("", response_model=dict)
async def add_user_language(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """添加用户语言"""
    language = request.get("language")
    proficiency_level = request.get("proficiencyLevel", "A1")
    learning_goal = request.get("learningGoal", "B1")
    is_primary = request.get("isPrimary", False)

    if not language or language not in ["en", "ja", "fr"]:
        raise HTTPException(status_code=400, detail="Invalid language")

    # 检查是否已存在
    existing = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)),
            UserLearningLanguage.language == language,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Language already added")

    user_language = UserLearningLanguage(
        user_id=uuid.UUID(str(current_user.id)),
        language=language,
        current_level=proficiency_level,
        target_level=learning_goal,
        is_primary=is_primary,
        is_active=True,
    )
    db.add(user_language)
    await db.commit()
    await db.refresh(user_language)

    # 同时创建能力记录
    capability = UserCapability(
        user_id=uuid.UUID(str(current_user.id)),
        language=language,
        current_level=proficiency_level,
        learning_goal=learning_goal,
        is_active_learning=True,
        overall_level=proficiency_level,
        confidence_score=50,
        listening_level=50,
        speaking_level=50,
        reading_level=50,
        writing_level=50,
        estimated_vocabulary_size=1000,
        mastered_words_count=0,
        learning_words_count=0,
    )
    db.add(capability)
    await db.commit()

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
    language_id: str,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新用户语言设置"""
    result = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.id == uuid.UUID(language_id),
            UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    user_language = result.scalar_one_or_none()

    if not user_language:
        raise HTTPException(status_code=404, detail="User language not found")

    if "proficiencyLevel" in request:
        user_language.current_level = request["proficiencyLevel"]
    if "learningGoal" in request:
        user_language.target_level = request["learningGoal"]
    if "isPrimary" in request:
        # 如果设为 primary，先取消其他的 primary
        if request["isPrimary"]:
            await db.execute(
                update(UserLearningLanguage)
                .where(UserLearningLanguage.user_id == uuid.UUID(str(current_user.id)))
                .values(is_primary=False)
            )
        user_language.is_primary = request["isPrimary"]

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
    language_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除用户语言"""
    result = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.id == uuid.UUID(language_id),
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
