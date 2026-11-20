"""
词汇服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import uuid
import json

from app.schemas.ai import AIFeature
from app.services.ai_service import call_ai
from app.models.vocabulary import VocabularyWord, MasteryLevel
from app.models.user import User


class VocabularyService:
    """词汇服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_words(
        self,
        user_id: str,
        language: Optional[str] = None,
        mastery_level: Optional[MasteryLevel] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[VocabularyWord]:
        """
        获取词汇列表

        Args:
            user_id: 用户 ID
            language: 语言
            mastery_level: 掌握程度
            limit: 限制数量
            offset: 偏移量

        Returns:
            词汇列表
        """
        query = select(VocabularyWord).where(VocabularyWord.user_id == uuid.UUID(user_id))

        if language:
            query = query.where(VocabularyWord.language == language)

        if mastery_level:
            query = query.where(VocabularyWord.mastery_level == mastery_level)

        query = query.order_by(VocabularyWord.created_at.desc()).offset(offset).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def add_words_from_text(
        self,
        user_id: str,
        text: str,
        language: str,
    ) -> List[VocabularyWord]:
        """
        从文本添加单词

        Args:
            user_id: 用户 ID
            text: 文本内容
            language: 目标语言

        Returns:
            添加的单词列表
        """
        # 使用 AI 提取单词

        prompt = f"""从以下{language}文本中提取重要单词和短语：

{text}

对每个单词，提供：
- word: 单词
- definition: 定义（中文）
- part_of_speech: 词性
- pronunciation: 发音（可选）
- example_sentence: 例句

以 JSON 数组格式返回：
[
    {{"word": "", "definition": "", "part_of_speech": "", "pronunciation": "", "example_sentence": ""}}
]
"""

        response = await call_ai(
            self.db, AIFeature.VOCABULARY_EXTRACTION,
            prompt=prompt,
        )

        # 解析 AI 响应
        try:
            words_data = json.loads(response["content"])
        except json.JSONDecodeError:
            words_data = []

        # 添加单词到数据库
        added_words = []
        for word_data in words_data:
            # 检查是否已存在
            existing = await self.db.execute(
                select(VocabularyWord).where(
                    VocabularyWord.user_id == uuid.UUID(user_id),
                    VocabularyWord.word == word_data.get("word", ""),
                    VocabularyWord.language == language,
                )
            )

            if not existing.scalar_one_or_none():
                word = VocabularyWord(
                    user_id=uuid.UUID(user_id),
                    word=word_data.get("word", ""),
                    language=language,
                    mastery_score=0,
                    definition=word_data.get("definition", ""),
                    pronunciation=word_data.get("pronunciation", ""),
                    part_of_speech=word_data.get("part_of_speech", ""),
                )
                self.db.add(word)
                added_words.append(word)

        await self.db.commit()
        for word in added_words:
            await self.db.refresh(word)

        return added_words

    async def add_word(
        self,
        user_id: str,
        word: str,
        language: str,
        definition: Optional[str] = None,
        pronunciation: Optional[str] = None,
        part_of_speech: Optional[str] = None,
    ) -> VocabularyWord:
        """
        添加单个单词

        Args:
            user_id: 用户 ID
            word: 单词
            language: 语言
            definition: 定义
            pronunciation: 发音
            part_of_speech: 词性

        Returns:
            添加的单词
        """
        # 检查是否已存在
        existing = await self.db.execute(
            select(VocabularyWord).where(
                VocabularyWord.user_id == uuid.UUID(user_id),
                VocabularyWord.word == word,
                VocabularyWord.language == language,
            )
        )

        if existing.scalar_one_or_none():
            raise ValueError("Word already exists")

        new_word = VocabularyWord(
            user_id=uuid.UUID(user_id),
            word=word,
            language=language,
            definition=definition,
            pronunciation=pronunciation,
            part_of_speech=part_of_speech,
        )
        self.db.add(new_word)
        await self.db.commit()
        await self.db.refresh(new_word)

        return new_word

    async def delete_word(self, user_id: str, word_id: str) -> bool:
        """
        删除单词

        Args:
            user_id: 用户 ID
            word_id: 单词 ID

        Returns:
            是否成功删除
        """
        from sqlalchemy import delete

        result = await self.db.execute(
            delete(VocabularyWord).where(
                VocabularyWord.id == uuid.UUID(word_id),
                VocabularyWord.user_id == uuid.UUID(user_id),
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def update_mastery(
        self,
        user_id: str,
        word_id: str,
        mastery_level: Optional[MasteryLevel] = None,
        mastery_score: Optional[int] = None,
    ) -> VocabularyWord:
        """
        更新单词掌握程度

        Args:
            user_id: 用户 ID
            word_id: 单词 ID
            mastery_level: 掌握程度
            mastery_score: 掌握分数

        Returns:
            更新后的单词
        """
        result = await self.db.execute(
            select(VocabularyWord).where(
                VocabularyWord.id == uuid.UUID(word_id),
                VocabularyWord.user_id == uuid.UUID(user_id),
            )
        )
        word = result.scalar_one_or_none()

        if not word:
            raise ValueError("Word not found")

        if mastery_level:
            word.mastery_level = mastery_level
        if mastery_score is not None:
            word.mastery_score = mastery_score

        await self.db.commit()
        await self.db.refresh(word)

        return word

    async def get_mastery_stats(
        self,
        user_id: str,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        获取掌握度统计

        Args:
            user_id: 用户 ID
            language: 语言

        Returns:
            统计数据
        """
        query = select(
            VocabularyWord.mastery_level,
            func.count(VocabularyWord.id),
        ).where(VocabularyWord.user_id == uuid.UUID(user_id))

        if language:
            query = query.where(VocabularyWord.language == language)

        query = query.group_by(VocabularyWord.mastery_level)

        result = await self.db.execute(query)
        stats_rows = result.all()

        # 总数统计
        total_query = select(func.count(VocabularyWord.id)).where(
            VocabularyWord.user_id == uuid.UUID(user_id)
        )
        if language:
            total_query = total_query.where(VocabularyWord.language == language)

        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # 平均分统计
        avg_query = select(func.avg(VocabularyWord.mastery_score)).where(
            VocabularyWord.user_id == uuid.UUID(user_id)
        )
        if language:
            avg_query = avg_query.where(VocabularyWord.language == language)

        avg_result = await self.db.execute(avg_query)
        avg_score = avg_result.scalar() or 0

        due = await self.db.scalar(total_query.where(VocabularyWord.next_review_at <= datetime.utcnow()))
        stats = {
            "total": total,
            "due": due or 0,
            "average_score": float(avg_score),
            "by_level": {
                str(level): count
                for level, count in stats_rows
                if level
            },
        }

        return stats

    async def get_words_needing_review(
        self,
        user_id: str,
        language: Optional[str] = None,
        limit: int = 20,
    ) -> List[VocabularyWord]:
        """
        获取需要复习的单词

        Args:
            user_id: 用户 ID
            language: 语言
            limit: 限制数量

        Returns:
            需要复习的单词列表
        """
        now = datetime.utcnow()

        query = select(VocabularyWord).where(
            VocabularyWord.user_id == uuid.UUID(user_id),
            VocabularyWord.next_review_at <= now,
        )

        if language:
            query = query.where(VocabularyWord.language == language)

        query = query.order_by(VocabularyWord.next_review_at.asc()).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def apply_daily_decay(self, user_id: str, language: str) -> int:
        """
        应用每日遗忘衰减

        Args:
            user_id: 用户 ID
            language: 语言

        Returns:
            更新的单词数量
        """
        # 获取所有单词
        result = await self.db.execute(
            select(VocabularyWord).where(
                VocabularyWord.user_id == uuid.UUID(user_id),
                VocabularyWord.language == language,
                VocabularyWord.mastery_level != MasteryLevel.MASTERED,
            )
        )
        words = list(result.scalars().all())

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

                updated_count += 1

        if updated_count > 0:
            await self.db.commit()

        return updated_count

    async def generate_practice(
        self,
        user_id: str,
        language: str,
        word_ids: Optional[List[str]] = None,
        max_words: int = 10,
        focus_on_weak_words: bool = True,
        include_review_words: bool = True,
        mastery_levels: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        生成词汇练习

        Args:
            user_id: 用户 ID
            language: 语言
            word_ids: 单词 ID 列表
            max_words: 最大单词数

        Returns:
            练习题目
        """
        # 获取单词
        query = select(VocabularyWord).where(
            VocabularyWord.user_id == uuid.UUID(user_id),
            VocabularyWord.language == language,
        )

        if word_ids:
            query = query.where(VocabularyWord.id.in_([uuid.UUID(wid) for wid in word_ids]))

        if mastery_levels:
            query = query.where(VocabularyWord.mastery_level.in_(mastery_levels))
        if include_review_words:
            query = query.order_by(VocabularyWord.next_review_at.asc().nulls_last())
        if focus_on_weak_words:
            query = query.order_by(VocabularyWord.mastery_score.asc().nulls_first())
        query = query.order_by(VocabularyWord.id).limit(max_words)
        result = await self.db.execute(query)
        words = list(result.scalars().all())

        if not words:
            return {"questions": [], "words": []}

        # 使用 AI 生成练习

        words_info = "\n".join([
            f"- {w.id} | {w.word}: {w.definition} ({w.part_of_speech})"
            for w in words
        ])

        prompt = f"""为以下{language}单词生成练习题：

{words_info}

为每个单词生成一道选择题。word_id 必须使用列表中该词的 ID，correct_answer 必须与一个选项的文本完全一致。

以 JSON 格式返回：
{{
    "questions": [
        {{
            "type": "multiple_choice",
            "word_id": "单词 ID",
            "word": "单词",
            "content": "题目",
            "options": [],
            "correct_answer": ""
        }}
    ]
}}
"""

        response = await call_ai(
            self.db, AIFeature.VOCABULARY_PRACTICE,
            prompt=prompt,
        )

        try:
            practice_data = json.loads(response["content"])
        except json.JSONDecodeError:
            practice_data = {"questions": []}

        return {"questions": practice_data.get("questions") or [], "words": words}


    async def record_practice(self, user_id: str, results: list) -> None:
        word_ids = {result.wordId for result in results}
        words = await self.db.scalars(
            select(VocabularyWord).where(
                VocabularyWord.id.in_(word_ids), VocabularyWord.user_id == uuid.UUID(user_id),
            ).order_by(VocabularyWord.id).with_for_update()
        )
        by_id = {word.id: word for word in words}
        if by_id.keys() != word_ids:
            raise ValueError("词汇已不存在，请重新开始练习。")
        now = datetime.now(timezone.utc)
        for result in results:
            word = by_id[result.wordId]
            score = result.score if result.score is not None else (100 if result.isCorrect else 0)
            delta = result.masteryDelta if result.masteryDelta is not None else (20 if result.isCorrect else -10)
            mastery = max(0, min(100, (word.mastery_score or 0) + delta))
            level, interval = next(
                (level, days) for minimum, level, days in (
                    (90, "mastered", 14), (70, "long_term", 7), (45, "short_term", 3), (0, "learning", 1)
                ) if mastery >= minimum
            )
            word.mastery_score = mastery
            word.mastery_level = level
            word.review_count = (word.review_count or 0) + 1
            word.last_review_score = score
            word.last_reviewed_at = now
            word.next_review_at = now + timedelta(days=interval if result.isCorrect else 1)
        await self.db.commit()


def get_vocabulary_service(db: AsyncSession) -> VocabularyService:
    """获取词汇服务实例"""
    return VocabularyService(db)
