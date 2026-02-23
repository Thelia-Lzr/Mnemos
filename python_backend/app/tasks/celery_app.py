"""
Celery 配置
"""
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings


# 创建 Celery 应用
celery_app = Celery(
    'mnemos',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.chat_tasks',
        'app.tasks.practice_tasks',
        'app.tasks.daily_recommendation_tasks',
    ]
)

# 配置 Celery
celery_app.conf.update(
    # 任务序列化
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # 时区
    timezone='UTC',
    enable_utc=True,

    # 任务结果过期时间（秒）
    result_expires=3600,

    # 任务确认
    task_acks_late=True,
    task_reject_on_worker_or_lost=True,

    # 并发数
    worker_concurrency=4,

    # 速率限制
    worker_prefetch_multiplier=1,

    # 任务路由
    task_routes={
        'app.tasks.chat_tasks.*': {'queue': 'chat'},
        'app.tasks.practice_tasks.*': {'queue': 'practice'},
        'app.tasks.daily_recommendation_tasks.*': {'queue': 'recommendations'},
    },

    # 定时任务
    beat_schedule={
        # 每日凌晨清理过期任务
        'cleanup-old-tasks': {
            'task': 'app.tasks.cleanup.cleanup_old_tasks',
            'schedule': crontab(hour=3, minute=0),  # 每天凌晨 3 点
        },
        # 每小时检查Redis
        'health-check': {
            'task': 'app.tasks.cleanup.health_check',
            'schedule': crontab(minute=0),  # 每小时
        },
    },
)


# 自动发现任务
celery_app.autodiscover_tasks(['app'])


@celery_app.task(bind=True)
def debug_task(self):
    """调试任务"""
    print(f'Request: {self.request!r}')
    return 'Debug task completed'
