"""
Mnemos 项目核心配置
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List, Optional
import os


class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    NODE_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "localhost"

    # 数据库配置
    DB_HOST: str = "localhost"
    DB_PORT: int = 5433
    DB_NAME: str = "ai_language_learning"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "password"

    # Redis 配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6380
    REDIS_DB: int = 0

    # JWT 配置
    JWT_SECRET: str = "your_secret_key_here"
    JWT_REFRESH_SECRET: str = "your_refresh_secret_here"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OpenRouter 配置
    OPENROUTER_API_KEY: str = ""
    AI_CREDENTIAL_ENCRYPTION_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_AI_MODEL: str = "openai/gpt-4o"

    # 模型配置（可通过环境变量覆盖）
    CHAT_MODEL: Optional[str] = None
    ANALYSIS_MODEL: Optional[str] = None
    PRACTICE_GENERATION_MODEL: Optional[str] = None
    ASSESSMENT_MODEL: Optional[str] = None
    VOCABULARY_MODEL: Optional[str] = None
    FUNCTION_CALLING_MODEL: Optional[str] = None
    INTENT_RECOGNITION_MODEL: Optional[str] = None

    # CORS 配置
    CORS_ORIGIN: str = "http://localhost:3000"

    # 文件上传配置
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"]

    # 速率限制配置
    RATE_LIMIT_WINDOW_MINUTES: int = 15
    RATE_LIMIT_MAX_REQUESTS: int = 100
    RATE_LIMIT_AUTH_MAX_REQUESTS: int = 20
    RATE_LIMIT_ADMIN_MAX_REQUESTS: int = 50

    # Celery 配置
    CELERY_BROKER_URL: str = "redis://localhost:6380/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6380/0"

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"

    # 监控配置
    ENABLE_PERFORMANCE_MONITORING: bool = True
    SLOW_REQUEST_THRESHOLD_MS: int = 1000

    # 测试模式
    TEST_MODE: bool = False

    @property
    def database_url(self) -> str:
        """获取数据库连接 URL"""
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def redis_url(self) -> str:
        """获取 Redis 连接 URL"""
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def allowed_origins(self) -> List[str]:
        """获取允许的 CORS 来源"""
        if self.CORS_ORIGIN:
            return [self.CORS_ORIGIN]
        return ["http://localhost:3000"]

    @property
    def ai_models(self) -> dict:
        """获取 AI 模型配置"""
        return {
            "chat": self.CHAT_MODEL or self.DEFAULT_AI_MODEL,
            "analysis": self.ANALYSIS_MODEL or self.DEFAULT_AI_MODEL,
            "practice_generation": self.PRACTICE_GENERATION_MODEL or self.DEFAULT_AI_MODEL,
            "assessment": self.ASSESSMENT_MODEL or self.DEFAULT_AI_MODEL,
            "vocabulary": self.VOCABULARY_MODEL or self.DEFAULT_AI_MODEL,
            "function_calling": self.FUNCTION_CALLING_MODEL or self.DEFAULT_AI_MODEL,
            "intent_recognition": self.INTENT_RECOGNITION_MODEL or self.DEFAULT_AI_MODEL,
        }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# 全局配置实例
settings = Settings()


def get_settings() -> Settings:
    """获取配置实例"""
    return settings
