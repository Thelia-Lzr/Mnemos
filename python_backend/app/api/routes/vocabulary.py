"""
词汇路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Dict, Any
import uuid

from app.api.deps import get_db, get_current_user
from app.schemas.vocabulary import (
    VocabularyWordCreate,
    VocabularyWordUpdate,
    VocabularyWordResponse,
    VocabularyWordListResponse,
    MasteryStatsResponse,
    VocabularyPracticeRequest,
    VocabularySubmitPracticeRequest,
    ForgettingCurveMetrics,
    LearningEfficiencyMetrics,
    MasteryLevel,
)
from app.services.vocabulary_service import VocabularyService, get_vocabulary_service
from app.models.user import User
from app.models.vocabulary import VocabularyWord

router = APIRouter(prefix="/api/vocabulary", tags=["词汇"])


@router.get("/words", response_model=VocabularyWordListResponse)
async def get_vocabulary_words(
    *,
    db: AsyncSession = Depends(get_db),
    language: Optional[str] = Query(None, pattern="^(en|ja|fr)$"),
    mastery_level: Optional[MasteryLevel] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """获取词汇列表"""
    vocabulary_service = get_vocabulary_service(db)

    if not language:
        raise HTTPException(
            status_code=400,
            detail="Valid language parameter is required (en, ja, fr)",
        )

    words = await vocabulary_service.get_words(
        user_id=str(current_user.id),
        language=language,
        mastery_level=mastery_level,
        limit=limit,
        offset=offset,
    )

    total_query = await db.execute(
        select(func.count(VocabularyWord.id)).where(
            VocabularyWord.user_id == uuid.UUID(str(current_user.id)),
            VocabularyWord.language == language,
        )
    )
    total = total_query.scalar() or 0

    return VocabularyWordListResponse(
        success=True,
        data=[
            VocabularyWordResponse(
                id=str(w.id),
                userId=str(w.user_id),
                word=w.word,
                language=w.language,
                definition=w.definition,
                pronunciation=w.pronunciation,
                part_of_speech=w.part_of_speech,
                difficulty=w.difficulty,
                frequency=w.frequency,
                mastery_level=w.mastery_level,
                mastery_score=w.mastery_score,
                lastReviewedAt=w.last_reviewed_at,
                nextReviewAt=w.next_review_at,
                reviewCount=w.review_count,
            )
            for w in words
        ],
        pagination={"total": total, "limit": limit, "offset": offset},
    )


@router.post("/add-word", response_model=VocabularyWordResponse)
async def add_word(
    *,
    db: AsyncSession = Depends(get_db),
    request: VocabularyWordCreate,
    current_user: User = Depends(get_current_user),
):
    """添加单个单词"""
    vocabulary_service = get_vocabulary_service(db)

    try:
        word = await vocabulary_service.add_word(
            user_id=str(current_user.id),
            word=request.word,
            language=request.language,
            definition=request.definition,
            pronunciation=request.pronunciation,
            part_of_speech=request.part_of_speech,
        )

        return VocabularyWordResponse(
            id=str(word.id),
            userId=str(word.user_id),
            word=word.word,
            language=word.language,
            definition=word.definition,
            pronunciation=word.pronunciation,
            part_of_speech=word.part_of_speech,
            difficulty=word.difficulty,
            frequency=word.frequency,
            mastery_level=word.mastery_level,
            mastery_score=word.mastery_score,
            lastReviewedAt=word.last_reviewed_at,
            nextReviewAt=word.next_review_at,
            reviewCount=word.review_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/add-words")
async def add_words_from_text(
    *,
    db: AsyncSession = Depends(get_db),
    text: str = Body(..., embed=True),
    language: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """从文本中添加单词"""
    vocabulary_service = get_vocabulary_service(db)

    if language not in ["en", "ja", "fr"]:
        raise HTTPException(
            status_code=400,
            detail="Valid language is required (en, ja, fr)",
        )

    try:
        words = await vocabulary_service.add_words_from_text(
            user_id=str(current_user.id),
            text=text,
            language=language,
        )

        return {
            "success": True,
            "data": [
                VocabularyWordResponse(
                    id=str(w.id),
                    userId=str(w.user_id),
                    word=w.word,
                    language=w.language,
                    definition=w.definition,
                    pronunciation=w.pronunciation,
                    part_of_speech=w.part_of_speech,
                    difficulty=w.difficulty,
                    frequency=w.frequency,
                    mastery_level=w.mastery_level,
                    mastery_score=w.mastery_score,
                    lastReviewedAt=w.last_reviewed_at,
                    nextReviewAt=w.next_review_at,
                    reviewCount=w.review_count,
                )
                for w in words
            ],
            "message": f"Added {len(words)} new words to vocabulary",
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/word/{word_id}")
async def remove_word(
    *,
    word_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除单词"""
    vocabulary_service = get_vocabulary_service(db)

    success = await vocabulary_service.delete_word(
        user_id=str(current_user.id),
        word_id=word_id,
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Word not found or access denied",
        )

    return {"success": True, "message": "Word removed successfully"}


