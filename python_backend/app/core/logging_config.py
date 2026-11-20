"""
日志配置
"""
import logging
import sys
from typing import Optional
from pathlib import Path

from loguru import logger

from app.core.config import settings


def setup_logging() -> None:
    """配置日志系统"""

    # 移除默认的 handler
    logger.remove()

    # 控制台输出
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format=settings.LOG_FORMAT,
        colorize=True,
    )

    # 文件日志 - 所有日志
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger.add(
        log_dir / "app.log",
        level="DEBUG",
        format=settings.LOG_FORMAT,
        rotation="100 MB",
        retention="7 days",
        compression="zip",
        enqueue=True,  # 异步写入
    )

    # 错误日志
    logger.add(
        log_dir / "error.log",
        level="ERROR",
        format=settings.LOG_FORMAT,
        rotation="100 MB",
        retention="30 days",
        compression="zip",
        enqueue=True,
    )

    # HTTP 访问日志
    logger.add(
        log_dir / "access.log",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {message}",
        rotation="100 MB",
        retention="7 days",
        compression="zip",
        enqueue=True,
    )

    logger.info("Logging system initialized")


def get_logger(name: str = __name__) -> logger:
    """获取日志记录器"""
    return logger.bind(name=name)


class HealthCheckFilter(logging.Filter):
    """过滤健康检查请求的日志"""

    def filter(self, record: logging.LogRecord) -> bool:
        # 如果是健康检查请求且是 INFO 级别，降低其日志级别
        if record.levelno == logging.INFO and "/health" in str(record.getMessage()):
            record.levelno = logging.DEBUG
            record.levelname = "DEBUG"
        return True


# 安全日志记录器（用于记录敏感操作）
security_logger = logger.bind(type="security")


def log_security_event(
    event: str,
    user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    details: Optional[dict] = None,
    success: bool = True,
) -> None:
    """
    记录安全事件

    Args:
        event: 事件类型
        user_id: 用户 ID
        ip_address: IP 地址
        details: 详细信息
        success: 是否成功
    """
    log_data = {
        "event": event,
        "user_id": user_id,
        "ip_address": ip_address,
        "success": success,
    }
    if details:
        log_data["details"] = details

    if success:
        security_logger.info(f"Security event: {log_data}")
    else:
        security_logger.warning(f"Security event: {log_data}")


def log_suspicious_activity(
    activity_type: str,
    ip_address: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """记录可疑活动"""
    log_security_event(
        event="suspicious_activity",
        ip_address=ip_address,
        details={"type": activity_type, **(details or {})},
        success=False,
    )
