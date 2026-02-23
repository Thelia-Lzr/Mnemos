"""
评估路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import uuid

from app.api.deps import get_db, get_current_user
from app.schemas.assessment import (
    UserCapabilityResponse,
    UserCapabilityCreate,
    UserCapabilityUpdate,
    LanguageLevel,
    AssessmentType,
    ComprehensiveAssessmentRequest,
    AssessmentResult,
    AssessmentHistoryEntry,
)
from app.models.user import User
from app.models.user import UserCapability

router = APIRouter(prefix="/api/assessment", tags=["评估"])


@router.get("/capabilities")
async def get_capabilities(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取所有能力"""
    result = await db.execute(
        select(UserCapability).where(UserCapability.user_id == uuid.UUID(str(current_user.id)))
    )
    capabilities = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            UserCapabilityResponse(
                id=str(c.id),
                language=c.language,
                currentLevel=c.current_level,
                learningGoal=c.learning_goal,
                isActiveLearning=c.is_active_learning,
                overallLevel=c.overall_level,
                confidenceScore=c.confidence_score,
                listeningLevel=c.listening_level,
                speakingLevel=c.speaking_level,
                readingLevel=c.reading_level,
                writingLevel=c.writing_level,
                estimatedVocabularySize=c.estimated_vocabulary_size,
                masteredWordsCount=c.mastered_words_count,
                learningWordsCount=c.learning_words_count,
                lastAssessedAt=c.last_assessed_at,
                nextAssessmentDue=c.next_assessment_due,
            )
            for c in capabilities
        ],
    }


@router.post("/capability", response_model=UserCapabilityResponse)
async def create_capability(
    *,
    request: UserCapabilityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建能力"""
    # 检查是否已存在
    existing = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == uuid.UUID(str(current_user.id)),
            UserCapability.language == request.language,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Capability already exists for this language")

    capability = UserCapability(
        user_id=uuid.UUID(str(current_user.id)),
        language=request.language,
        current_level=request.currentLevel.value,
        learning_goal=request.learningGoal.value,
        is_active_learning=True,
        overall_level=request.currentLevel.value,
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
    await db.refresh(capability)

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        currentLevel=capability.current_level,
        learningGoal=capability.learning_goal,
        isActiveLearning=capability.is_active_learning,
        overallLevel=capability.overall_level,
        confidenceScore=capability.confidence_score,
        listeningLevel=capability.listening_level,
        speakingLevel=capability.speaking_level,
        readingLevel=capability.reading_level,
        writingLevel=capability.writing_level,
        estimatedVocabularySize=capability.estimated_vocabulary_size,
        masteredWordsCount=capability.mastered_words_count,
        learningWordsCount=capability.learning_words_count,
        lastAssessedAt=capability.last_assessed_at,
        nextAssessmentDue=capability.next_assessment_due,
    )


@router.get("/capability/{language}")
async def get_capability(
    *,
    language: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取能力"""
    result = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == uuid.UUID(str(current_user.id)),
            UserCapability.language == language,
        )
    )
    capability = result.scalar_one_or_none()

    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    return {
        "success": True,
        "data": UserCapabilityResponse(
            id=str(capability.id),
            language=capability.language,
            currentLevel=capability.current_level,
            learningGoal=capability.learning_goal,
            isActiveLearning=capability.is_active_learning,
            overallLevel=capability.overall_level,
            confidenceScore=capability.confidence_score,
            listeningLevel=capability.listening_level,
            speakingLevel=capability.speaking_level,
            readingLevel=capability.reading_level,
            writingLevel=capability.writing_level,
            estimatedVocabularySize=capability.estimated_vocabulary_size,
            masteredWordsCount=capability.mastered_words_count,
            learningWordsCount=capability.learning_words_count,
            lastAssessedAt=capability.last_assessed_at,
            nextAssessmentDue=capability.next_assessment_due,
        ),
    }


@router.put("/capability/{language}", response_model=UserCapabilityResponse)
async def update_capability(
    *,
    language: str,
    request: UserCapabilityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新能力"""
    result = await db.execute(
        select(UserCapability).where(
            UserCapability.user_id == uuid.UUID(str(current_user.id)),
            UserCapability.language == language,
        )
    )
    capability = result.scalar_one_or_none()

    if not capability:
        raise HTTPException(status_code=404, detail="Capability not found")

    if request.currentLevel:
        capability.current_level = request.currentLevel.value
        capability.overall_level = request.currentLevel.value
    if request.learningGoal:
        capability.learning_goal = request.learningGoal.value
    if request.isActiveLearning is not None:
        capability.is_active_learning = request.isActiveLearning

    await db.commit()
    await db.refresh(capability)

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        currentLevel=capability.current_level,
        learningGoal=capability.learning_goal,
        isActiveLearning=capability.is_active_learning,
        overallLevel=capability.overall_level,
        confidenceScore=capability.confidence_score,
        listeningLevel=capability.listening_level,
        speakingLevel=capability.speaking_level,
        readingLevel=capability.reading_level,
        writingLevel=capability.writing_level,
        estimatedVocabularySize=capability.estimated_vocabulary_size,
        masteredWordsCount=capability.mastered_words_count,
        learningWordsCount=capability.learning_words_count,
        lastAssessedAt=capability.last_assessed_at,
        nextAssessmentDue=capability.next_assessment_due,
    )


@router.post("/comprehensive")
async def comprehensive_assessment(
    *,
    request: ComprehensiveAssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """综合评估"""
    # TODO: 实现综合评估逻辑
    # 目前返回一个示例响应

    return {
        "success": True,
        "data": {
            "overallLevel": "B1",
            "confidenceScore": 65,
            "listeningLevel": 60,
            "speakingLevel": 55,
            "readingLevel": 70,
            "writingLevel": 65,
            "strengths": ["Reading comprehension", "Vocabulary recognition"],
            "weaknesses": ["Speaking fluency", "Listening speed"],
            "recommendations": [
                "Practice listening with podcasts",
                "Join conversation groups",
                "Review intermediate grammar",
            ],
        },
    }


@router.get("/history/{language}")
async def get_assessment_history(
    *,
    language: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """获取评估历史"""
    # TODO: 实现评估历史查询
    # 目前返回空列表

    return {
        "success": True,
        "data": [],
    }


@router.post("/reassessment")
async def request_reassessment(
    *,
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """发起再评估"""
    # TODO: 实现再评估逻辑

    return {
        "success": True,
        "data": {
            "reassessmentId": str(uuid.uuid4()),
            "language": request.get("language", "en"),
            "status": "pending",
            "questions": [],
            "expiresAt": None,
        },
    }
