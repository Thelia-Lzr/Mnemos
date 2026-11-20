"""
聊天服务
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List, Dict, Any
from datetime import datetime
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
    ) -> ChatMessage:
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
        # 创建用户消息
        user_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content=content,
            type=MessageType.USER_TEXT,
            processing_status=ProcessingStatus.PROCESSING,
        )
        self.db.add(user_message)
        await self.db.flush()

        # 构建 AI 请求
        system_prompt = f"""你是一个专业的{language or '英语'}语言学习助手。
你的职责：
1. 与用户进行友好对话
2. 纠正用户的语法错误
3. 解释语言知识点
4. 提供学习建议

请用{language or '英语'}回答，但可以适当使用中文解释复杂概念。"""

        # 调用 AI
        ai_response = await call_ai(
            self.db, AIFeature.CONVERSATION,
            prompt=content,
            context={
                "system_prompt": system_prompt,
                **(context or {})
            },
        )

        # 创建 AI 响应消息
        ai_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content=ai_response["content"],
            type=MessageType.AI_RESPONSE,
            processing_status=ProcessingStatus.COMPLETED,
            ai_response=ai_response,
        )
        self.db.add(ai_message)

        # 更新用户消息状态
        user_message.processing_status = ProcessingStatus.COMPLETED
        await self.db.commit()
        await self.db.refresh(ai_message)

        return ai_message

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
            .order_by(ChatMessage.created_at.desc())
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
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def upload_material(
        self,
        user_id: str,
        content: str,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
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

        # 创建系统消息记录
        system_message = ChatMessage(
            user_id=uuid.UUID(user_id),
            content=f"分析学习材料：{content[:100]}...",
            type=MessageType.SYSTEM,
            processing_status=ProcessingStatus.COMPLETED,
            ai_response=response,
        )
        self.db.add(system_message)
        await self.db.commit()

        return response

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
- check_credits: 查看积分
- view_statistics: 查看统计
- view_practice_history: 查看练习历史
- account_management: 账户管理（隐私敏感）
- payment_operations: 支付操作（隐私敏感）

用户消息：{message}
"""

        response = await call_ai(
            self.db, AIFeature.INTENT_RECOGNITION, prompt=prompt, context=context,
        )
        return json.loads(response["content"])


def get_chat_service(db: AsyncSession) -> ChatService:
    """获取聊天服务实例"""
    return ChatService(db)
