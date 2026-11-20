"""
PK 对战路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import uuid

from app.api.deps import get_db, get_workspace_user
from app.schemas.pk import (
    PKMatchRequest,
    PKBattleResponse,
    PKSubmitAnswerRequest,
    PKBattleAnswerResponse,
    UserMMRResponse,
    MMRHistoryEntry,
    PKLeaderboardEntry,
    PKMatchStatusResponse,
    PKStatsResponse,
    PKBattleStatus,
)
from app.services.pk_battle_service import PKBattleService, get_pk_battle_service
from app.models.user import User
from app.models.pk import PKBattle, UserMMR, MMRHistory, MatchRequest

router = APIRouter(prefix="/api/pk", tags=["PK 对战"])


@router.post("/find-match")
async def find_match(
    *,
    db: AsyncSession = Depends(get_db),
    request: PKMatchRequest,
    current_user: User = Depends(get_workspace_user),
):
    """单用户工作台保留过往对战资料。"""
    raise HTTPException(status_code=409, detail="本地工作台暂不支持多人匹配。")


@router.post("/cancel-match")
async def cancel_match(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """取消匹配"""
    pk_service = get_pk_battle_service(db)

    success = await pk_service.cancel_match(user_id=str(current_user.id))

    if not success:
        raise HTTPException(status_code=404, detail="No active match request found")

    return {"success": True, "message": "Match cancelled"}


@router.get("/match-status", response_model=PKMatchStatusResponse)
async def get_match_status(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取匹配状态"""
    result = await db.execute(
        select(MatchRequest).where(
            MatchRequest.user_id == uuid.UUID(str(current_user.id)),
            MatchRequest.status == "waiting",
        )
    )
    match_request = result.scalar_one_or_none()

    if match_request:
        return PKMatchStatusResponse(
            isMatching=True,
            requestId=str(match_request.id),
            language=match_request.language,
            estimatedWaitTime=30,
        )
    else:
        return PKMatchStatusResponse(
            isMatching=False,
            language="",
        )


