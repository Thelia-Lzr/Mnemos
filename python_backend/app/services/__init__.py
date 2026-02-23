"""
业务服务模块
"""
from app.services.auth_service import AuthService, get_auth_service
from app.services.user_service import UserService, get_user_service
from app.services.chat_service import ChatService, get_chat_service
from app.services.practice_service import PracticeService, get_practice_service
from app.services.vocabulary_service import VocabularyService, get_vocabulary_service
from app.services.pk_battle_service import PKBattleService, get_pk_battle_service
from app.services.payment_service import PaymentService, get_payment_service
from app.services.daily_recommendation_service import (
    DailyRecommendationService,
    get_daily_recommendation_service,
)
from app.services.openrouter_service import (
    OpenRouterService,
    get_openrouter_service,
)

__all__ = [
    # Auth
    "AuthService",
    "get_auth_service",
    # User
    "UserService",
    "get_user_service",
    # Chat
    "ChatService",
    "get_chat_service",
    # Practice
    "PracticeService",
    "get_practice_service",
    # Vocabulary
    "VocabularyService",
    "get_vocabulary_service",
    # PK
    "PKBattleService",
    "get_pk_battle_service",
    # Payment
    "PaymentService",
    "get_payment_service",
    # Daily Recommendation
    "DailyRecommendationService",
    "get_daily_recommendation_service",
    # OpenRouter
    "OpenRouterService",
    "get_openrouter_service",
]
