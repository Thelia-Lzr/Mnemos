"""
聊天相关 Celery 任务
"""
import logging
from typing import Dict, Any

from app.schemas.ai import AIFeature
from app.services.ai_service import call_ai_for_worker
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def send_message_async(self, user_id: str, content: str, language: str = None) -> Dict[str, Any]:
    """
    异步发送聊天消息

    Args:
        user_id: 用户 ID
        content: 消息内容
        language: 目标语言

    Returns:
        AI 响应数据
    """
    try:
        # 更新任务状态
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Processing message...'}
        )

        # 调用 AI 服务

        # 构建提示词
        prompt = f"""你是一个语言学习助手。请用{language or '英语'}与用户对话。

用户消息：{content}

请提供友好、有帮助的回答，并适当纠正用户的语法错误。"""

        self.update_state(
            state='PROGRESS',
            meta={'current': 50, 'total': 100, 'status': 'Calling AI service...'}
        )

        # 调用 AI
        response = call_ai_for_worker(
            AIFeature.CONVERSATION,
            prompt=prompt,
        )

        self.update_state(
            state='PROGRESS',
            meta={'current': 90, 'total': 100, 'status': 'Saving response...'}
        )

        # TODO: 保存消息到数据库

        self.update_state(
            state='PROGRESS',
            meta={'current': 100, 'total': 100, 'status': 'Completed'}
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in send_message_async: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def analyze_material_async(self, user_id: str, content: str, language: str = None) -> Dict[str, Any]:
    """
    异步分析学习材料

    Args:
        user_id: 用户 ID
        content: 材料内容
        language: 目标语言

    Returns:
        分析结果
    """
    try:

        prompt = f"""分析以下{language or '英语'}学习材料，提取：
1. 关键单词和短语
2. 语法点
3. 主要内容总结

以 JSON 对象返回词汇、语法点和总结。

材料内容：
{content}
"""

        response = call_ai_for_worker(
            AIFeature.MATERIAL_ANALYSIS,
            prompt=prompt,
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in analyze_material_async: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def parse_intent_async(self, user_id: str, message: str, context: dict = None) -> Dict[str, Any]:
    """
    异步解析用户意图

    Args:
        user_id: 用户 ID
        message: 用户消息
        context: 上下文信息

    Returns:
        意图识别结果
    """
    try:

        prompt = f"""分析用户的意图，返回 JSON 格式：
{{
    "intent": "意图类型",
    "confidence": 0.0-1.0,
    "parameters": {{}},
    "isPrivacySensitive": false,
    "requiresConfirmation": false
}}

用户消息：{message}

可能的意图类型：
- language_learning: 学习对话
- generate_practice: 生成练习
- check_progress: 查看进度
- view_statistics: 查看统计
- account_management: 账户管理（隐私敏感）
"""

        response = call_ai_for_worker(
            AIFeature.INTENT_RECOGNITION,
            prompt=prompt,
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in parse_intent_async: {exc}")
        raise self.retry(exc=exc, countdown=60)
