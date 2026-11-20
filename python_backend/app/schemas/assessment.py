"""
评估相关 Pydantic 模式
"""
from pydantic import BaseModel, Field, StrictInt
from typing import Literal, Optional
from uuid import UUID
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


class UserCapabilityResponse(BaseModel):
    """用户能力响应"""
    id: str
    language: str
    currentLevel: Optional[LanguageLevel] = None
    learningGoal: Optional[LanguageLevel] = None
    isActiveLearning: bool
    overallLevel: Optional[str] = None
    confidenceScore: Optional[int] = None
    listeningLevel: Optional[int] = None
    speakingLevel: Optional[int] = None
    readingLevel: Optional[int] = None
    writingLevel: Optional[int] = None
    estimatedVocabularySize: Optional[int] = None
    masteredWordsCount: Optional[int] = None
    learningWordsCount: Optional[int] = None
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


AssessmentLanguage = Literal["en", "ja", "fr"]
AssessmentBand = Literal["beginner", "intermediate", "advanced"]
AssessmentSource = Literal["practice", "self_test"]


class AssessmentRequest(BaseModel):
    language: AssessmentLanguage


class AssessmentSubmitRequest(BaseModel):
    answers: dict[str, StrictInt] = Field(min_length=1, max_length=30)


class AssessmentBandScore(BaseModel):
    band: AssessmentBand
    correct: int
    total: int


class AssessmentPracticeEvidence(AssessmentBandScore):
    resultId: UUID
    title: str
    completedAt: datetime


class AssessmentQuestion(BaseModel):
    id: str
    band: AssessmentBand
    prompt: str
    options: list[str]


class AssessmentAnswer(AssessmentQuestion):
    selectedIndex: int
    correctIndex: int
    explanation: str


class AssessmentScores(BaseModel):
    band: AssessmentBand | None
    correct: int
    total: int
    minimumQuestions: int
    passingPercent: int
    bands: list[AssessmentBandScore]
    practice: list[AssessmentPracticeEvidence] = Field(default_factory=list)
    answers: list[AssessmentAnswer] = Field(default_factory=list)


class AssessmentReport(AssessmentScores):
    id: UUID
    language: AssessmentLanguage
    source: AssessmentSource
    completedAt: datetime


class AssessmentSession(BaseModel):
    id: UUID
    language: AssessmentLanguage
    questions: list[AssessmentQuestion]
    report: AssessmentReport | None


class AssessmentHistoryResponse(BaseModel):
    success: bool = True
    data: list[AssessmentReport]
