"""
用户路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import uuid

from app.api.deps import get_db, get_workspace_user
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserProfileResponse,
    UserPreferencesUpdate,
    UserPreferencesResponse,
    UserCapabilityCreate,
    UserCapabilityUpdate,
    UserCapabilityResponse,
    UserLearningLanguageCreate,
    UserLearningLanguageUpdate,
    UserLearningLanguageResponse,
)
from app.models.practice import PracticeGroup, PracticeResult
from app.models.user import User, UserPreferences, UserCapability, UserLearningLanguage
from app.core.database import AsyncSession

router = APIRouter(prefix="/api/users", tags=["用户"])


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_workspace_user)) -> UserResponse:
    return serialize_profile(current_user)


def serialize_profile(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    *,
    db: AsyncSession = Depends(get_db),
    user_in: UserUpdate,
    current_user: User = Depends(get_workspace_user),
) -> UserResponse:
    """更新用户资料"""
    if user_in.username:
        # 检查用户名是否已被其他用户使用
        result = await db.execute(
            select(User).where(
                User.username == user_in.username,
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        current_user.username = user_in.username

    if user_in.email:
        # 检查邮箱是否已被其他用户使用
        result = await db.execute(
            select(User).where(
                User.email == user_in.email,
                User.id != current_user.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        current_user.email = user_in.email

    await db.commit()
    await db.refresh(current_user)

    return serialize_profile(current_user)


# @router.put("/preferences", response_model="UserPreferencesResponse")
# async def update_preferences(
#     *,
#     db: AsyncSession = Depends(get_db),
#     preferences_in: UserPreferencesUpdate,
#     current_user: User = Depends(get_workspace_user),
# ) -> UserPreferencesResponse:
#     """更新用户偏好"""
#     # 获取或创建偏好设置
#     result = await db.execute(
#         select(UserPreferences).where(UserPreferences.user_id == current_user.id)
#     )
#     preferences = result.scalar_one_or_none()
#
#     if not preferences:
#         preferences = UserPreferences(user_id=current_user.id)
#         db.add(preferences)
#
#     # 更新字段
#     update_data = preferences_in.model_dump(exclude_unset=True)
#     for field, value in update_data.items():
#         setattr(preferences, field, value)
#
#     await db.commit()
#     await db.refresh(preferences)
#
#     return UserPreferencesResponse(
#         id=str(preferences.id),
#         theme=preferences.theme,
#         notifications_email=preferences.notifications_email,
#         notifications_push=preferences.notifications_push,
#         practice_reminders=preferences.practice_reminders,
#         daily_quote_enabled=preferences.daily_quote_enabled,
#         review_reminders=preferences.review_reminders,
#         milestone_updates=preferences.milestone_updates,
#         pk_invitations=preferences.pk_invitations,
#     )


@router.get("/learning-status")
async def get_learning_status(
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户学习状态"""
    # 获取用户的学习语言
    result = await db.execute(
        select(UserLearningLanguage).where(
            UserLearningLanguage.user_id == current_user.id,
            UserLearningLanguage.is_active == True,
        )
    )
    languages = result.scalars().all()
    completed = (PracticeResult.user_id == current_user.id, PracticeResult.completed_at.is_not(None))
    count, total_time_ms = (await db.execute(
        select(func.count(PracticeResult.id), func.sum(PracticeResult.total_time)).where(*completed)
    )).one()
    recent_practices = (await db.execute(
        select(PracticeResult, PracticeGroup.title)
        .join(PracticeGroup, PracticeResult.practice_group_id == PracticeGroup.id)
        .where(*completed)
        .order_by(PracticeResult.completed_at.desc(), PracticeResult.id)
        .limit(5)
    )).all()

    return {
        "success": True,
        "data": {
            "completedPractices": count,
            "totalPracticeMinutes": (total_time_ms or 0) // 60000,
            "recentPractices": [
                {
                    "id": str(practice.id),
                    "title": title,
                    "accuracy": float(practice.accuracy),
                    "completedAt": practice.completed_at.isoformat(),
                }
                for practice, title in recent_practices
            ],
            "languages": [
                {
                    "language": lang.language,
                    "currentLevel": lang.current_level,
                    "targetLevel": lang.target_level,
                    "isPrimary": lang.is_primary,
                }
                for lang in languages
            ]
        }
    }


