"""
聊天路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import json
import uuid

from app.core.config import settings
from app.schemas.ai import AIFeature
from app.services.ai_service import AIUnavailable, call_ai
from app.api.deps import get_db, get_workspace_user
from app.schemas.chat import (
    SendMessageRequest,
    SendMessageResponse,
    ChatMessageResponse,
    ChatHistoryResponse,
    UploadMaterialResponse,
    FunctionCallRequest,
    FunctionCallResponse,
    ParseIntentRequest,
    ParseIntentResponse,
    IntentResult,
)
from app.services.chat_service import ChatService, get_chat_service
from app.models.user import User
from app.models.chat_message import ChatMessage

router = APIRouter(prefix="/api/chat", tags=["聊天"])


def serialize_message(message: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=str(message.id), userId=str(message.user_id), content=message.content,
        type=message.type, timestamp=message.created_at,
        processingStatus=message.processing_status, aiResponse=message.ai_response,
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    *,
    db: AsyncSession = Depends(get_db),
    request: SendMessageRequest,
    current_user: User = Depends(get_workspace_user),
):
    """发送聊天消息"""
    chat_service = get_chat_service(db)

    try:
        user_message, message = await chat_service.send_message(
            user_id=str(current_user.id),
            content=request.content,
            language=request.language,
            context=request.context,
        )

        return SendMessageResponse(
            success=True,
            message=serialize_message(message),
            userMessage=serialize_message(user_message),
        )
    except AIUnavailable:
        raise
    except Exception as e:
        return SendMessageResponse(
            success=False,
            error="无法完成请求，请稍后重试。",
        )


@router.post("/upload-material", response_model=UploadMaterialResponse)
async def upload_material(
    *,
    db: AsyncSession = Depends(get_db),
    file: UploadFile = File(...),
    language: Optional[str] = Query(None),
    current_user: User = Depends(get_workspace_user),
):
    """上传学习材料"""
    chat_service = get_chat_service(db)

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(status_code=413, detail=f"文本文件不能超过 {settings.MAX_FILE_SIZE_MB} MB。")
    try:
        text_content = content.decode("utf-8-sig").strip()
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="请上传 UTF-8 编码的文本文件。")
    if not text_content or "\x00" in text_content:
        raise HTTPException(status_code=400, detail="请上传非空的 UTF-8 文本文件。")

    try:
        message = await chat_service.upload_material(
            user_id=str(current_user.id), content=text_content, language=language,
        )
        return UploadMaterialResponse(success=True, message=serialize_message(message), extractedContent=message.content)
    except AIUnavailable:
        raise
    except Exception as e:
        return UploadMaterialResponse(
            success=False,
            error="无法完成请求，请稍后重试。",
        )


@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    *,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_workspace_user),
):
    """获取聊天历史"""
    chat_service = get_chat_service(db)

    messages = await chat_service.get_chat_history(
        user_id=str(current_user.id),
        limit=limit + 1,
        offset=offset,
    )

    return ChatHistoryResponse(
        success=True,
        messages=[serialize_message(message) for message in messages[:limit]],
        totalCount=min(len(messages), limit),
        hasMore=len(messages) > limit,
    )


@router.delete("/message/{message_id}")
async def delete_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    result = await db.execute(delete(ChatMessage).where(
        ChatMessage.id == message_id, ChatMessage.user_id == current_user.id,
    ))
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="消息已不存在。")
    await db.commit()
    return {"success": True}


@router.delete("/history")
async def clear_chat_history(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_workspace_user),
):
    """清空聊天历史"""
    chat_service = get_chat_service(db)

    deleted_count = await chat_service.clear_chat_history(
        user_id=str(current_user.id),
    )

    return {
        "success": True,
        "message": f"Cleared {deleted_count} messages",
    }


@router.get("/search")
async def search_messages(
    *,
    db: AsyncSession = Depends(get_db),
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_workspace_user),
):
    """搜索消息"""
    chat_service = get_chat_service(db)

    messages = await chat_service.search_messages(
        user_id=str(current_user.id),
        query=q,
        limit=limit,
    )

    return {
        "success": True,
        "data": [
            {
                "id": str(msg.id),
                "content": msg.content,
                "timestamp": msg.created_at.isoformat(),
            }
            for msg in messages
        ],
    }


@router.post("/function-call", response_model=FunctionCallResponse)
async def execute_function(
    *,
    db: AsyncSession = Depends(get_db),
    request: FunctionCallRequest,
    current_user: User = Depends(get_workspace_user),
):
    """执行函数调用"""

    # 构建可用函数列表
    available_functions = [
        {
            "name": "generate_practice",
            "description": "生成练习题",
            "parameters": {"language": str, "difficulty": str, "questionCount": int},
        },
        {
            "name": "check_progress",
            "description": "查看学习进度",
            "parameters": {"language": str},
        },
        {
            "name": "add_vocabulary",
            "description": "添加单词",
            "parameters": {"word": str, "language": str, "definition": str},
        },
    ]

    prompt = f"""分析用户请求，确定应该调用哪个函数。

用户意图：{request.intent.value}
参数：{json.dumps(request.parameters, ensure_ascii=False)}

可用函数：
{available_functions}

请返回 JSON 格式：
{{
    "function_name": "函数名",
    "parameters": {{参数}},
    "confidence": 0.0-1.0
}}
"""

    try:
        response = await call_ai(
            db, AIFeature.FUNCTION_CALLING,
            prompt=prompt,
        )

        result = json.loads(response["content"])

        # 执行识别出的函数
        function_name = result.get("function_name")
        parameters = result.get("parameters", {})

        # 这里可以根据 function_name 调用相应的实际函数
        # 目前返回识别结果
        return FunctionCallResponse(
            success=True,
            result={
                "success": True,
                "data": {
                    "called_function": function_name,
                    "parameters": parameters,
                    "confidence": result.get("confidence", 0.5),
                },
            },
        )
    except AIUnavailable:
        raise
    except Exception as e:
        return FunctionCallResponse(
            success=False,
            error=str(e),
        )


@router.post("/parse-intent", response_model=ParseIntentResponse)
async def parse_intent(
    *,
    db: AsyncSession = Depends(get_db),
    message: Optional[str] = Query(None, min_length=1),
    request: Optional[ParseIntentRequest] = None,
    current_user: User = Depends(get_workspace_user),
):
    """解析用户意图"""
    if request is None and message is None:
        raise HTTPException(status_code=400, detail="请输入要识别的消息。")
    chat_service = get_chat_service(db)

    try:
        result = await chat_service.parse_intent(
            user_id=str(current_user.id),
            message=request.message if request else message,
            context=request.context if request else None,
        )

        return ParseIntentResponse(
            success=True,
            result=IntentResult.model_validate(result),
        )
    except AIUnavailable:
        raise
    except Exception as e:
        return ParseIntentResponse(
            success=False,
            error=str(e),
        )


@router.get("/available-functions")
async def get_available_functions():
    """获取可用函数列表"""
    return {
        "success": True,
        "functions": [
            {
                "intent": "generate_practice",
                "description": "生成练习题",
                "parameters": {
                    "language": "目标语言",
                    "difficulty": "难度",
                },
                "isPrivacySensitive": False,
            },
            {
                "intent": "check_progress",
                "description": "查看学习进度",
                "parameters": {
                    "language": "目标语言",
                },
                "isPrivacySensitive": False,
            },
        ],
    }
