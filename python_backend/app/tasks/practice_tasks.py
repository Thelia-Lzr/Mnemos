"""
练习相关 Celery 任务
"""
import logging
from typing import Dict, Any, List

from app.schemas.ai import AIFeature
from app.services.ai_service import call_ai_for_worker
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def generate_practice_group_async(
    self,
    user_id: str,
    language: str,
    difficulty: str,
    skill_areas: List[str],
    question_count: int = 10,
) -> Dict[str, Any]:
    """
    异步生成练习组

    Args:
        user_id: 用户 ID
        language: 目标语言
        difficulty: 难度
        skill_areas: 技能领域
        question_count: 题目数量

    Returns:
        生成的练习组数据
    """
    try:
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Starting generation...'}
        )


        self.update_state(
            state='PROGRESS',
            meta={'current': 30, 'total': 100, 'status': 'Calling AI service...'}
        )

        # 构建提示词
        prompt = f"""生成一个{language}练习组，难度：{difficulty}，技能领域：{', '.join(skill_areas)}，题目数量：{question_count}

请以 JSON 格式返回：
{{
    "title": "练习标题",
    "description": "练习描述",
    "questions": [
        {{
            "type": "multiple_choice",
            "content": "题目内容",
            "options": ["选项 A", "选项 B", "选项 C", "选项 D"],
            "correct_answer": "A",
            "explanation": "解释"
        }}
    ]
}}
"""

        self.update_state(
            state='PROGRESS',
            meta={'current': 70, 'total': 100, 'status': 'Generating questions...'}
        )

        response = call_ai_for_worker(
            AIFeature.EXERCISE_GENERATION,
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
        logger.error(f"Error in generate_practice_group_async: {exc}")
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(bind=True, max_retries=3)
def analyze_practice_result_async(
    self,
    user_id: str,
    practice_result_id: str,
    answers: List[Dict],
    correct_answers: int,
    total_questions: int,
) -> Dict[str, Any]:
    """
    异步分析练习结果

    Args:
        user_id: 用户 ID
        practice_result_id: 练习结果 ID
        answers: 用户答案
        correct_answers: 正确答案数
        total_questions: 总题目数

    Returns:
        分析结果
    """
    try:

        prompt = f"""分析用户的练习结果：
- 总题目数：{total_questions}
- 正确答案数：{correct_answers}
- 正确率：{correct_answers / total_questions * 100:.1f}%

请提供：
1. 学习建议
2. 强项分析
3. 弱点分析
4. 改进建议

以 JSON 格式返回：
{{
    "learning_advice": "学习建议",
    "strengths": ["强项 1", "强项 2"],
    "weaknesses": ["弱点 1", "弱点 2"],
    "improvement_suggestions": ["建议 1", "建议 2"]
}}
"""

        response = call_ai_for_worker(
            AIFeature.PRACTICE_ANALYSIS,
            prompt=prompt,
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in analyze_practice_result_async: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=3)
def generate_vocabulary_practice_async(
    self,
    user_id: str,
    language: str,
    word_ids: List[str],
) -> Dict[str, Any]:
    """
    异步生成词汇练习

    Args:
        user_id: 用户 ID
        language: 目标语言
        word_ids: 词汇 ID 列表

    Returns:
        生成的词汇练习数据
    """
    try:

        prompt = f"""为以下{language}词汇生成练习题：
词汇 ID：{', '.join(word_ids)}

生成多种题型的练习，包括选择题、填空题等。

以 JSON 格式返回：
{{
    "questions": [
        {{
            "type": "multiple_choice",
            "word_id": "词汇 ID",
            "word": "单词",
            "content": "题目",
            "options": [],
            "correct_answer": ""
        }}
    ]
}}
"""

        response = call_ai_for_worker(
            AIFeature.VOCABULARY_PRACTICE,
            prompt=prompt,
        )

        return {
            'success': True,
            'data': response,
        }

    except Exception as exc:
        logger.error(f"Error in generate_vocabulary_practice_async: {exc}")
        raise self.retry(exc=exc, countdown=60)