# 能力管理
@router.post("/capabilities", response_model=UserCapabilityResponse)
async def create_capability(
    *,
    db: AsyncSession = Depends(get_db),
    capability_in: UserCapabilityCreate,
    current_user: User = Depends(get_workspace_user),
) -> UserCapabilityResponse:
    """创建用户能力记录"""
    # 检查是否已存在
    result = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == current_user.id,
            UserCapability.language == capability_in.language,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capability for this language already exists",
        )

    capability = UserCapability(
        user_id=current_user.id,
        language=capability_in.language,
        current_level=capability_in.current_level,
        learning_goal=capability_in.learning_goal,
        overall_level=capability_in.current_level,
    )
    db.add(capability)
    await db.commit()
    await db.refresh(capability)

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        current_level=capability.current_level,
        learning_goal=capability.learning_goal,
        is_active_learning=capability.is_active_learning,
        overall_level=capability.overall_level,
        confidence_score=capability.confidence_score or 0,
        listening_level=capability.listening_level or 0,
        speaking_level=capability.speaking_level or 0,
        reading_level=capability.reading_level or 0,
        writing_level=capability.writing_level or 0,
        estimated_vocabulary_size=capability.estimated_vocabulary_size or 0,
        mastered_words_count=capability.mastered_words_count or 0,
        learning_words_count=capability.learning_words_count or 0,
        last_assessed_at=capability.last_assessed_at,
        next_assessment_due=capability.next_assessment_due,
    )


@router.get("/capabilities/{language}", response_model=UserCapabilityResponse)
async def get_capability(
    language: str,
    current_user: User = Depends(get_workspace_user),
    db: AsyncSession = Depends(get_db),
) -> UserCapabilityResponse:
    """获取指定语言的能力"""
    result = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == current_user.id,
            UserCapability.language == language,
        )
    )
    capability = result.scalar_one_or_none()

    if not capability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capability not found",
        )

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        current_level=capability.current_level,
        learning_goal=capability.learning_goal,
        is_active_learning=capability.is_active_learning,
        overall_level=capability.overall_level,
        confidence_score=capability.confidence_score or 0,
        listening_level=capability.listening_level or 0,
        speaking_level=capability.speaking_level or 0,
        reading_level=capability.reading_level or 0,
        writing_level=capability.writing_level or 0,
        estimated_vocabulary_size=capability.estimated_vocabulary_size or 0,
        mastered_words_count=capability.mastered_words_count or 0,
        learning_words_count=capability.learning_words_count or 0,
        last_assessed_at=capability.last_assessed_at,
        next_assessment_due=capability.next_assessment_due,
    )


@router.put("/capabilities/{language}", response_model=UserCapabilityResponse)
async def update_capability(
    language: str,
    *,
    db: AsyncSession = Depends(get_db),
    capability_in: UserCapabilityUpdate,
    current_user: User = Depends(get_workspace_user),
) -> UserCapabilityResponse:
    """更新用户能力"""
    result = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == current_user.id,
            UserCapability.language == language,
        )
    )
    capability = result.scalar_one_or_none()

    if not capability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capability not found",
        )

    # 更新字段
    update_data = capability_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(capability, field, value)

    await db.commit()
    await db.refresh(capability)

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        current_level=capability.current_level,
        learning_goal=capability.learning_goal,
        is_active_learning=capability.is_active_learning,
        overall_level=capability.overall_level,
        confidence_score=capability.confidence_score or 0,
        listening_level=capability.listening_level or 0,
        speaking_level=capability.speaking_level or 0,
        reading_level=capability.reading_level or 0,
        writing_level=capability.writing_level or 0,
        estimated_vocabulary_size=capability.estimated_vocabulary_size or 0,
        mastered_words_count=capability.mastered_words_count or 0,
        learning_words_count=capability.learning_words_count or 0,
        last_assessed_at=capability.last_assessed_at,
        next_assessment_due=capability.next_assessment_due,
    )


# 管理员功能
@router.get("/admin/all")
async def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取所有用户（管理员）"""
    offset = (page - 1) * limit

    result = await db.execute(
        select(User).offset(offset).limit(limit).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    count_result = await db.execute(select(func.count()).select_from(User))
    total = count_result.scalar()

    return {
        "success": True,
        "data": [
            {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat(),
            }
            for user in users
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
        },
    }
