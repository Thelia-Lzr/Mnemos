"""AI 提供方和功能路由的 API 类型。"""
from enum import StrEnum
from typing import Annotated
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, StringConstraints, model_validator


class Provider(StrEnum):
    RESPONSES = "responses"
    CODEX = "codex"
    CLAUDE_CODE = "claude_code"


class AIFeature(StrEnum):
    DEFAULT = "default"
    CONVERSATION = "conversation"
    MATERIAL_ANALYSIS = "material_analysis"
    EXERCISE_GENERATION = "exercise_generation"
    PRACTICE_ANALYSIS = "practice_analysis"
    PRACTICE_FOLLOWUP = "practice_followup"
    VOCABULARY_EXTRACTION = "vocabulary_extraction"
    VOCABULARY_PRACTICE = "vocabulary_practice"
    DAILY_RECOMMENDATION = "daily_recommendation"
    FUNCTION_CALLING = "function_calling"
    INTENT_RECOGNITION = "intent_recognition"


class AIProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: UUID
    name: Annotated[str, StringConstraints(min_length=1, max_length=80)]
    provider: Provider
    model: Annotated[str, StringConstraints(max_length=150)] = ""
    endpoint: Annotated[str, StringConstraints(max_length=1024)] = ""
    timeout_seconds: int = Field(default=45, ge=5, le=120)
    max_output_tokens: int = Field(default=8192, ge=16, le=32768)

    @model_validator(mode="after")
    def validate_endpoint(self):
        if self.provider is Provider.RESPONSES:
            parsed = urlsplit(self.endpoint)
            if (
                parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.query or parsed.fragment or parsed.port == 0
                or any(char.isspace() for char in self.endpoint)
                or not parsed.path.rstrip("/").endswith("/responses")
            ):
                raise ValueError("请填写以 /responses 结尾的完整 HTTP 或 HTTPS 地址。")
            self.endpoint = self.endpoint.rstrip("/")
            if not self.model:
                raise ValueError("Responses API 需要填写模型 ID。")
        return self


class AIProfileInput(AIProfile):
    api_key: SecretStr | None = Field(default=None, max_length=4096)

    @model_validator(mode="after")
    def validate_key(self):
        if self.api_key and any(not 33 <= ord(char) <= 126 for char in self.api_key.get_secret_value()):
            raise ValueError("API 密钥必须是无空格的可打印字符。")
        return self


class AIProfileView(AIProfile):
    has_api_key: bool


Queue = Annotated[list[UUID], Field(max_length=5)]


class AISettingsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    revision: int = Field(ge=0)
    profiles: list[AIProfileInput] = Field(max_length=40)
    routes: dict[AIFeature, Queue]

    @model_validator(mode="after")
    def validate_references(self):
        profile_ids = {profile.id for profile in self.profiles}
        if len(profile_ids) != len(self.profiles):
            raise ValueError("配置 ID 必须唯一。")
        for queue in self.routes.values():
            if len(set(queue)) != len(queue) or not set(queue) <= profile_ids:
                raise ValueError("队列只能引用已有配置，每个配置在同一队列中只出现一次。")
        return self


class AISettingsView(BaseModel):
    revision: int
    profiles: list[AIProfileView]
    routes: dict[AIFeature, list[UUID]]
