"""
API 路由模块
"""
from app.api.routes.users import router as users_router
from app.api.routes.chat import router as chat_router
from app.api.routes.practice import router as practice_router
from app.api.routes.vocabulary import router as vocabulary_router
from app.api.routes.pk import router as pk_router
from app.api.routes.assessment import router as assessment_router
from app.api.routes.daily_recommendations import router as daily_recommendations_router
from app.api.routes.tasks import router as tasks_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.admin import router as admin_router
from app.api.routes.user_languages import router as user_languages_router

__all__ = [
    "users_router",
    "chat_router",
    "practice_router",
    "vocabulary_router",
    "pk_router",
    "assessment_router",
    "daily_recommendations_router",
    "tasks_router",
    "monitoring_router",
    "admin_router",
    "user_languages_router",
]
