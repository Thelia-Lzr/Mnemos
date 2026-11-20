"""
每日推荐服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta
import uuid
import json

from app.schemas.ai import AIFeature
from app.services.ai_service import AIUnavailable, call_ai
from app.models.recommendation import DailyLearningRecommendation
from app.models.user import User, UserCapability
from app.models.vocabulary import VocabularyWord


class DailyRecommendationService:
    """每日推荐服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_today_recommendation(
        self,
        user_id: str,
        language: str,
    ) -> Optional[DailyLearningRecommendation]:
        """
        获取今日推荐

        Args:
            user_id: 用户 ID
            language: 语言

        Returns:
            今日推荐
        """
        today = date.today()

        result = await self.db.execute(
            select(DailyLearningRecommendation).where(
                DailyLearningRecommendation.user_id == uuid.UUID(user_id),
                DailyLearningRecommendation.language == language,
                DailyLearningRecommendation.date == today,
            )
        )
        return result.scalar_one_or_none()

    async def get_recommendation_by_date(
        self,
        user_id: str,
        language: str,
        target_date: date,
    ) -> Optional[DailyLearningRecommendation]:
        """获取指定日期的推荐"""
        result = await self.db.execute(
            select(DailyLearningRecommendation).where(
                DailyLearningRecommendation.user_id == uuid.UUID(user_id),
                DailyLearningRecommendation.language == language,
                DailyLearningRecommendation.date == target_date,
            )
        )
        return result.scalar_one_or_none()

    async def generate_recommendation(
        self,
        user_id: str,
        language: str,
        target_date: Optional[date] = None,
        regenerate: bool = False,
    ) -> DailyLearningRecommendation:
        """
        生成每日推荐

        Args:
            user_id: 用户 ID
            language: 语言
            target_date: 目标日期

        Returns:
            生成的推荐
        """
        target = target_date or date.today()

        # 检查是否已存在
        existing = await self.get_recommendation_by_date(user_id, language, target)
        if existing and not regenerate:
            return existing

        # 获取用户数据
        capability = await self._get_user_capability(user_id, language)
        review_words = await self._get_review_words(user_id, language)

        # 使用 AI 生成推荐

        prompt = self._build_recommendation_prompt(
            language=language,
            capability=capability,
            review_words=review_words,
            date=target,
        )

        try:
            response = await call_ai(
                self.db, AIFeature.DAILY_RECOMMENDATION,
                prompt=prompt,
            )

            recommendation_data = json.loads(response["content"])
            if not isinstance(recommendation_data, dict):
                raise ValueError("Invalid recommendation response")
        except (AIUnavailable, ValueError):
            recommendation_data = self._build_fallback_recommendation(
                review_words=review_words,
                level=capability.current_level if capability else "A1",
            )

        recommendation_data.pop("feedback_followed_ids", None)
        quick_options = recommendation_data.get("quick_practice_options") or []
        if existing:
            existing.recommendation_data = {
                **recommendation_data,
                "feedback_followed_ids": (existing.recommendation_data or {}).get("feedback_followed_ids", []),
            }
            existing.quick_practice_options = quick_options
        else:
            await self.db.execute(
                insert(DailyLearningRecommendation).values(
                    user_id=uuid.UUID(user_id), language=language, date=target,
                    recommendation_data=recommendation_data, quick_practice_options=quick_options,
                ).on_conflict_do_nothing(index_elements=["user_id", "language", "date"])
            )
        await self.db.commit()
        return await self.get_recommendation_by_date(user_id, language, target)

    async def mark_as_viewed(
        self,
        user_id: str,
        language: str,
        target_date: Optional[date] = None,
    ) -> DailyLearningRecommendation:
        """标记为已查看"""
        target = target_date or date.today()

        recommendation = await self.get_recommendation_by_date(user_id, language, target)
        if not recommendation:
            recommendation = await self.generate_recommendation(user_id, language, target)

        recommendation.is_viewed = True
        recommendation.viewed_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(recommendation)

        return recommendation

    async def submit_feedback(
        self,
        user_id: str,
        language: str,
        rating: int,
        is_helpful: bool,
        comments: Optional[str] = None,
        target_date: Optional[date] = None,
    ) -> DailyLearningRecommendation:
        """提交反馈"""
        target = target_date or date.today()

        recommendation = await self.get_recommendation_by_date(user_id, language, target)
        if not recommendation:
            raise ValueError("Recommendation not found")

        recommendation.feedback_rating = rating
        recommendation.feedback_is_helpful = is_helpful
        if comments:
            recommendation.recommendation_data["feedback_comments"] = comments

        await self.db.commit()
        await self.db.refresh(recommendation)

        return recommendation

    async def get_recommendation_history(
        self,
        user_id: str,
        language: str,
        limit: int = 30,
    ) -> List[DailyLearningRecommendation]:
        """获取推荐历史"""
        result = await self.db.execute(
            select(DailyLearningRecommendation)
            .where(
                DailyLearningRecommendation.user_id == uuid.UUID(user_id),
                DailyLearningRecommendation.language == language,
            )
            .order_by(DailyLearningRecommendation.date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def _get_user_capability(
        self,
        user_id: str,
        language: str,
    ) -> Optional[UserCapability]:
        """获取用户能力"""
        result = await self.db.execute(
            select(UserCapability).where(
                UserCapability.user_id == uuid.UUID(user_id),
                UserCapability.language == language,
            )
        )
        return result.scalar_one_or_none()

    async def _get_review_words(
        self,
        user_id: str,
        language: str,
        limit: int = 20,
    ) -> List[VocabularyWord]:
        """获取需要复习的单词"""
        from sqlalchemy import and_

        now = datetime.utcnow()
        result = await self.db.execute(
            select(VocabularyWord).where(
                VocabularyWord.user_id == uuid.UUID(user_id),
                VocabularyWord.language == language,
                VocabularyWord.next_review_at <= now,
            )
            .order_by(VocabularyWord.next_review_at)
            .limit(limit)
        )
        return list(result.scalars().all())

    def _build_recommendation_prompt(
        self,
        language: str,
        capability: Optional[UserCapability],
        review_words: List[VocabularyWord],
        date: date,
    ) -> str:
        """构建推荐生成提示词"""
        level_info = f"用户水平：{capability.current_level}" if capability else ""
        review_info = f"需要复习的单词：{len(review_words)}个" if review_words else ""

        return f"""为{language}学习者生成{date.isoformat()}的每日学习推荐。

{level_info}
{review_info}

推荐应包含：
1. 复习任务（基于遗忘曲线）
2. 新学习内容建议
3. 练习建议
4. 快速练习选项（3-5 个，每个 5-10 分钟）

以 JSON 格式返回：
{{
    "review_items": [
        {{"type": "vocabulary", "count": 10, "description": "复习单词"}}
    ],
    "new_learning": [
        {{"type": "grammar", "topic": "时态", "estimated_time": 15}}
    ],
    "practice_suggestions": ["建议 1", "建议 2"],
    "quick_practice_options": [
        {{
            "id": "option_1",
            "title": "快速词汇练习",
            "type": "vocabulary",
            "duration_minutes": 5,
            "description": "复习 10 个单词"
        }},
        {{
            "id": "option_2",
            "title": "语法小测验",
            "type": "grammar",
            "duration_minutes": 10,
            "description": "10 道语法选择题"
        }}
    ]
}}
"""

    def _build_fallback_recommendation(
        self,
        review_words: List[VocabularyWord],
        level: str,
    ) -> Dict[str, Any]:
        review_count = min(max(len(review_words), 5), 20)

        return {
            "review_items": [
                {"type": "vocabulary", "count": review_count, "description": "复习高频词汇"}
            ],
            "new_learning": [
                {"type": "grammar", "topic": f"{level} 级语法巩固", "estimated_time": 15}
            ],
            "practice_suggestions": [
                "完成 1 组词汇回顾",
                "完成 1 组语法练习",
            ],
            "quick_practice_options": [
                {
                    "id": "fallback_vocab",
                    "title": "快速词汇练习",
                    "type": "vocabulary",
                    "duration_minutes": 5,
                    "description": "复习词汇与拼写",
                },
                {
                    "id": "fallback_grammar",
                    "title": "语法小测",
                    "type": "grammar",
                    "duration_minutes": 10,
                    "description": "巩固核心语法点",
                },
            ],
        }


def get_daily_recommendation_service(db: AsyncSession) -> DailyRecommendationService:
    """获取每日推荐服务实例"""
    return DailyRecommendationService(db)
