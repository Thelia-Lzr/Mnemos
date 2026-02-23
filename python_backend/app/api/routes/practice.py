"""
练习路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
import uuid
import sqlalchemy

from app.api.deps import get_db, get_current_user
from app.schemas.practice import (
    PracticeGroupCreate,
    PracticeGroupResponse,
    QuestionResponse,
    PracticeResultResponse,
    PracticeAIAnalysisResponse,
    PracticeSubmitRequest,
    PracticeGenerateRequest,
    PracticeHistoryResponse,
    PracticeFollowupRequest,
)
from app.services.practice_service import PracticeService, get_practice_service
from app.models.practice import PracticeGroup
from app.models.user import User

router = APIRouter(prefix="/api/practice", tags=["练习"])


@router.post("/generate-group", response_model=PracticeGroupResponse)
async def generate_practice_group(
    *,
    db: AsyncSession = Depends(get_db),
    request: PracticeGroupCreate,
    current_user: User = Depends(get_current_user),
):
    """生成练习组"""
    practice_service = get_practice_service(db)

    try:
        practice_group = await practice_service.generate_practice_group(
            user_id=str(current_user.id),
            language=request.language,
            skill_areas=request.skillAreas,
            difficulty=request.difficulty,
            question_count=request.questionCount,
            title=request.title,
            description=request.description,
            focus_areas=request.focusAreas,
        )

        return PracticeGroupResponse(
            id=str(practice_group.id),
            userId=str(practice_group.user_id),
            title=practice_group.title,
            description=practice_group.description,
            language=practice_group.language,
            difficulty=practice_group.difficulty,
            type=practice_group.type,
            estimatedDuration=practice_group.estimated_duration,
            focusAreas=practice_group.focus_areas,
            createdAt=practice_group.created_at,
            questions=[
                QuestionResponse(
                    id=str(q.id),
                    practiceGroupId=str(q.practice_group_id),
                    type=q.type,
                    content=q.content,
                    options=q.options,
                    correctAnswer=q.correct_answer,
                    explanation=q.explanation,
                    difficulty=q.difficulty,
                    orderIndex=q.order_index,
                )
                for q in practice_group.questions
            ] if practice_group.questions else [],
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/groups", response_model=List[PracticeGroupResponse])
async def get_practice_groups(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """获取练习组列表"""
    from sqlalchemy import select
    from app.models.practice import PracticeGroup

    result = await db.execute(
        select(PracticeGroup)
        .where(PracticeGroup.user_id == uuid.UUID(str(current_user.id)))
        .order_by(PracticeGroup.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    groups = list(result.scalars().all())

    return [
        PracticeGroupResponse(
            id=str(g.id),
            userId=str(g.user_id),
            title=g.title,
            description=g.description,
            language=g.language,
            difficulty=g.difficulty,
            type=g.type,
            estimatedDuration=g.estimated_duration,
            focusAreas=g.focus_areas,
            createdAt=g.created_at,
        )
        for g in groups
    ]


@router.get("/group/{group_id}", response_model=PracticeGroupResponse)
async def get_practice_group(
    *,
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取练习组详情"""
    from sqlalchemy import select
    from app.models.practice import PracticeGroup, Question

    result = await db.execute(
        select(PracticeGroup)
        .where(
            PracticeGroup.id == uuid.UUID(group_id),
            PracticeGroup.user_id == uuid.UUID(str(current_user.id)),
        )
    )
    practice_group = result.scalar_one_or_none()

    if not practice_group:
        raise HTTPException(status_code=404, detail="Practice group not found")

    # 获取问题
    q_result = await db.execute(
        select(Question)
        .where(Question.practice_group_id == practice_group.id)
        .order_by(Question.order_index)
    )
    questions = list(q_result.scalars().all())

    return PracticeGroupResponse(
        id=str(practice_group.id),
        userId=str(practice_group.user_id),
        title=practice_group.title,
        description=practice_group.description,
        language=practice_group.language,
        difficulty=practice_group.difficulty,
        type=practice_group.type,
        estimatedDuration=practice_group.estimated_duration,
        focusAreas=practice_group.focus_areas,
        createdAt=practice_group.created_at,
        questions=[
            QuestionResponse(
                id=str(q.id),
                practiceGroupId=str(q.practice_group_id),
                type=q.type,
                content=q.content,
                options=q.options,
                correctAnswer=q.correct_answer,
                explanation=q.explanation,
                difficulty=q.difficulty,
                orderIndex=q.order_index,
            )
            for q in questions
        ],
    )


