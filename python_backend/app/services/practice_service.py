"""
练习服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import json

from app.models.practice import PracticeGroup, Question, PracticeResult, PracticeAIAnalysis
from app.models.user import User, UserCapability
from app.models.vocabulary import VocabularyWord
from app.services.openrouter_service import OpenRouterService, get_openrouter_service, TaskType


class PracticeService:
    """练习服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.openrouter = get_openrouter_service()

    async def generate_practice_group(
        self,
        user_id: str,
        language: str,
        skill_areas: List[str],
        difficulty: str,
        question_count: int = 10,
        title: Optional[str] = None,
        description: Optional[str] = None,
        focus_areas: Optional[List[str]] = None,
    ) -> PracticeGroup:
        """
        生成练习组

        Args:
            user_id: 用户 ID
            language: 目标语言
            skill_areas: 技能领域列表
            difficulty: 难度
            question_count: 题目数量
            title: 标题
            description: 描述
            focus_areas: 重点领域

        Returns:
            创建的练习组
        """
        # 获取用户能力
        capability = await self._get_user_capability(user_id, language)

        # 构建 AI 提示词
        model = self.openrouter.select_model(TaskType.EXERCISE_GENERATION)

        prompt = self._build_practice_generation_prompt(
            language=language,
            skill_areas=skill_areas,
            difficulty=difficulty,
            question_count=question_count,
            capability=capability,
        )

        # 调用 AI 生成练习
        response = await self.openrouter.call_ai(
            model=model,
            prompt=prompt,
            user_id=user_id,
        )

        # 解析 AI 响应
        try:
            practice_data = json.loads(response["content"])
        except json.JSONDecodeError:
            practice_data = {"questions": []}

        # 创建练习组
        practice_group = PracticeGroup(
            user_id=uuid.UUID(user_id),
            title=title or f"{language} {difficulty} Practice",
            description=description,
            language=language,
            difficulty=difficulty,
            type="ai_generated",
            estimated_duration=question_count * 2,  # 每题约 2 分钟
            focus_areas=focus_areas or skill_areas,
        )
        self.db.add(practice_group)
        await self.db.flush()

        # 创建问题
        questions_data = practice_data.get("questions", [])
        for idx, q_data in enumerate(questions_data[:question_count]):
            question = Question(
                practice_group_id=practice_group.id,
                type=q_data.get("type", "multiple_choice"),
                content=q_data.get("content", ""),
                options=q_data.get("options", []),
                correct_answer=q_data.get("correct_answer", ""),
                explanation=q_data.get("explanation", ""),
                vocabulary_words=q_data.get("vocabulary_words", []),
                grammar_points=q_data.get("grammar_points", []),
                difficulty=q_data.get("difficulty", 5),
                order_index=idx,
            )
            self.db.add(question)

        await self.db.commit()
        await self.db.refresh(practice_group)

        return practice_group

    async def submit_practice(
        self,
        user_id: str,
        practice_group_id: str,
        answers: List[Dict[str, Any]],
        total_time: Optional[int] = None,
    ) -> PracticeResult:
        """
        提交练习答案

        Args:
            user_id: 用户 ID
            practice_group_id: 练习组 ID
            answers: 答案列表
            total_time: 总用时（秒）

        Returns:
            练习结果
        """
        # 获取练习组
        result = await self.db.execute(
            select(PracticeGroup).where(PracticeGroup.id == uuid.UUID(practice_group_id))
        )
        practice_group = result.scalar_one_or_none()

        if not practice_group:
            raise ValueError("Practice group not found")

        # 获取问题
        q_result = await self.db.execute(
            select(Question)
            .where(Question.practice_group_id == practice_group.id)
            .order_by(Question.order_index)
        )
        questions = list(q_result.scalars().all())

        # 计算正确率
        correct_answers = 0
        wrong_answers = []

        for answer in answers:
            question_id = answer.get("questionId")
            user_answer = answer.get("userAnswer")
            time_spent = answer.get("timeSpent", 0)

            # 找到对应问题
            question = next((q for q in questions if str(q.id) == question_id), None)
            if question:
                is_correct = str(user_answer).strip().lower() == str(question.correct_answer).strip().lower()
                if is_correct:
                    correct_answers += 1
                else:
                    wrong_answers.append({
                        "questionId": question_id,
                        "question": question.content,
                        "userAnswer": user_answer,
                        "correctAnswer": question.correct_answer,
                        "explanation": question.explanation,
                    })

        total_questions = len(questions)
        accuracy = (correct_answers / total_questions * 100) if total_questions > 0 else 0

        # 创建练习结果
        practice_result = PracticeResult(
            user_id=uuid.UUID(user_id),
            practice_group_id=practice_group.id,
            answers=answers,
            wrong_answers_summary=wrong_answers,
            total_questions=total_questions,
            correct_answers=correct_answers,
            accuracy=accuracy,
            total_time=total_time,
            completed_at=datetime.utcnow(),
        )
        self.db.add(practice_result)
        await self.db.flush()

        # 计算弱项和改进领域
        weak_areas = self._identify_weak_areas(wrong_answers)
        improved_areas = self._identify_improved_areas(correct_answers, total_questions)

        practice_result.weak_areas = weak_areas
        practice_result.improved_areas = improved_areas
        practice_result.recommended_focus = self._generate_recommendations(
            weak_areas, practice_group.language
        )

        await self.db.commit()
        await self.db.refresh(practice_result)

        return practice_result

    async def analyze_practice(
        self,
        user_id: str,
        practice_result_id: str,
    ) -> PracticeAIAnalysis:
        """
        生成练习 AI 分析

        Args:
            user_id: 用户 ID
            practice_result_id: 练习结果 ID

        Returns:
            AI 分析结果
        """
        # 获取练习结果
        result = await self.db.execute(
            select(PracticeResult).where(PracticeResult.id == uuid.UUID(practice_result_id))
        )
        practice_result = result.scalar_one_or_none()

        if not practice_result:
            raise ValueError("Practice result not found")

        # 构建分析提示词
        model = self.openrouter.select_model(TaskType.EXERCISE_GENERATION)

        prompt = f"""分析用户的练习结果：

- 总题目数：{practice_result.total_questions}
- 正确答案数：{practice_result.correct_answers}
- 正确率：{practice_result.accuracy}%
- 用时：{practice_result.total_time or 0}秒

弱项：{', '.join(practice_result.weak_areas or [])}
错题摘要：{practice_result.wrong_answers_summary}

请提供：
1. 学习建议（具体、可操作）
2. 强项分析
3. 弱点分析
4. 改进建议

以 JSON 格式返回：
{{
    "learning_advice": "",
    "strengths": [],
    "weaknesses": [],
    "improvement_suggestions": [],
    "confidence_score": 0-100,
    "overall_progress_direction": "improved|maintained|declined"
}}
"""

        # 调用 AI
        response = await self.openrouter.call_ai(
            model=model,
            prompt=prompt,
            user_id=user_id,
        )

        # 解析 AI 响应
        try:
            analysis_data = json.loads(response["content"])
        except json.JSONDecodeError:
            analysis_data = {}

        # 创建 AI 分析
        ai_analysis = PracticeAIAnalysis(
            practice_result_id=practice_result.id,
            user_id=uuid.UUID(user_id),
            analysis_content=response["content"],
            learning_advice=analysis_data.get("learning_advice", ""),
            strengths_identified=analysis_data.get("strengths", []),
            weaknesses_identified=analysis_data.get("weaknesses", []),
            improvement_suggestions=analysis_data.get("improvement_suggestions", []),
            confidence_score=analysis_data.get("confidence_score", 50),
            ai_model=response["model"],
            tokens_used=response["tokens_used"],
            overall_progress_direction=analysis_data.get("overall_progress_direction", "maintained"),
            progress_message=analysis_data.get("learning_advice", ""),
        )
        self.db.add(ai_analysis)

        # 更新练习结果
        practice_result.capability_updates = analysis_data.get("capability_changes", [])
        await self.db.commit()
        await self.db.refresh(ai_analysis)

        return ai_analysis

    async def get_practice_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> List[PracticeResult]:
        """
        获取练习历史

        Args:
            user_id: 用户 ID
            limit: 限制数量
            offset: 偏移量

        Returns:
            练习结果列表
        """
        result = await self.db.execute(
            select(PracticeResult)
            .where(PracticeResult.user_id == uuid.UUID(user_id))
            .order_by(PracticeResult.completed_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def delete_practice_group(self, user_id: str, practice_group_id: str) -> bool:
        """
        删除练习组

        Args:
            user_id: 用户 ID
            practice_group_id: 练习组 ID

        Returns:
            是否成功删除
        """
        from sqlalchemy import delete

        result = await self.db.execute(
            delete(PracticeGroup).where(
                PracticeGroup.id == uuid.UUID(practice_group_id),
                PracticeGroup.user_id == uuid.UUID(user_id)
            )
        )
        await self.db.commit()
        return result.rowcount > 0

    async def _get_user_capability(
        self,
        user_id: str,
        language: str,
    ) -> Optional[UserCapability]:
        """获取用户语言能力"""
        result = await self.db.execute(
            select(UserCapability).where(
                UserCapability.user_id == uuid.UUID(user_id),
                UserCapability.language == language,
            )
        )
        return result.scalar_one_or_none()

    def _build_practice_generation_prompt(
        self,
        language: str,
        skill_areas: List[str],
        difficulty: str,
        question_count: int,
        capability: Optional[UserCapability] = None,
    ) -> str:
        """构建练习生成提示词"""
        level_info = ""
        if capability:
            level_info = f"""
用户当前水平：{capability.current_level}
细分能力：
- 听力：{capability.listening_level}/100
- 口语：{capability.speaking_level}/100
- 阅读：{capability.reading_level}/100
- 写作：{capability.writing_level}/100
"""

        return f"""生成{language}练习题目。

难度：{difficulty}
技能领域：{', '.join(skill_areas)}
题目数量：{question_count}
{level_info}
请以 JSON 格式返回，每个问题包含：
- type: multiple_choice|fill_in_blank|true_false|matching
- content: 题目内容
- options: [选项列表]（选择题需要）
- correct_answer: 正确答案
- explanation: 解释
- vocabulary_words: 相关单词
- grammar_points: 相关语法点
- difficulty: 1-10

示例格式：
{{
    "questions": [
        {{
            "type": "multiple_choice",
            "content": "选择正确的单词完成句子：I ___ to school yesterday.",
            "options": ["go", "went", "going", "gone"],
            "correct_answer": "went",
            "explanation": "昨天发生的动作用过去式",
            "vocabulary_words": ["school", "yesterday"],
            "grammar_points": ["past_tense"],
            "difficulty": 5
        }}
    ]
}}
"""

    def _identify_weak_areas(self, wrong_answers: List[Dict]) -> List[str]:
        """识别弱项"""
        areas = []
        # 简单分析错题类型
        for wrong in wrong_answers:
            if "grammar" in str(wrong.get("explanation", "")).lower():
                if "grammar" not in areas:
                    areas.append("grammar")
            if "vocabulary" in str(wrong.get("explanation", "")).lower():
                if "vocabulary" not in areas:
                    areas.append("vocabulary")
        return areas or ["general"]

    def _identify_improved_areas(
        self,
        correct_answers: int,
        total_questions: int,
    ) -> List[str]:
        """识别改进领域"""
        accuracy = correct_answers / total_questions if total_questions > 0 else 0
        if accuracy >= 0.8:
            return ["overall_proficiency"]
        elif accuracy >= 0.6:
            return ["partial_understanding"]
        else:
            return ["needs_more_practice"]

    def _generate_recommendations(
        self,
        weak_areas: List[str],
        language: str,
    ) -> List[str]:
        """生成学习建议"""
        recommendations = []
        for area in weak_areas:
            if area == "grammar":
                recommendations.append(f"加强{language}语法练习")
            elif area == "vocabulary":
                recommendations.append(f"扩展{language}词汇量")
            else:
                recommendations.append(f"继续{language}综合练习")
        return recommendations


def get_practice_service(db: AsyncSession) -> PracticeService:
    """获取练习服务实例"""
    return PracticeService(db)