@router.get("/battle/{battle_id}", response_model=PKBattleResponse)
async def get_battle(
    *,
    battle_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取对战信息"""
    pk_service = get_pk_battle_service(db)

    battle = await pk_service.get_battle(battle_id)

    if not battle:
        raise HTTPException(status_code=404, detail="Battle not found")

    # 检查权限
    if str(battle.player1_id) != str(current_user.id) and str(battle.player2_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    return PKBattleResponse(
        id=str(battle.id),
        player1Id=str(battle.player1_id),
        player2Id=str(battle.player2_id),
        language=battle.language,
        practiceGroupId=str(battle.practice_group_id) if battle.practice_group_id else None,
        startTime=battle.start_time,
        endTime=battle.end_time,
        player1Score=battle.player1_score,
        player2Score=battle.player2_score,
        player1Time=battle.player1_time,
        player2Time=battle.player2_time,
        winnerId=str(battle.winner_id) if battle.winner_id else None,
        player1MmrChange=battle.player1_mmr_change,
        player2MmrChange=battle.player2_mmr_change,
        status=battle.status,
    )


@router.post("/battle/{battle_id}/start")
async def start_battle(
    *,
    battle_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """开始对战"""
    pk_service = get_pk_battle_service(db)

    try:
        battle = await pk_service.start_battle(
            battle_id=battle_id,
            user_id=str(current_user.id),
        )

        return {
            "success": True,
            "message": "Battle started",
            "battleId": str(battle.id),
            "practiceGroupId": str(battle.practice_group_id) if battle.practice_group_id else None,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/battle/{battle_id}/answer")
async def submit_answer(
    *,
    battle_id: str,
    request: PKSubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """提交答案"""
    pk_service = get_pk_battle_service(db)

    try:
        result = await pk_service.submit_answer(
            battle_id=battle_id,
            user_id=str(current_user.id),
            question_index=request.questionIndex,
            answer=request.answer,
        )

        return {
            "success": True,
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/battle/{battle_id}/finish")
async def finish_battle(
    *,
    battle_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """结束对战"""
    pk_service = get_pk_battle_service(db)

    try:
        battle = await pk_service.finish_battle(battle_id=battle_id)

        return {
            "success": True,
            "data": PKBattleResponse(
                id=str(battle.id),
                player1Id=str(battle.player1_id),
                player2Id=str(battle.player2_id),
                language=battle.language,
                practiceGroupId=str(battle.practice_group_id) if battle.practice_group_id else None,
                startTime=battle.start_time,
                endTime=battle.end_time,
                player1Score=battle.player1_score,
                player2Score=battle.player2_score,
                player1Time=battle.player1_time,
                player2Time=battle.player2_time,
                winnerId=str(battle.winner_id) if battle.winner_id else None,
                player1MmrChange=battle.player1_mmr_change,
                player2MmrChange=battle.player2_mmr_change,
                status=battle.status,
            ),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history")
async def get_battle_history(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    language: Optional[str] = Query(None, pattern="^(en|ja|fr)$"),
    current_user: User = Depends(get_workspace_user),
):
    """获取对战历史"""
    pk_service = get_pk_battle_service(db)

    battles = await pk_service.get_battle_history(
        user_id=str(current_user.id),
        limit=limit,
        language=language,
    )

    return {
        "success": True,
        "data": [
            {
                "id": str(b.id),
                "player1Id": str(b.player1_id),
                "player2Id": str(b.player2_id),
                "language": b.language,
                "player1Score": b.player1_score,
                "player2Score": b.player2_score,
                "player1Time": b.player1_time,
                "player2Time": b.player2_time,
                "winnerId": str(b.winner_id) if b.winner_id else None,
                "player1MmrChange": b.player1_mmr_change,
                "player2MmrChange": b.player2_mmr_change,
                "createdAt": b.created_at,
                "endTime": b.end_time,
                "status": b.status,
            }
            for b in battles
        ],
    }


@router.get("/leaderboard")
async def get_leaderboard_compat(
    *,
    language: str = Query("en"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """兼容前端 query 形式排行榜接口"""
    return await get_leaderboard(language=language, limit=limit, db=db)


@router.get("/mmr/{language}", response_model=UserMMRResponse)
async def get_user_mmr(
    *,
    language: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """获取用户 MMR"""
    if language not in ["en", "ja", "fr"]:
        raise HTTPException(status_code=400, detail="Invalid language")

    pk_service = get_pk_battle_service(db)

    mmr = await pk_service.get_user_mmr(
        user_id=str(current_user.id),
        language=language,
    )

    if not mmr:
        # 返回默认值
        return UserMMRResponse(
            id="",
            userId=str(current_user.id),
            language=language,
            currentMmr=1000,
            peakMmr=1000,
            totalBattles=0,
            wins=0,
            losses=0,
            winRate=0.0,
            vocabularyRating=1000,
            grammarRating=1000,
            speedRating=1000,
            accuracyRating=1000,
        )

    return UserMMRResponse(
        id=str(mmr.id),
        userId=str(mmr.user_id),
        language=mmr.language,
        currentMmr=mmr.current_mmr,
        peakMmr=mmr.peak_mmr,
        totalBattles=mmr.total_battles,
        wins=mmr.wins,
        losses=mmr.losses,
        winRate=float(mmr.win_rate),
        vocabularyRating=mmr.vocabulary_rating,
        grammarRating=mmr.grammar_rating,
        speedRating=mmr.speed_rating,
        accuracyRating=mmr.accuracy_rating,
    )


@router.get("/leaderboard/{language}")
async def get_leaderboard(
    *,
    language: str,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """获取排行榜"""
    if language not in ["en", "ja", "fr"]:
        raise HTTPException(status_code=400, detail="Invalid language")

    pk_service = get_pk_battle_service(db)

    leaderboard = await pk_service.get_leaderboard(
        language=language,
        limit=limit,
    )

    return {
        "success": True,
        "data": leaderboard,
    }


@router.get("/stats", response_model=PKStatsResponse)
async def get_pk_stats(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query("en"),
    current_user: User = Depends(get_workspace_user),
):
    """获取 PK 统计"""
    pk_service = get_pk_battle_service(db)

    mmr = await pk_service.get_user_mmr(
        user_id=str(current_user.id),
        language=language,
    )

    if not mmr:
        return PKStatsResponse(
            totalBattles=0,
            wins=0,
            losses=0,
            winRate=0.0,
            currentMmr=1000,
            peakMmr=1000,
            averageScore=0.0,
            bestStreak=0,
        )

    # TODO: 计算平均分数和最佳连胜
    return PKStatsResponse(
        totalBattles=mmr.total_battles,
        wins=mmr.wins,
        losses=mmr.losses,
        winRate=float(mmr.win_rate),
        currentMmr=mmr.current_mmr,
        peakMmr=mmr.peak_mmr,
        averageScore=0.0,
        bestStreak=0,
    )


@router.get("/mmr-history")
async def get_mmr_history(
    *,
    db: AsyncSession = Depends(get_db),
    language: str = Query("en"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_workspace_user),
):
    """获取 MMR 历史"""
    result = await db.execute(
        select(MMRHistory)
        .where(
            MMRHistory.user_id == uuid.UUID(str(current_user.id)),
            MMRHistory.language == language,
        )
        .order_by(MMRHistory.created_at.desc())
        .limit(limit)
    )
    history = list(result.scalars().all())

    return {
        "success": True,
        "data": [
            {
                "id": str(h.id),
                "userId": str(h.user_id),
                "language": h.language,
                "mmrBefore": h.mmr_before,
                "mmrAfter": h.mmr_after,
                "mmrChange": h.mmr_change,
                "isWin": h.is_win,
                "battleId": str(h.battle_id) if h.battle_id else None,
                "createdAt": h.created_at,
            }
            for h in history
        ],
    }
