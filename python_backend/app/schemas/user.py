"""
用户相关 Pydantic 模式
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Any
from datetime import datetime
import uuid
from enum import Enum


class LanguageLevel(str, Enum):
    """语言等级"""
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class UserRole(str, Enum):
    """用户角色"""
    USER = "user"
    ADMIN = "admin"


class UserResponse(BaseModel):
    """用户响应"""
    id: str
    username: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """用户资料更新"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None


class UserProfileResponse(BaseModel):
    """用户资料响应"""
    id: str
    username: str
    email: EmailStr
    role: UserRole
    created_at: datetime
    last_login_at: Optional[datetime] = None
    preferences: Optional[dict] = None  # 简化：使用dict而不是UserPreferencesResponse
    capabilities: Optional[List[dict]] = None  # 简化：使用dict而不是UserCapabilityResponse
    learning_languages: Optional[List[dict]] = None  # 简化：使用dict而不是UserLearningLanguageResponse
    credits: Optional[int] = 0

    class Config:
        from_attributes = True


class UserPreferencesUpdate(BaseModel):
    """用户偏好更新"""
    theme: Optional[str] = Field(None, pattern="^(light|dark)$")
    notifications_email: Optional[bool] = None
    notifications_push: Optional[bool] = None
    practice_reminders: Optional[bool] = None
    daily_quote_enabled: Optional[bool] = None
    review_reminders: Optional[bool] = None
    milestone_updates: Optional[bool] = None
    pk_invitations: Optional[bool] = None


class UserPreferencesResponse(BaseModel):
    """用户偏好响应"""
    id: str
    theme: str
    notifications_email: bool
    notifications_push: bool
    practice_reminders: bool
    daily_quote_enabled: bool
    review_reminders: bool
    milestone_updates: bool
    pk_invitations: bool

    class Config:
        from_attributes = True


class UserCapabilityCreate(BaseModel):
    """用户能力创建"""
    language: str = Field(..., pattern="^(en|ja|fr)$")
    current_level: LanguageLevel
    learning_goal: LanguageLevel


class UserCapabilityUpdate(BaseModel):
    """用户能力更新"""
    current_level: Optional[LanguageLevel] = None
    learning_goal: Optional[LanguageLevel] = None
    is_active_learning: Optional[bool] = None
    overall_level: Optional[str] = None
    confidence_score: Optional[int] = Field(None, ge=0, le=100)
    listening_level: Optional[int] = Field(None, ge=0, le=100)
    speaking_level: Optional[int] = Field(None, ge=0, le=100)
    reading_level: Optional[int] = Field(None, ge=0, le=100)
    writing_level: Optional[int] = Field(None, ge=0, le=100)


class UserCapabilityResponse(BaseModel):
    """用户能力响应"""
    id: str
    language: str
    current_level: LanguageLevel
    learning_goal: LanguageLevel
    is_active_learning: bool
    overall_level: str
    confidence_score: int
    listening_level: int
    speaking_level: int
    reading_level: int
    writing_level: int
    estimated_vocabulary_size: int
    mastered_words_count: int
    learning_words_count: int
    last_assessed_at: Optional[datetime] = None
    next_assessment_due: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLearningLanguageCreate(BaseModel):
    """用户学习语言创建"""
    language: str = Field(..., pattern="^(en|ja|fr)$")
    current_level: LanguageLevel
    target_level: LanguageLevel
    is_primary: bool = False


class UserLearningLanguageUpdate(BaseModel):
    """用户学习语言更新"""
    current_level: Optional[LanguageLevel] = None
    target_level: Optional[LanguageLevel] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None
    learning_intensity: Optional[str] = None
    daily_goal_minutes: Optional[int] = Field(None, ge=5, le=180)
    difficulty_preference: Optional[str] = None


class UserLearningLanguageResponse(BaseModel):
    """用户学习语言响应"""
    id: str
    language: str
    current_level: LanguageLevel
    target_level: LanguageLevel
    is_primary: bool
    is_active: bool
    learning_intensity: Optional[str]
    daily_goal_minutes: Optional[int]
    weekly_goal_sessions: Optional[int]
    difficulty_preference: str
    visual_learning_enabled: bool
    auditory_learning_enabled: bool
    kinesthetic_learning_enabled: bool

    class Config:
        from_attributes = True


class UserLearningStatusResponse(BaseModel):
    """用户学习状态响应"""
    language: str
    current_level: LanguageLevel
    target_level: LanguageLevel
    progress_percentage: float
    next_review_at: Optional[datetime] = None
    streak_days: int = 0
    total_practice_time: int = 0  # 分钟


# 更新前向引用
UserProfileResponse.update_forward_refs()
UserPreferencesResponse.update_forward_refs()
UserCapabilityResponse.update_forward_refs()
UserLearningLanguageResponse.update_forward_refs()
