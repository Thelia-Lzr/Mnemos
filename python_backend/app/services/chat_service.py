"""
聊天服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import json
import uuid

from app.schemas.ai import AIFeature
from app.services.ai_service import call_ai
from app.models.chat_message import ChatMessage, MessageType, ProcessingStatus
from app.models.user import User


class ChatService:
    """聊天服务"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_message(
        self,
        user_id: str,
        content: str,
        language: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> tuple[ChatMessage, ChatMessage]:
        """
        发送聊天消息并获取 AI 响应

        Args:
            user_id: 用户 ID
            content: 消息内容
            language: 目标语言
            context: 上下文信息

        Returns:
            创建的聊天消息
        """
        language_name = {"en": "英语", "ja": "日语", "fr": "法语"}.get(language or "", "英语")
        system_prompt = (
            f"你是语言学习助手。请用{language_name}回答，必要时用中文解释。"
            "纠正语法错误，解释语言知识点并提供学习建议。"
        )
        previous = await self.get_chat_history(user_id, limit=12)
        history = [
            {"role": "user" if item.type == MessageType.USER_TEXT else "assistant", "content": item.content}
            for item in reversed(previous)
            if item.type in (MessageType.USER_TEXT, MessageType.AI_RESPONSE)
        ]

        # 调用 AI
        ai_response = await call_ai(
            self.db, AIFeature.CONVERSATION,
            prompt=content,
            context={
                **(context or {}),
                "system_prompt": system_prompt,
                "history": history,
            },
        )

        user_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content=content,
            type=MessageType.USER_TEXT,
            processing_status=ProcessingStatus.COMPLETED,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(user_message)
        await self.db.flush()

        # 创建 AI 响应消息
        ai_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content=ai_response["content"],
            type=MessageType.AI_RESPONSE,
            processing_status=ProcessingStatus.COMPLETED,
            created_at=datetime.now(timezone.utc),
            ai_response=ai_response,
        )
        self.db.add(ai_message)

        # 更新用户消息状态
        await self.db.commit()
        await self.db.refresh(user_message)
        await self.db.refresh(ai_message)

        return user_message, ai_message

    async def get_chat_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> List[ChatMessage]:
        """
        获取聊天历史

        Args:
            user_id: 用户 ID
            limit: 限制数量
            offset: 偏移量

        Returns:
            聊天消息列表
        """
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.user_id == uuid.UUID(user_id))
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def clear_chat_history(self, user_id: str) -> int:
        """
        清空聊天历史

        Args:
            user_id: 用户 ID

        Returns:
            删除的消息数量
        """
        from sqlalchemy import delete

        result = await self.db.execute(
            delete(ChatMessage).where(ChatMessage.user_id == uuid.UUID(user_id))
        )
        await self.db.commit()
        return result.rowcount

    async def search_messages(
        self,
        user_id: str,
        query: str,
        limit: int = 20,
    ) -> List[ChatMessage]:
        """
        搜索聊天消息

        Args:
            user_id: 用户 ID
            query: 搜索关键词
            limit: 限制数量

        Returns:
            匹配的消息列表
        """
        result = await self.db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.user_id == uuid.UUID(user_id),
                ChatMessage.content.ilike(f"%{query}%")
            )
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def upload_material(
        self,
        user_id: str,
        content: str,
        language: Optional[str] = None,
    ) -> ChatMessage:
        """
        上传学习材料并分析

        Args:
            user_id: 用户 ID
            content: 材料内容
            language: 目标语言

        Returns:
            分析结果
        """

        prompt = f"""分析以下{language or '英语'}学习材料：

1. 提取关键单词和短语（带中文解释）
2. 识别主要语法点
3. 总结主要内容
4. 提供学习建议

材料内容：
{content}

请以 JSON 格式返回：
{{
    "vocabulary": [{{"word": "", "definition": "", "part_of_speech": ""}}],
    "grammar_points": [],
    "summary": "",
    "learning_suggestions": []
}}
"""

        response = await call_ai(
            self.db, AIFeature.MATERIAL_ANALYSIS,
            prompt=prompt,
        )

        analysis = json.loads(response["content"])
        sections = ["### 学习材料分析"]
        if analysis.get("summary"):
            sections.append(analysis["summary"])
        for title, key in (("重点词汇", "vocabulary"), ("语法要点", "grammar_points"), ("学习建议", "learning_suggestions")):
            entries = analysis.get(key) or []
            lines = [
                f'- {entry.get("word", "")} · {entry.get("definition", "")}'
                if isinstance(entry, dict) else f"- {entry}"
                for entry in entries
            ]
            if lines:
                sections.append(f"**{title}**\n" + "\n".join(lines))

        system_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content="\n\n".join(sections),
            type=MessageType.SYSTEM,
            processing_status=ProcessingStatus.COMPLETED,
            ai_response=response,
        )
        self.db.add(system_message)
        await self.db.commit()
        await self.db.refresh(system_message)
        return system_message

    async def parse_intent(
        self,
        user_id: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        解析用户意图

        Args:
            user_id: 用户 ID
            message: 用户消息
            context: 上下文信息

        Returns:
            意图识别结果
        """

        prompt = f"""分析用户的意图，返回 JSON 格式：
{{
    "intent": "意图类型",
    "confidence": 0.0-1.0,
    "parameters": {{}},
    "isPrivacySensitive": false,
    "requiresConfirmation": false
}}

可能的意图类型：
- language_learning: 学习对话
- generate_practice: 生成练习
- check_progress: 查看进度
- view_statistics: 查看统计
- view_practice_history: 查看练习历史
- account_management: 账户管理（隐私敏感）

用户消息：{message}
"""

        response = await call_ai(
            self.db, AIFeature.INTENT_RECOGNITION, prompt=prompt, context=context,
        )
        return json.loads(response["content"])


def get_chat_service(db: AsyncSession) -> ChatService:
    """获取聊天服务实例"""
    return ChatService(db)
