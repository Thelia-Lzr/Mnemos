"""
聊天相关 Pydantic 模式
"""
from pydantic import AliasChoices, BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MessageType(str, Enum):
    """消息类型"""
    USER_TEXT = "user_text"
    USER_FILE = "user_file"
    AI_RESPONSE = "ai_response"
    SYSTEM = "system"


class ProcessingStatus(str, Enum):
    """处理状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UserIntent(str, Enum):
    """用户意图"""
    # 练习相关
    GENERATE_PRACTICE = "generate_practice"
    VIEW_PRACTICE_HISTORY = "view_practice_history"
    START_PRACTICE = "start_practice"

    # 学习进度
    CHECK_PROGRESS = "check_progress"
    VIEW_CAPABILITIES = "view_capabilities"
    SET_LEARNING_GOALS = "set_learning_goals"

    # 词汇管理
    ADD_VOCABULARY = "add_vocabulary"
    VIEW_VOCABULARY = "view_vocabulary"
    REMOVE_VOCABULARY = "remove_vocabulary"

    # PK 对战
    START_PK_MATCH = "start_pk_match"
    VIEW_PK_HISTORY = "view_pk_history"
    CHECK_MMR = "check_mmr"

    # 统计查看
    VIEW_STATISTICS = "view_statistics"
    VIEW_MILESTONES = "view_milestones"

    # 设置管理
    UPDATE_PREFERENCES = "update_preferences"
    CHANGE_LANGUAGE = "change_language"

    # 学习对话
    LANGUAGE_LEARNING = "language_learning"
    MATERIAL_ANALYSIS = "material_analysis"

    # 隐私敏感
    ACCOUNT_MANAGEMENT = "account_management"


class FileAttachment(BaseModel):
    """文件附件"""
    id: str
    filename: str
    fileType: str
    fileSize: int
    uploadedAt: datetime
    processedAt: Optional[datetime] = None
    extractedContent: Optional[str] = None


class AIResponse(BaseModel):
    """AI 响应"""
    content: str
    model: str
    tokensUsed: int = Field(validation_alias=AliasChoices("tokensUsed", "tokens_used"))
    processingTime: int = Field(validation_alias=AliasChoices("processingTime", "processing_time"))
    metadata: Optional[Dict[str, Any]] = None


class ChatMessageCreate(BaseModel):
    """聊天消息创建"""
    content: str = Field(..., min_length=1)
    language: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatMessageResponse(BaseModel):
    """聊天消息响应"""
    id: str
    userId: str
    content: str
    type: MessageType
    timestamp: datetime
    aiResponse: Optional[AIResponse] = None
    processingStatus: ProcessingStatus
    detectedIntent: Optional[UserIntent] = None
    attachments: Optional[List[FileAttachment]] = None
    extractedVocabulary: Optional[List[str]] = None

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    """发送消息请求"""
    content: str = Field(..., min_length=1)
    language: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class SendMessageResponse(BaseModel):
    """发送消息响应"""
    success: bool
    userMessage: Optional[ChatMessageResponse] = None
    message: Optional[ChatMessageResponse] = None
    taskId: Optional[str] = None
    error: Optional[str] = None


class UploadMaterialResponse(BaseModel):
    """上传材料响应"""
    success: bool
    message: Optional[ChatMessageResponse] = None
    taskId: Optional[str] = None
    extractedContent: Optional[str] = None
    error: Optional[str] = None


class FunctionCallRequest(BaseModel):
    """函数调用请求"""
    intent: UserIntent
    parameters: Dict[str, Any]
    language: Optional[str] = None


class FunctionResult(BaseModel):
    """函数调用结果"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    requiresUserAction: Optional[bool] = None
    actionUrl: Optional[str] = None


class FunctionCallResponse(BaseModel):
    """函数调用响应"""
    success: bool
    result: Optional[FunctionResult] = None
    taskId: Optional[str] = None
    error: Optional[str] = None


class IntentResult(BaseModel):
    """意图识别结果"""
    intent: UserIntent
    confidence: float
    parameters: Dict[str, Any]
    requiresConfirmation: bool
    isPrivacySensitive: bool


class ParseIntentRequest(BaseModel):
    message: str = Field(min_length=1)
    context: Optional[Dict[str, Any]] = None


class ParseIntentResponse(BaseModel):
    """解析意图响应"""
    success: bool
    result: Optional[IntentResult] = None
    error: Optional[str] = None


class ChatHistoryResponse(BaseModel):
    """聊天历史响应"""
    success: bool
    messages: List[ChatMessageResponse]
    totalCount: int
    hasMore: bool
    error: Optional[str] = None
