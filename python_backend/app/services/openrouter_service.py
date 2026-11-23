"""
OpenRouter AI 服务
"""
import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai_credentials import OPENROUTER_URL, get_personal_api_key

logger = logging.getLogger(__name__)


class TaskType(str, Enum):
    """任务类型"""
    CONVERSATION = "conversation"
    MATERIAL_ANALYSIS = "analysis"
    EXERCISE_GENERATION = "exercise"
    LEVEL_ASSESSMENT = "assessment"
    VOCABULARY_EXTRACTION = "vocab"
    FUNCTION_CALLING = "function"
    INTENT_RECOGNITION = "intent"


class Language(str, Enum):
    """语言"""
    ENGLISH = "en"
    JAPANESE = "ja"
    FRENCH = "fr"


class ModelConfig:
    """模型配置"""
    def __init__(
        self,
        name: str,
        max_tokens: int = 8192,
        temperature: float = 0.7,
        cost_per_token: float = 0.005,
    ):
        self.name = name
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.cost_per_token = cost_per_token


class OpenRouterService:
    """OpenRouter AI 服务"""

    def __init__(self, test_mode: bool = False):
        self.test_mode = test_mode
        self.api_key = settings.OPENROUTER_API_KEY or ("test-key" if test_mode else "")
        self.base_url = settings.OPENROUTER_BASE_URL

        if not self.api_key and not test_mode:
            logger.info("No server OpenRouter key configured; AI features require a personal key")

        self.model_configs: Dict[str, ModelConfig] = {}
        self._initialize_model_configs()

    def _initialize_model_configs(self) -> None:
        """初始化模型配置"""
        default_model = settings.DEFAULT_AI_MODEL or "openai/gpt-4o"

        self.model_configs = {
            default_model: ModelConfig(
                name=default_model,
                max_tokens=8192,
                temperature=0.7,
                cost_per_token=0.005,
            ),
            "openai/gpt-4o": ModelConfig(
                name="openai/gpt-4o",
                max_tokens=8192,
                temperature=0.7,
                cost_per_token=0.005,
            ),
            "anthropic/claude-3-haiku": ModelConfig(
                name="anthropic/claude-3-haiku",
                max_tokens=4096,
                temperature=0.3,
                cost_per_token=0.002,
            ),
        }

    def select_model(self, task_type: TaskType) -> str:
        """根据任务类型选择模型"""
        model_map = {
            TaskType.CONVERSATION: settings.CHAT_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.MATERIAL_ANALYSIS: settings.ANALYSIS_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.EXERCISE_GENERATION: settings.PRACTICE_GENERATION_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.LEVEL_ASSESSMENT: settings.ASSESSMENT_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.VOCABULARY_EXTRACTION: settings.VOCABULARY_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.FUNCTION_CALLING: settings.FUNCTION_CALLING_MODEL or settings.DEFAULT_AI_MODEL,
            TaskType.INTENT_RECOGNITION: settings.INTENT_RECOGNITION_MODEL or settings.DEFAULT_AI_MODEL,
        }

        selected = model_map.get(task_type) or settings.DEFAULT_AI_MODEL
        return selected or "openai/gpt-4o"

    def calculate_credit_cost(self, model: str, tokens: int) -> int:
        """计算积分消耗"""
        config = self.model_configs.get(model)
        if not config:
            return 0
        return int(tokens * config.cost_per_token)

    async def call_ai(
        self,
        model: str,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """调用 AI 模型"""
        start_time = datetime.now()

        # 测试模式返回模拟响应
        if self.test_mode:
            return self._generate_mock_response(model, prompt, context, start_time)

        api_key, base_url = await self._resolve_credentials(db, user_id)

        model_config = self.model_configs.get(model)
        if not model_config:
            raise ValueError(f"Unsupported model: {model}")

        messages = self._build_messages(prompt, context)

        request_data = {
            "model": model,
            "messages": messages,
            "max_tokens": model_config.max_tokens,
            "temperature": model_config.temperature,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.CORS_ORIGIN or "http://localhost:3000",
            "X-Title": "Mnemos AI Language Learning",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json=request_data,
                    headers=headers,
                )
                response.raise_for_status()
                data = response.json()

                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                choice = data["choices"][0]
                usage = data.get("usage", {})
                tokens_used = usage.get("total_tokens", 0)
                credit_cost = self.calculate_credit_cost(model, tokens_used)

                return {
                    "content": choice["message"]["content"],
                    "model": model,
                    "tokens_used": tokens_used,
                    "processing_time": int(processing_time),
                    "metadata": {
                        "finish_reason": choice.get("finish_reason"),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "credit_cost": credit_cost,
                    },
                }
        except httpx.HTTPError as e:
            logger.error(f"OpenRouter API error: {e}")
            raise Exception(f"AI service error: {str(e)}")

    async def call_ai_stream(
        self,
        model: str,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ):
        """流式调用 AI 模型"""
        if self.test_mode:
            async def mock_stream():
                mock_response = "这是一个模拟的流式响应。"
                for char in mock_response:
                    yield f"data: {char}\n\n"
                yield "data: [DONE]\n\n"
            return mock_stream()

        api_key, base_url = await self._resolve_credentials(db, user_id)

        model_config = self.model_configs.get(model)
        if not model_config:
            raise ValueError(f"Unsupported model: {model}")

        messages = self._build_messages(prompt, context)

        request_data = {
            "model": model,
            "messages": messages,
            "max_tokens": model_config.max_tokens,
            "temperature": model_config.temperature,
            "stream": True,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.CORS_ORIGIN or "http://localhost:3000",
            "X-Title": "Mnemos AI Language Learning",
            "Accept": "text/event-stream",
        }

        async def stream_generator():
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    async with client.stream(
                        "POST",
                        f"{base_url}/chat/completions",
                        json=request_data,
                        headers=headers,
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                yield f"{line}\n\n"
                        yield "data: [DONE]\n\n"
            except httpx.HTTPError as e:
                logger.error(f"OpenRouter API error: {e}")
                error_msg = '{"error": "AI service error: ' + str(e) + '"}'
                yield f"data: {error_msg}\n\n"
                yield "data: [DONE]\n\n"

        return stream_generator()

    async def _resolve_credentials(
        self, db: Optional[AsyncSession], user_id: Optional[str]
    ) -> tuple[str, str]:
        if db is not None and user_id is not None:
            personal_key = await get_personal_api_key(db, user_id)
            if personal_key:
                return personal_key, OPENROUTER_URL
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")
        return self.api_key, self.base_url

    def _build_messages(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, str]]:
        """构建消息列表"""
        messages = []

        if context and context.get("system_prompt"):
            messages.append({
                "role": "system",
                "content": context["system_prompt"],
            })

        if context and context.get("history"):
            messages.extend(context["history"])

        messages.append({
            "role": "user",
            "content": prompt,
        })

        return messages

    def _generate_mock_response(
        self,
        model: str,
        prompt: str,
        context: Optional[Dict[str, Any]],
        start_time: datetime,
    ) -> Dict[str, Any]:
        """生成模拟响应"""
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        mock_tokens = len(prompt) // 4 + 50

        # 意图识别模拟响应
        if "intent" in prompt.lower() or "意图" in prompt:
            import json
            mock_content = json.dumps({
                "intent": "language_learning",
                "confidence": 0.85,
                "parameters": {"language": "en"},
                "isPrivacySensitive": False,
            })
        else:
            mock_content = "这是一个模拟的 AI 响应。"

        return {
            "content": mock_content,
            "model": model,
            "tokens_used": mock_tokens,
            "processing_time": int(processing_time),
            "metadata": {
                "finish_reason": "stop",
                "prompt_tokens": int(mock_tokens * 0.7),
                "completion_tokens": int(mock_tokens * 0.3),
                "credit_cost": self.calculate_credit_cost(model, mock_tokens),
            },
        }


# 单例工厂
_service_instance: Optional[OpenRouterService] = None


def get_openrouter_service(test_mode: bool = False) -> OpenRouterService:
    """获取 OpenRouter 服务实例"""
    global _service_instance
    if _service_instance is None or test_mode:
        _service_instance = OpenRouterService(test_mode=test_mode)
    return _service_instance