@router.post("/group/{group_id}/submit", response_model=PracticeResultResponse)
async def submit_practice(
    *,
    group_id: str,
    request: PracticeSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """提交练习答案"""
    practice_service = get_practice_service(db)

    try:
        result = await practice_service.submit_practice(
            user_id=str(current_user.id),
            practice_group_id=group_id,
            answers=request.answers,
            total_time=request.totalTime,
        )

        return PracticeResultResponse(
            id=str(result.id),
            userId=str(result.user_id),
            practiceGroupId=str(result.practice_group_id),
            totalQuestions=result.total_questions,
            correctAnswers=result.correct_answers,
            accuracy=float(result.accuracy),
            totalTime=result.total_time,
            averageTimePerQuestion=float(result.average_time_per_question) if result.average_time_per_question else None,
            weakAreas=result.weak_areas,
            improvedAreas=result.improved_areas,
            recommendedFocus=result.recommended_focus,
            completedAt=result.completed_at,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[PracticeHistoryResponse])
async def get_practice_history(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """获取练习历史"""
    practice_service = get_practice_service(db)

    results = await practice_service.get_practice_history(
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
    )

    return [
        PracticeHistoryResponse(
            id=str(r.id),
            practiceGroupId=str(r.practice_group_id),
            practiceGroupTitle="",  # TODO: 加载关联的练习组标题
            language="",  # TODO: 从练习组获取语言
            accuracy=float(r.accuracy),
            totalQuestions=r.total_questions,
            correctAnswers=r.correct_answers,
            completedAt=r.completed_at,
        )
        for r in results
    ]


@router.post("/group/{group_id}/analyze", response_model=PracticeAIAnalysisResponse)
async def analyze_practice(
    *,
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """生成练习分析（这个端点可能需要调整，因为分析是基于 result 而不是 group）"""
    # TODO: 实现基于练习组的分析
    return {
        "id": "",
        "practiceResultId": "",
        "analysisContent": "Not implemented",
        "learningAdvice": "Please use /api/practice/result/{id}/analyze endpoint",
    }


@router.post("/result/{result_id}/analyze", response_model=PracticeAIAnalysisResponse)
async def analyze_practice_result(
    *,
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """生成练习结果分析"""
    practice_service = get_practice_service(db)

    try:
        analysis = await practice_service.analyze_practice(
            user_id=str(current_user.id),
            practice_result_id=result_id,
        )

        return PracticeAIAnalysisResponse(
            id=str(analysis.id),
            practiceResultId=str(analysis.practice_result_id),
            analysisContent=analysis.analysis_content,
            learningAdvice=analysis.learning_advice,
            strengthsIdentified=analysis.strengths_identified,
            weaknessesIdentified=analysis.weaknesses_identified,
            improvementSuggestions=analysis.improvement_suggestions,
            confidenceScore=analysis.confidence_score,
            aiModel=analysis.ai_model,
            overallProgressDirection=analysis.overall_progress_direction,
            progressMessage=analysis.progress_message,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/group/{group_id}")
async def delete_practice_group(
    *,
    group_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除练习组"""
    practice_service = get_practice_service(db)

    success = await practice_service.delete_practice_group(
        user_id=str(current_user.id),
        practice_group_id=group_id,
    )

    if not success:
        raise HTTPException(status_code=404, detail="Practice group not found")

    return {"success": True, "message": "Practice group deleted"}


@router.post("/followup")
async def ask_followup(
    *,
    db: AsyncSession = Depends(get_db),
    request: PracticeFollowupRequest,
    current_user: User = Depends(get_current_user),
):
    """练习追问"""
    from app.services.openrouter_service import get_openrouter_service, TaskType
    from app.services.practice_service import PracticeService, get_practice_service

    practice_service = get_practice_service(db)
    openrouter = get_openrouter_service()

    # 获取练习题目信息
    if request.practiceGroupId:
        practice_group = await practice_service.db.execute(
            sqlalchemy.select(PracticeGroup).where(
                PracticeGroup.id == uuid.UUID(request.practiceGroupId),
                PracticeGroup.user_id == uuid.UUID(str(current_user.id)),
            )
        )
        group = practice_group.scalar_one_or_none()
    else:
        group = None

    # 构建上下文
    context = f"""用户正在学习{group.language if group else '英语'}。
用户的问题：{request.question}

{f'练习主题：{group.title}' if group else ''}
{f'用户之前的答案：{request.userAnswer}' if request.userAnswer else ''}
"""

    # 使用 AI 生成解释
    model = openrouter.select_model(TaskType.CONVERSATION)

    prompt = f"""作为一个专业的语言学习助手，请回答用户的问题。

{context}

请提供：
1. 清晰的解释
2. 相关的例句
3. 学习建议（如果适用）

用中文回答，除非用户明确要求使用其他语言。"""

    try:
        response = await openrouter.call_ai(
            model=model,
            prompt=prompt,
            user_id=str(current_user.id),
        )

        return {
            "success": True,
            "data": {
                "response": response["content"],
                "model": response["model"],
                "processingTime": response["processing_time"],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
