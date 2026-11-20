"""
Mnemos 项目核心配置
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from uuid import UUID


class Settings(BaseSettings):
    """应用配置"""

    # 基础配置
    NODE_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "127.0.0.1"

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

    # 可选的历史资料 ID
    WORKSPACE_USER_ID: UUID | None = None

    # CORS 配置
    CORS_ORIGIN: str = "http://localhost:3000"

    # 文件上传配置
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: List[str] = ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"]

    # 速率限制配置
    RATE_LIMIT_WINDOW_MINUTES: int = 15
    RATE_LIMIT_MAX_REQUESTS: int = 100
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
        origin = self.CORS_ORIGIN or "http://localhost:3000"
        if origin == "http://localhost:3000":
            return [origin, "http://127.0.0.1:3000", "http://[::1]:3000"]
        return [origin]

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
