"""
每日推荐相关 Celery 任务
"""
from celery import Task
import logging
from typing import Dict, Any
from datetime import date

from app.schemas.ai import AIFeature
from app.services.ai_service import call_ai_for_worker
from app.tasks.celery_app import celery_app
from app.core.database import get_database_session

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """带数据库会话的任务基类"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = next(get_database_session())
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()


@celery_app.task(bind=True, max_retries=3)
def generate_daily_recommendation_async(
    self,
    user_id: str,
    language: str,
    target_date: str = None,
) -> Dict[str, Any]:
    """
    异步生成每日学习推荐

    Args:
        user_id: 用户 ID
        language: 目标语言
        target_date: 目标日期 (YYYY-MM-DD)

    Returns:
        推荐数据
    """
    try:
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Starting recommendation generation...'}
        )


        self.update_state(
            state='PROGRESS',
            meta={'current': 30, 'total': 100, 'status': 'Analyzing user progress...'}
        )

        # TODO: 从数据库获取用户进度和能力

        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Generating recommendations...'}
        )

        # 构建提示词
        prompt = f"""为用户生成{language}每日学习推荐，日期：{target_date or date.today().isoformat()}

推荐应包含：
1. 复习任务（基于遗忘曲线）
2. 新学习内容
3. 练习建议
4. 快速练习选项

以 JSON 格式返回：
{{
    "review_items": [],
    "new_learning": [],
    "practice_suggestions": [],
    "quick_practice_options": [
        {{
            "id": "option_1",
            "title": "快速练习 1",
            "type": "vocabulary",
            "duration_minutes": 5
        }}
    ]
}}
"""

        self.update_state(
            state='PROGRESS',
            meta={'current': 80, 'total': 100, 'status': 'Finalizing recommendations...'}
        )

        response = call_ai_for_worker(
            AIFeature.DAILY_RECOMMENDATION,
            prompt=prompt,
        )

        self.update_state(
            state='PROGRESS',
            meta={'current': 100, 'total': 100, 'status': 'Completed'}
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in generate_daily_recommendation_async: {exc}")
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(bind=True, base=DatabaseTask, max_retries=3)
def apply_daily_decay_async(
    self,
    user_id: str,
    language: str,
) -> Dict[str, Any]:
    """
    异步应用每日遗忘衰减

    Args:
        user_id: 用户 ID
        language: 目标语言

    Returns:
        处理结果
    """
    from sqlalchemy import select, update
    from app.models.vocabulary import VocabularyWord, MasteryLevel
    from datetime import datetime, timedelta
    import uuid

    try:
        self.update_state(
            state='PROGRESS',
            meta={'current': 20, 'total': 100, 'status': 'Fetching vocabulary words...'}
        )

        # 获取用户的所有单词
        result = self.db.execute(
            select(VocabularyWord).where(
                VocabularyWord.user_id == uuid.UUID(user_id),
                VocabularyWord.language == language,
                VocabularyWord.mastery_level != MasteryLevel.MASTERED,
            )
        )
        words = list(result.scalars().all())

        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': f'Processing {len(words)} words...'}
        )

        updated_count = 0
        for word in words:
            # 简单遗忘模型：每天减少掌握度
            if word.mastery_score > 0:
                decay = max(1, int(word.mastery_score * 0.05))  # 每天减少 5%
                word.mastery_score -= decay
                word.mastery_score = max(0, word.mastery_score)

                # 更新掌握等级
                if word.mastery_score < 20:
                    word.mastery_level = MasteryLevel.NEW
                elif word.mastery_score < 40:
                    word.mastery_level = MasteryLevel.LEARNING
                elif word.mastery_score < 60:
                    word.mastery_level = MasteryLevel.SHORT_TERM
                elif word.mastery_score < 80:
                    word.mastery_level = MasteryLevel.LONG_TERM

                # 更新下次复习时间
                if word.next_review_at:
                    word.next_review_at = max(
                        word.next_review_at - timedelta(days=1),
                        datetime.utcnow()
                    )
                else:
                    word.next_review_at = datetime.utcnow()

                updated_count += 1

        self.db.commit()

        self.update_state(
            state='PROGRESS',
            meta={'current': 100, 'total': 100, 'status': 'Completed'}
        )

        logger.info(f"Applied daily decay for user {user_id}, language {language}. Updated {updated_count} words.")

        return {
            'success': True,
            'data': {
                'words_processed': updated_count,
            },
        }

    except Exception as exc:
        logger.error(f"Error in apply_daily_decay_async: {exc}")
        raise self.retry(exc=exc, countdown=60)
