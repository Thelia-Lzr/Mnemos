"""
评估相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class LanguageLevel(str, Enum):
    """语言等级"""
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class AssessmentType(str, Enum):
    """评估类型"""
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    COMPREHENSIVE = "comprehensive"


class UserCapabilityResponse(BaseModel):
    """用户能力响应"""
    id: str
    language: str
    currentLevel: LanguageLevel
    learningGoal: LanguageLevel
    isActiveLearning: bool
    overallLevel: str
    confidenceScore: int
    listeningLevel: int
    speakingLevel: int
    readingLevel: int
    writingLevel: int
    estimatedVocabularySize: int
    masteredWordsCount: int
    learningWordsCount: int
    lastAssessedAt: Optional[datetime] = None
    nextAssessmentDue: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCapabilityCreate(BaseModel):
    """用户能力创建"""
    language: str = Field(..., pattern="^(en|ja|fr)$")
    currentLevel: LanguageLevel
    learningGoal: LanguageLevel


class UserCapabilityUpdate(BaseModel):
    """用户能力更新"""
    currentLevel: Optional[LanguageLevel] = None
    learningGoal: Optional[LanguageLevel] = None
    isActiveLearning: Optional[bool] = None


class ComprehensiveAssessmentRequest(BaseModel):
    """综合评估请求"""
    language: str
    assessmentType: Optional[AssessmentType] = AssessmentType.COMPREHENSIVE
    dataSource: Optional[str] = None
    includeRecommendations: bool = True


class AssessmentResult(BaseModel):
    """评估结果"""
    overallLevel: LanguageLevel
    confidenceScore: int
    listeningLevel: int
    speakingLevel: int
    readingLevel: int
    writingLevel: int
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]


class ReassessmentRequest(BaseModel):
    """再评估请求"""
    language: str
    reason: str
    focusAreas: Optional[List[str]] = None


class ReassessmentResponse(BaseModel):
    """再评估响应"""
    reassessmentId: str
    language: str
    status: str
    questions: List[dict]
    expiresAt: datetime


class ReassessmentSubmitRequest(BaseModel):
    """再评估提交请求"""
    reassessmentId: str
    responses: List[dict]


class AssessmentHistoryEntry(BaseModel):
    """评估历史条目"""
    id: str
    language: str
    assessmentType: str
    resultLevel: LanguageLevel
    completedAt: datetime
