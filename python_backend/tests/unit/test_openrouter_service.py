"""
OpenRouter 服务单元测试
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.openrouter_service import OpenRouterService, TaskType, ModelConfig


class TestOpenRouterService:
    """测试 OpenRouterService 类"""

    @pytest.fixture
    def openrouter_service(self) -> OpenRouterService:
        """创建 OpenRouter 服务实例（测试模式）"""
        return OpenRouterService(test_mode=True)

    def test_select_model_conversation(self, openrouter_service: OpenRouterService):
        """测试选择对话模型"""
        model = openrouter_service.select_model(TaskType.CONVERSATION)
        assert isinstance(model, str)
        assert len(model) > 0

    def test_select_model_exercise(self, openrouter_service: OpenRouterService):
        """测试选择练习生成模型"""
        model = openrouter_service.select_model(TaskType.EXERCISE_GENERATION)
        assert isinstance(model, str)

    def test_select_model_assessment(self, openrouter_service: OpenRouterService):
        """测试选择评估模型"""
        model = openrouter_service.select_model(TaskType.LEVEL_ASSESSMENT)
        assert isinstance(model, str)

    def test_calculate_credit_cost(self, openrouter_service: OpenRouterService):
        """测试计算积分消耗"""
        # 测试已知模型的消耗
        cost = openrouter_service.calculate_credit_cost("openai/gpt-4o", 1000)
        assert cost >= 0

        # 测试未知模型返回 0
        cost = openrouter_service.calculate_credit_cost("unknown/model", 1000)
        assert cost == 0

    @pytest.mark.asyncio
    async def test_call_ai_mock_response(self, openrouter_service: OpenRouterService):
        """测试调用 AI（模拟响应）"""
        result = await openrouter_service.call_ai(
            model="openai/gpt-4o",
            prompt="Hello, AI!",
            context=None,
            user_id="test-user",
        )

        # 验证响应结构
        assert "content" in result
        assert "model" in result
        assert "tokens_used" in result
        assert "processing_time" in result
        assert "metadata" in result

        # 验证内容类型
        assert isinstance(result["content"], str)
        assert isinstance(result["tokens_used"], int)
        assert isinstance(result["processing_time"], int)

    @pytest.mark.asyncio
    async def test_call_ai_intent_recognition(self, openrouter_service: OpenRouterService):
        """测试意图识别"""
        prompt = """分析用户意图：
用户消息：我想生成一些练习题

返回 JSON 格式的意图分析。"""

        result = await openrouter_service.call_ai(
            model="openai/gpt-4o",
            prompt=prompt,
            context=None,
            user_id="test-user",
        )

        # 验证响应包含意图信息
        assert "content" in result
        assert isinstance(result["content"], str)

    def test_build_messages_simple(self, openrouter_service: OpenRouterService):
        """测试构建简单消息"""
        messages = openrouter_service._build_messages("Hello!")

        assert len(messages) == 1
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello!"

    def test_build_messages_with_context(self, openrouter_service: OpenRouterService):
        """测试构建带上下文的消息"""
        context = {
            "system_prompt": "You are a helpful assistant.",
            "history": [
                {"role": "user", "content": "Previous message"},
                {"role": "assistant", "content": "Previous response"},
            ],
        }

        messages = openrouter_service._build_messages("Current message", context)

        assert len(messages) == 3
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert messages[2]["role"] == "user"
        assert messages[2]["content"] == "Current message"

    def test_get_available_models(self, openrouter_service: OpenRouterService):
        """测试获取可用模型"""
        models = openrouter_service.model_configs

        assert isinstance(models, dict)
        assert len(models) > 0
        assert "openai/gpt-4o" in models or any("gpt" in k for k in models.keys())

    def test_model_config_structure(self, openrouter_service: OpenRouterService):
        """测试模型配置结构"""
        for model_name, config in openrouter_service.model_configs.items():
            assert isinstance(config, ModelConfig)
            assert config.name == model_name
            assert isinstance(config.max_tokens, int)
            assert config.max_tokens > 0
            assert isinstance(config.temperature, float)
            assert 0 <= config.temperature <= 2
            assert isinstance(config.cost_per_token, float)
            assert config.cost_per_token >= 0


class TestTaskTypeEnum:
    """测试 TaskType 枚举"""

    def test_task_type_values(self):
        """测试任务类型值"""
        assert TaskType.CONVERSATION.value == "conversation"
        assert TaskType.MATERIAL_ANALYSIS.value == "analysis"
        assert TaskType.EXERCISE_GENERATION.value == "exercise"
        assert TaskType.LEVEL_ASSESSMENT.value == "assessment"
        assert TaskType.VOCABULARY_EXTRACTION.value == "vocab"
        assert TaskType.FUNCTION_CALLING.value == "function"
        assert TaskType.INTENT_RECOGNITION.value == "intent"


class TestLanguageEnum:
    """测试 Language 枚举"""

    def test_language_values(self):
        """测试语言值"""
        from app.services.openrouter_service import Language

        assert Language.ENGLISH.value == "en"
        assert Language.JAPANESE.value == "ja"
        assert Language.FRENCH.value == "fr"