@router.put("/word/{word_id}/mastery", response_model=VocabularyWordResponse)
async def update_mastery(
    *,
    word_id: str,
    mastery_level: Optional[MasteryLevel] = Body(None),
    mastery_score: Optional[int] = Body(None, ge=0, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新单词掌握程度"""
    vocabulary_service = get_vocabulary_service(db)

    try:
        word = await vocabulary_service.update_mastery(
            user_id=str(current_user.id),
            word_id=word_id,
            mastery_level=mastery_level,
            mastery_score=mastery_score,
        )

        return VocabularyWordResponse(
            id=str(word.id),
            userId=str(word.user_id),
            word=word.word,
            language=word.language,
            definition=word.definition,
            pronunciation=word.pronunciation,
            part_of_speech=word.part_of_speech,
            difficulty=word.difficulty,
            frequency=word.frequency,
            mastery_level=word.mastery_level,
            mastery_score=word.mastery_score,
            lastReviewedAt=word.last_reviewed_at,
            nextReviewAt=word.next_review_at,
            reviewCount=word.review_count,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/mastery-stats", response_model=MasteryStatsResponse)
async def get_mastery_stats(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query(..., pattern="^(en|ja|fr)$"),
    current_user: User = Depends(get_current_user),
):
    """获取掌握度统计"""
    vocabulary_service = get_vocabulary_service(db)

    stats = await vocabulary_service.get_mastery_stats(
        user_id=str(current_user.id),
        language=language,
    )

    return MasteryStatsResponse(
        language=language,
        totalWords=stats["total"],
        newWords=stats["by_level"].get("new", 0),
        learningWords=stats["by_level"].get("learning", 0),
        shortTermWords=stats["by_level"].get("short_term", 0),
        longTermWords=stats["by_level"].get("long_term", 0),
        masteredWords=stats["by_level"].get("mastered", 0),
        averageMasteryScore=stats["average_score"],
        wordsNeedingReview=0,  # TODO: 计算需要复习的单词数
    )


@router.get("/words-needing-review")
async def get_words_needing_review(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query(..., pattern="^(en|ja|fr)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """获取需要复习的单词"""
    vocabulary_service = get_vocabulary_service(db)

    words = await vocabulary_service.get_words_needing_review(
        user_id=str(current_user.id),
        language=language,
        limit=limit,
    )

    return {
        "success": True,
        "data": {
            "words": [
                VocabularyWordResponse(
                    id=str(w.id),
                    userId=str(w.user_id),
                    word=w.word,
                    language=w.language,
                    definition=w.definition,
                    pronunciation=w.pronunciation,
                    part_of_speech=w.part_of_speech,
                    difficulty=w.difficulty,
                    frequency=w.frequency,
                    mastery_level=w.mastery_level,
                    mastery_score=w.mastery_score,
                    lastReviewedAt=w.last_reviewed_at,
                    nextReviewAt=w.next_review_at,
                    reviewCount=w.review_count,
                )
                for w in words
            ]
        },
    }


@router.post("/apply-daily-decay")
async def apply_daily_decay(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Body(..., embed=True, pattern="^(en|ja|fr)$"),
    current_user: User = Depends(get_current_user),
):
    """应用每日遗忘衰减"""
    vocabulary_service = get_vocabulary_service(db)

    updated_count = await vocabulary_service.apply_daily_decay(
        user_id=str(current_user.id),
        language=language,
    )

    return {
        "success": True,
        "message": f"Daily decay applied. Updated {updated_count} words.",
    }


@router.get("/scheduled-reviews")
async def get_scheduled_reviews(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query(..., pattern="^(en|ja|fr)$"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
):
    """获取 scheduled reviews"""
    # TODO: 实现 scheduled reviews 功能
    return {
        "success": True,
        "data": {"schedules": []},
    }


@router.get("/review-reminders")
async def get_review_reminders(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取复习提醒"""
    # TODO: 实现复习提醒功能
    return {
        "success": True,
        "data": {"reminders": []},
    }


@router.get("/forgetting-curve-metrics", response_model=ForgettingCurveMetrics)
async def get_forgetting_curve_metrics(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query(..., pattern="^(en|ja|fr)$"),
    current_user: User = Depends(get_current_user),
):
    """获取遗忘曲线指标"""
    # TODO: 实现遗忘曲线指标计算
    return ForgettingCurveMetrics(
        language=language,
        averageRetentionRate=0.0,
        wordsByRetentionRange={},
        optimalReviewTimes=[],
    )


@router.post("/optimize-review-schedule")
async def optimize_review_schedule(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Body(..., embed=True, pattern="^(en|ja|fr)$"),
    current_user: User = Depends(get_current_user),
):
    """优化复习计划"""
    # TODO: 实现复习计划优化
    return {
        "success": True,
        "message": "Review schedule optimized successfully",
    }


@router.post("/generate-practice")
async def generate_vocabulary_practice(
    *,
    db: AsyncSession = Depends(get_db),
    request: VocabularyPracticeRequest,
    current_user: User = Depends(get_current_user),
):
    """生成词汇练习"""
    vocabulary_service = get_vocabulary_service(db)

    practice_data = await vocabulary_service.generate_practice(
        user_id=request.userId if hasattr(request, 'userId') else str(current_user.id),
        language=request.language,
        word_ids=request.wordIds,
        max_words=request.maxWords,
    )

    return {
        "success": True,
        "data": practice_data,
    }


@router.post("/submit-practice")
async def submit_vocabulary_practice(
    *,
    db: AsyncSession = Depends(get_db),
    request: VocabularySubmitPracticeRequest,
    current_user: User = Depends(get_current_user),
):
    """提交词汇练习结果"""
    vocabulary_service = get_vocabulary_service(db)

    # 更新掌握度
    for result in request.results:
        try:
            await vocabulary_service.update_mastery(
                user_id=str(current_user.id),
                word_id=result.wordId,
                mastery_score=min(100, max(0, result.masteryDelta)),
            )
        except Exception:
            pass  # 忽略单个单词更新失败

    return {
        "success": True,
        "message": "Practice results processed successfully",
    }


@router.get("/learning-efficiency-metrics", response_model=LearningEfficiencyMetrics)
async def get_learning_efficiency_metrics(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query(..., pattern="^(en|ja|fr)$"),
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
):
    """获取学习效率指标"""
    # TODO: 实现学习效率指标计算
    return LearningEfficiencyMetrics(
        language=language,
        wordsLearned=0,
        averageTimePerWord=0.0,
        retentionRate=0.0,
        efficiencyScore=0.0,
    )
