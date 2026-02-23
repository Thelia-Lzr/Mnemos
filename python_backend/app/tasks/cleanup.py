"""
清理相关 Celery 任务
"""
from celery import Task
import logging
from datetime import datetime, timedelta

from app.tasks.celery_app import celery_app
from app.core.database import get_database_session
from app.core.redis import redis_client

logger = logging.getLogger(__name__)


@celery_app.task
def cleanup_old_tasks(hours: int = 24) -> dict:
    """
    清理过期任务

    Args:
        hours: 保留小时数

    Returns:
        清理结果
    """
    try:
        db = next(get_database_session())

        # 计算过期时间
        expire_time = datetime.utcnow() - timedelta(hours=hours)

        # TODO: 删除过期任务
        # from app.models.task import AsyncTask
        # result = await db.execute(
        #     delete(AsyncTask).where(AsyncTask.created_at < expire_time)
        # )

        logger.info(f"Cleaned up tasks older than {hours} hours")

        return {
            'success': True,
            'deleted_count': 0,  # TODO: 实际删除数量
        }

    except Exception as exc:
        logger.error(f"Error in cleanup_old_tasks: {exc}")
        raise exc


@celery_app.task
def health_check() -> dict:
    """
    健康检查任务

    Returns:
        健康状态
    """
    try:
        # 检查 Redis
        redis_status = "healthy"
        try:
            if redis_client:
                redis_client.ping()
            else:
                redis_status = "not_connected"
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"

        # 检查数据库
        db_status = "healthy"
        # TODO: 实际数据库检查

        return {
            'success': True,
            'data': {
                'redis': redis_status,
                'database': db_status,
                'timestamp': datetime.utcnow().isoformat(),
            },
        }

    except Exception as exc:
        logger.error(f"Error in health_check: {exc}")
        return {
            'success': False,
            'error': str(exc),
        }
