"""
PK 对战相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class PKBattleStatus(str, Enum):
    """PK 对战状态"""
    WAITING = "waiting"
    GENERATING_PRACTICE = "generating_practice"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class PKMatchRequest(BaseModel):
    """PK 匹配请求"""
    language: str = Field(..., pattern="^(en|ja|fr)$")
    level: Optional[str] = None


class PKBattleResponse(BaseModel):
    """PK 对战响应"""
    id: str
    player1Id: str
    player2Id: str
    language: str
    practiceGroupId: Optional[str] = None
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    player1Score: int
    player2Score: int
    player1Time: Optional[int] = None
    player2Time: Optional[int] = None
    winnerId: Optional[str] = None
    player1MmrChange: int
    player2MmrChange: int
    status: PKBattleStatus

    class Config:
        from_attributes = True


class PKSubmitAnswerRequest(BaseModel):
    """提交 PK 答案请求"""
    battleId: str
    questionIndex: int
    answer: str


class PKBattleAnswerResponse(BaseModel):
    """PK 对战答案响应"""
    id: str
    battleId: str
    userId: str
    questionIndex: int
    answer: str
    isCorrect: bool
    timeTaken: int


class UserMMRResponse(BaseModel):
    """用户 MMR 响应"""
    id: str
    userId: str
    language: str
    currentMmr: int
    peakMmr: int
    totalBattles: int
    wins: int
    losses: int
    winRate: float
    vocabularyRating: int
    grammarRating: int
    speedRating: int
    accuracyRating: int

    class Config:
        from_attributes = True


class MMRHistoryEntry(BaseModel):
    """MMR 历史记录"""
    id: str
    userId: str
    language: str
    mmrBefore: int
    mmrAfter: int
    mmrChange: int
    isWin: bool
    battleId: Optional[str] = None
    createdAt: datetime


class PKLeaderboardEntry(BaseModel):
    """PK 排行榜条目"""
    rank: int
    userId: str
    username: str
    language: str
    currentMmr: int
    totalBattles: int
    wins: int
    winRate: float


class PKMatchStatusResponse(BaseModel):
    """PK 匹配状态响应"""
    isMatching: bool
    requestId: Optional[str] = None
    language: str
    estimatedWaitTime: Optional[int] = None  # 秒


class PKStatsResponse(BaseModel):
    """PK 统计响应"""
    totalBattles: int
    wins: int
    losses: int
    winRate: float
    currentMmr: int
    peakMmr: int
    averageScore: float
    bestStreak: int
