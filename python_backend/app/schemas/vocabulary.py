"""
词汇相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class MasteryLevel(str, Enum):
    """掌握程度"""
    NEW = "new"
    LEARNING = "learning"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    MASTERED = "mastered"


class VocabularyWordCreate(BaseModel):
    """词汇创建"""
    word: str = Field(..., min_length=1, max_length=255)
    language: str = Field(..., pattern="^(en|ja|fr)$")
    definition: Optional[str] = None
    pronunciation: Optional[str] = None
    part_of_speech: Optional[str] = None


class VocabularyWordUpdate(BaseModel):
    """词汇更新"""
    definition: Optional[str] = None
    pronunciation: Optional[str] = None
    part_of_speech: Optional[str] = None
    mastery_level: Optional[MasteryLevel] = None
    mastery_score: Optional[int] = Field(None, ge=0, le=100)


class VocabularyWordResponse(BaseModel):
    """词汇响应"""
    id: str
    userId: str
    word: str
    language: str
    definition: Optional[str]
    pronunciation: Optional[str]
    part_of_speech: Optional[str]
    difficulty: Optional[int]
    frequency: int
    mastery_level: MasteryLevel
    mastery_score: int
    lastReviewedAt: Optional[datetime] = None
    nextReviewAt: Optional[datetime] = None
    reviewCount: int
    addedAt: Optional[datetime] = None
    lastReviewScore: int = 0

    class Config:
        from_attributes = True


class VocabularyWordListResponse(BaseModel):
    """词汇列表响应"""
    success: bool
    data: List[VocabularyWordResponse]
    pagination: dict


class MasteryStatsResponse(BaseModel):
    """掌握度统计响应"""
    language: str
    totalWords: int
    newWords: int
    learningWords: int
    shortTermWords: int
    longTermWords: int
    masteredWords: int
    averageMasteryScore: float
    wordsNeedingReview: int


class VocabularyPracticeRequest(BaseModel):
    """词汇练习请求"""
    language: str
    wordIds: Optional[List[str]] = None
    masteryLevels: Optional[List[MasteryLevel]] = None
    maxWords: int = Field(10, ge=1, le=50)
    focusOnWeakWords: bool = True
    includeReviewWords: bool = True


class VocabularyPracticeResult(BaseModel):
    """词汇练习结果"""
    wordId: UUID
    word: Optional[str] = None
    userAnswer: Optional[str] = None
    correctAnswer: Optional[str] = None
    isCorrect: bool
    responseTime: int  # 毫秒
    masteryDelta: Optional[int] = Field(None, ge=-100, le=100)
    score: Optional[int] = Field(None, ge=0, le=100)


class VocabularySubmitPracticeRequest(BaseModel):
    """提交词汇练习请求"""
    results: List[VocabularyPracticeResult]


class ForgettingCurveMetrics(BaseModel):
    """遗忘曲线指标"""
    language: str
    averageRetentionRate: float
    wordsByRetentionRange: Dict[str, int]
    optimalReviewTimes: List[datetime]


class LearningEfficiencyMetrics(BaseModel):
    """学习效率指标"""
    language: str
    wordsLearned: int
    averageTimePerWord: float
    retentionRate: float
    efficiencyScore: float
