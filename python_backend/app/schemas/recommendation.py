"""
每日推荐相关 Pydantic 模式
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class RecommendationType(str, Enum):
    """推荐类型"""
    PRACTICE = "practice"
    VOCABULARY = "vocabulary"
    REVIEW = "review"
    ASSESSMENT = "assessment"
    MILESTONE = "milestone"


class DailyRecommendationResponse(BaseModel):
    """每日推荐响应"""
    id: str
    userId: str
    language: str
    date: date
    recommendationData: Dict[str, Any]
    isViewed: bool
    viewedAt: Optional[datetime] = None
    feedbackRating: Optional[int] = None
    feedbackIsHelpful: Optional[bool] = None
    quickPracticeOptions: Optional[List[dict]] = None

    class Config:
        from_attributes = True


class RecommendationFeedbackRequest(BaseModel):
    """推荐反馈请求"""
    rating: int = Field(..., ge=1, le=5)
    isHelpful: bool
    comments: Optional[str] = None
    followedRecommendations: Optional[List[str]] = None


class QuickPracticeRequest(BaseModel):
    """快速练习请求"""
    practiceOptionId: str


class RecommendationGenerateRequest(BaseModel):
    """推荐生成请求"""
    language: str
    includeCapabilityData: bool = True
    includeMilestones: bool = True
    includeVocabulary: bool = True


class RecommendationHistoryResponse(BaseModel):
    """推荐历史响应"""
    success: bool
    data: List[DailyRecommendationResponse]
    pagination: dict
