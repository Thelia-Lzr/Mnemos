"""
练习相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    """难度等级"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class PracticeType(str, Enum):
    """练习类型"""
    VOCABULARY = "vocabulary"
    GRAMMAR = "grammar"
    LISTENING = "listening"
    READING = "reading"
    WRITING = "writing"
    MIXED = "mixed"


class QuestionType(str, Enum):
    """问题类型"""
    MULTIPLE_CHOICE = "multiple_choice"
    FILL_IN_BLANK = "fill_in_blank"
    MATCHING = "matching"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class QuestionResponse(BaseModel):
    """问题响应"""
    id: str
    practiceGroupId: str
    type: str
    content: str
    options: List[str]
    correctAnswer: str
    explanation: Optional[str] = None
    vocabularyWords: Optional[List[str]] = None
    grammarPoints: Optional[List[str]] = None
    difficulty: Optional[int] = None
    orderIndex: int

    class Config:
        from_attributes = True


class PracticeGroupCreate(BaseModel):
    """练习组创建"""
    language: str = Field(..., pattern="^(en|ja|fr)$")
    skillAreas: List[str]
    difficulty: DifficultyLevel
    questionCount: int = Field(..., ge=1, le=50)
    title: Optional[str] = None
    description: Optional[str] = None
    focusAreas: Optional[List[str]] = None


class PracticeGroupResponse(BaseModel):
    """练习组响应"""
    id: str
    userId: str
    title: str
    description: Optional[str]
    language: str
    difficulty: str
    type: str
    estimatedDuration: Optional[int] = None
    focusAreas: Optional[List[str]] = None
    createdAt: datetime
    questions: Optional[List[QuestionResponse]] = None

    class Config:
        from_attributes = True


class PracticeSubmitRequest(BaseModel):
    """提交练习请求"""
    answers: List[Dict[str, Any]] = Field(..., description="答案列表")
    totalTime: Optional[int] = None


class AnswerSubmit(BaseModel):
    """单个答案提交"""
    questionId: str
    userAnswer: str
    timeSpent: Optional[int] = None
    attempts: int = 1


class PracticeResultResponse(BaseModel):
    """练习结果响应"""
    id: str
    userId: str
    practiceGroupId: str
    totalQuestions: int
    correctAnswers: int
    accuracy: float
    totalTime: Optional[int] = None
    averageTimePerQuestion: Optional[float] = None
    weakAreas: Optional[List[str]] = None
    improvedAreas: Optional[List[str]] = None
    recommendedFocus: Optional[List[str]] = None
    completedAt: Optional[datetime] = None

    class Config:
        from_attributes = True


class PracticeAIAnalysisResponse(BaseModel):
    """AI 练习分析响应"""
    id: str
    practiceResultId: str
    analysisContent: str
    learningAdvice: str
    strengthsIdentified: Optional[List[str]] = None
    weaknessesIdentified: Optional[List[str]] = None
    improvementSuggestions: Optional[List[str]] = None
    confidenceScore: Optional[int] = None
    aiModel: Optional[str] = None
    overallProgressDirection: Optional[str] = None
    progressMessage: Optional[str] = None

    class Config:
        from_attributes = True


class PracticeGenerateRequest(BaseModel):
    """练习生成请求"""
    language: str
    difficulty: str
    type: str
    additionalPrompt: Optional[str] = None
    vocabularyWords: Optional[List[str]] = None
    grammarPoints: Optional[List[str]] = None
    count: Optional[int] = Field(None, ge=1, le=50)


class PracticeHistoryResponse(BaseModel):
    """练习历史响应"""
    id: str
    practiceGroupId: str
    practiceGroupTitle: str
    language: str
    accuracy: float
    totalQuestions: int
    correctAnswers: int
    completedAt: datetime


class PracticeFollowupRequest(BaseModel):
    """练习追问请求"""
    questionId: Optional[str] = None
    practiceGroupId: Optional[str] = None
    query: str = Field(..., min_length=1)
    language: str
