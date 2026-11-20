"""
评估路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.api.deps import get_db, get_workspace_user
from app.schemas.assessment import (
    UserCapabilityResponse,
    UserCapabilityCreate,
    UserCapabilityUpdate,
    AssessmentRequest,
    AssessmentReport,
    AssessmentHistoryResponse,
    AssessmentSession,
    AssessmentSubmitRequest,
    AssessmentLanguage,
)
from app.models.user import User
from app.models.user import UserCapability, UserLearningLanguage
from app.models.assessment import AssessmentRecord
from app.services.assessment_service import (
    assess_practice, begin_self_test, find_self_test, report_view, session_view, submit_self_test,
)

router = APIRouter(prefix="/api/assessment", tags=["评估"])


@router.get("/capabilities")
async def get_capabilities(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取所有能力"""
    result = await db.execute(
        select(UserCapability)
        .outerjoin(UserLearningLanguage, (UserLearningLanguage.user_id == UserCapability.user_id)
                   & (UserLearningLanguage.language == UserCapability.language))
        .where(UserCapability.user_id == current_user.id)
        .order_by(UserLearningLanguage.is_primary.desc().nulls_last(), UserCapability.language)
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
                isActiveLearning=bool(c.is_active_learning),
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
    current_user: User = Depends(get_workspace_user),
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
    )
    db.add(capability)
    await db.commit()
    await db.refresh(capability)

    return UserCapabilityResponse(
        id=str(capability.id),
        language=capability.language,
        currentLevel=capability.current_level,
        learningGoal=capability.learning_goal,
        isActiveLearning=bool(capability.is_active_learning),
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
    current_user: User = Depends(get_workspace_user),
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
            isActiveLearning=bool(capability.is_active_learning),
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
    current_user: User = Depends(get_workspace_user),
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
        isActiveLearning=bool(capability.is_active_learning),
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
    request: AssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
) -> dict[str, AssessmentReport]:
    return {"data": await assess_practice(db, current_user.id, request.language)}


@router.get("/history/{language}")
async def get_assessment_history(
    language: AssessmentLanguage,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
) -> AssessmentHistoryResponse:
    records = await db.scalars(
        select(AssessmentRecord).where(
            AssessmentRecord.user_id == current_user.id,
            AssessmentRecord.language == language,
            AssessmentRecord.completed_at.is_not(None),
        ).order_by(AssessmentRecord.completed_at.desc(), AssessmentRecord.id.desc()).limit(limit)
    )
    return AssessmentHistoryResponse(data=[report_view(record) for record in records])


@router.post("/reassessment")
async def request_reassessment(
    request: AssessmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
) -> dict[str, AssessmentSession]:
    return {"data": await begin_self_test(db, current_user.id, request.language)}


@router.get("/reassessment/{test_id}")
async def get_reassessment(
    test_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
) -> dict[str, AssessmentSession]:
    record = await find_self_test(db, current_user.id, test_id)
    return {"data": session_view(record)}


@router.post("/reassessment/{test_id}/submit")
async def submit_reassessment(
    test_id: uuid.UUID,
    request: AssessmentSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
) -> dict[str, AssessmentReport]:
    return {"data": await submit_self_test(db, current_user.id, test_id, request.answers)}
