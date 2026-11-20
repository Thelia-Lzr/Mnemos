"""
每日推荐路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
from datetime import datetime, date
import uuid

from app.api.deps import get_db, get_workspace_user
from app.schemas.recommendation import (
    DailyRecommendationResponse,
    RecommendationFeedbackRequest,
    RecommendationGenerateRequest,
    RecommendationHistoryResponse,
)
from app.services.daily_recommendation_service import DailyRecommendationService, get_daily_recommendation_service
from app.models.user import User
from app.models.recommendation import DailyRecommendation

router = APIRouter(prefix="/api/daily-recommendations", tags=["每日推荐"])


@router.get("/{language}/today")
async def get_today_recommendations(
    *,
    language: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取今日推荐"""
    today = date.today()

    result = await db.execute(
        select(DailyRecommendation).where(
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
            DailyRecommendation.language == language,
            DailyRecommendation.date == today,
        )
    )
    recommendations = list(result.scalars().all())

    if not recommendations:
        # 生成今日推荐
        service = get_daily_recommendation_service(db)
        await service.generate_recommendation(
            user_id=str(current_user.id),
            language=language,
        )

        # 重新获取
        result = await db.execute(
            select(DailyRecommendation).where(
                DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
                DailyRecommendation.language == language,
                DailyRecommendation.date == today,
            )
        )
        recommendations = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            DailyRecommendationResponse(
                id=str(r.id),
                userId=str(r.user_id),
                language=r.language,
                date=r.date,
                recommendationData=r.recommendation_data or {},
                isViewed=r.is_viewed,
                viewedAt=r.viewed_at,
                feedbackRating=r.feedback_rating,
                feedbackIsHelpful=r.feedback_is_helpful,
                feedbackComments=r.feedback_comments,
                quickPracticeOptions=r.quick_practice_options or [],
            )
            for r in recommendations
        ],
    }


@router.get("/{language}/date/{target_date}")
async def get_recommendations_by_date(
    *,
    language: str,
    target_date: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取指定日期推荐"""
    try:
        target = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    result = await db.execute(
        select(DailyRecommendation).where(
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
            DailyRecommendation.language == language,
            DailyRecommendation.date == target,
        )
    )
    recommendations = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            DailyRecommendationResponse(
                id=str(r.id),
                userId=str(r.user_id),
                language=r.language,
                date=r.date,
                recommendationData=r.recommendation_data or {},
                isViewed=r.is_viewed,
                viewedAt=r.viewed_at,
                feedbackRating=r.feedback_rating,
                feedbackIsHelpful=r.feedback_is_helpful,
                feedbackComments=r.feedback_comments,
                quickPracticeOptions=r.quick_practice_options or [],
            )
            for r in recommendations
        ],
    }


@router.post("/{language}/generate")
async def generate_recommendations(
    *,
    language: str,
    request: Optional[RecommendationGenerateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """生成推荐"""
    service = get_daily_recommendation_service(db)

    try:
        await service.generate_recommendation(
            user_id=str(current_user.id),
            language=language,
            regenerate=True,
        )

        return {
            "success": True,
            "message": "Recommendations generated successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{language}/view")
async def mark_as_viewed(
    *,
    language: str,
    recommendation_id: uuid.UUID = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """标记已查看"""
    result = await db.execute(
        select(DailyRecommendation).where(
            DailyRecommendation.id == recommendation_id,
            DailyRecommendation.language == language,
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    recommendation = result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    recommendation.is_viewed = True
    recommendation.viewed_at = datetime.utcnow()
    await db.commit()

    return {
        "success": True,
        "message": "Recommendation marked as viewed",
    }


@router.post("/{language}/feedback")
async def submit_feedback(
    *,
    language: str,
    request: RecommendationFeedbackRequest,
    recommendation_id: uuid.UUID = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """提交反馈"""
    result = await db.execute(
        select(DailyRecommendation).where(
            DailyRecommendation.id == recommendation_id,
            DailyRecommendation.language == language,
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    recommendation = result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    recommendation.feedback_rating = request.rating
    recommendation.feedback_is_helpful = request.isHelpful
    recommendation.feedback_comments = request.comments
    recommendation.recommendation_data = {
        **recommendation.recommendation_data,
        "feedback_followed_ids": request.followedRecommendations or [],
    }
    await db.commit()

    return {
        "success": True,
        "message": "Feedback submitted successfully",
    }


@router.get("/{language}/history", response_model=RecommendationHistoryResponse)
async def get_recommendation_history(
    *,
    language: str,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取推荐历史"""
    result = await db.execute(
        select(DailyRecommendation)
        .where(
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
            DailyRecommendation.language == language,
        )
        .order_by(DailyRecommendation.date.desc())
        .offset(offset)
        .limit(limit)
    )
    recommendations = list(result.scalars().all())

    total_result = await db.execute(
        select(func.count(DailyRecommendation.id)).where(
            DailyRecommendation.user_id == uuid.UUID(str(current_user.id)),
            DailyRecommendation.language == language,
        )
    )
    total = total_result.scalar() or 0

    return RecommendationHistoryResponse(
        success=True,
        data=[
            DailyRecommendationResponse(
                id=str(r.id),
                userId=str(r.user_id),
                language=r.language,
                date=r.date,
                recommendationData=r.recommendation_data or {},
                isViewed=r.is_viewed,
                viewedAt=r.viewed_at,
                feedbackRating=r.feedback_rating,
                feedbackIsHelpful=r.feedback_is_helpful,
                feedbackComments=r.feedback_comments,
                quickPracticeOptions=r.quick_practice_options or [],
            )
            for r in recommendations
        ],
        pagination={"total": total, "limit": limit, "offset": offset},
    )
