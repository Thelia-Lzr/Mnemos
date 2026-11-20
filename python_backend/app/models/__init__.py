"""
SQLAlchemy 模型定义
"""
# 导入所有模型以确保它们被注册到 Base
from app.models.base import Base
from app.models.workspace import WorkspaceSettings
from app.models.user import User, UserPreferences, UserCapability, UserLearningLanguage
from app.models.chat_message import ChatMessage
from app.models.practice import PracticeGroup, Question, PracticeResult, PracticeAIAnalysis
from app.models.vocabulary import VocabularyWord
from app.models.pk import PKBattle, BattleAnswer, UserMMR, MMRHistory, MatchRequest
from app.models.payment import (
    PaymentOrder,
    RechargePackage,
    UserCredit,
    CreditTransaction,
)
from app.models.task import AsyncTask
from app.models.recommendation import DailyLearningRecommendation

__all__ = [
    "Base",
    "WorkspaceSettings",
    "User",
    "UserPreferences",
    "UserCapability",
    "UserLearningLanguage",
    "ChatMessage",
    "PracticeGroup",
    "Question",
    "PracticeResult",
    "PracticeAIAnalysis",
    "VocabularyWord",
    "PKBattle",
    "BattleAnswer",
    "UserMMR",
    "MMRHistory",
    "MatchRequest",
    "PaymentOrder",
    "RechargePackage",
    "UserCredit",
    "CreditTransaction",
    "AsyncTask",
    "DailyLearningRecommendation",
]
