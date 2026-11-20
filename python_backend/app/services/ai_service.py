"""统一的文本推理接口与按功能回退。"""
import asyncio
import json
import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from time import monotonic
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.schemas.ai import AIFeature, AIProfileInput, AISettingsInput, Provider
from app.schemas.chat import IntentResult
from app.services.ai_settings import load_ai_settings

logger = logging.getLogger(__name__)

JSON_FEATURES = {
    AIFeature.MATERIAL_ANALYSIS,
    AIFeature.EXERCISE_GENERATION,
    AIFeature.PRACTICE_ANALYSIS,
    AIFeature.VOCABULARY_EXTRACTION,
    AIFeature.VOCABULARY_PRACTICE,
    AIFeature.DAILY_RECOMMENDATION,
    AIFeature.FUNCTION_CALLING,
    AIFeature.INTENT_RECOGNITION,
}


class AIUnavailable(Exception):
    """该功能当前没有可用的 AI 提供方。"""


class ProviderError(Exception):
    """可安全展示给工作台用户的提供方错误。"""


def _normalize_json(content: str, feature: AIFeature) -> str:
    lines = content.strip().splitlines()
    if len(lines) > 2 and lines[0].lower() in {"```", "```json"} and lines[-1] == "```":
        content = "\n".join(lines[1:-1])
    try:
        value = json.loads(content)
    except ValueError:
        raise ProviderError("返回内容不是有效的 JSON。") from None
    expected = list if feature is AIFeature.VOCABULARY_EXTRACTION else dict
    if not isinstance(value, expected):
        raise ProviderError("返回的 JSON 结构与功能要求不符。")
    if feature in {AIFeature.EXERCISE_GENERATION, AIFeature.VOCABULARY_PRACTICE}:
        questions = value.get("questions")
        if not isinstance(questions, list) or not questions or not all(isinstance(item, dict) for item in questions):
            raise ProviderError("返回的 JSON 缺少有效的练习题目。")
    if feature is AIFeature.FUNCTION_CALLING and not isinstance(value.get("function_name"), str):
        raise ProviderError("返回的 JSON 缺少功能名称。")
    if feature is AIFeature.INTENT_RECOGNITION:
        try:
            IntentResult.model_validate(value)
        except ValueError:
            raise ProviderError("返回的 JSON 缺少有效的意图字段。") from None
    return content


async def _responses(profile: AIProfileInput, messages: list[dict]) -> tuple[str, str, dict]:
    headers = {}
    if profile.api_key:
        headers["Authorization"] = f"Bearer {profile.api_key.get_secret_value()}"
    async with httpx.AsyncClient(timeout=profile.timeout_seconds, follow_redirects=False) as client:
        response = await client.post(
            profile.endpoint,
            headers=headers,
            json={
                "model": profile.model,
                "input": messages,
                "max_output_tokens": profile.max_output_tokens,
                "store": False,
            },
        )
        response.raise_for_status()
        data = response.json()

    if data.get("status") not in {None, "completed"} or data.get("error"):
        raise ProviderError("Responses API 未返回已完成的结果。")
    output = data.get("output_text") or "\n".join(
        part["text"]
        for item in data.get("output", [])
        if item.get("type") == "message"
        for part in item.get("content", [])
        if part.get("type") == "output_text"
    )
    return output, data.get("model") or profile.model, data.get("usage") or {}


async def _run_command(command: list[str], prompt: str, cwd: str) -> bytes:
    try:
        process = await asyncio.create_subprocess_exec(
            *command, cwd=cwd, stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
    except FileNotFoundError:
        raise ProviderError(f"后端进程的 PATH 中找不到 {command[0]}。") from None
    try:
        stdout, _ = await process.communicate(prompt.encode("utf-8"))
    finally:
        if process.returncode is None:
            try:
                process.kill()
            except ProcessLookupError:
                pass
            await process.wait()
    if process.returncode:
        raise ProviderError(f"{command[0]} 退出码 {process.returncode}。请检查本机 CLI 的认证和模型设置。")
    return stdout


async def _cli(profile: AIProfileInput, messages: list[dict]) -> tuple[str, str, dict]:
    prompt = "Use these conversation messages to answer the final user message.\n"
    prompt += json.dumps(messages, ensure_ascii=False)
    model_args = ["--model", profile.model] if profile.model else []
    with TemporaryDirectory(prefix="mnemos-ai-") as directory:
        if profile.provider is Provider.CODEX:
            output = Path(directory) / "reply.txt"
            await _run_command(
                ["codex", "--ask-for-approval", "never", "exec",
                 "--sandbox", "read-only", "--skip-git-repo-check", "--ephemeral",
                 "--ignore-user-config", "--disable", "shell_tool", "--disable", "hooks",
                 "--output-last-message", str(output), *model_args, "-"],
                prompt, directory,
            )
            return output.read_text(encoding="utf-8"), profile.model or "codex", {}

        stdout = await _run_command(
            ["claude", "--safe-mode", "--print", "--output-format", "json", "--no-session-persistence",
             "--tools", "", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
             "--disallowed-tools", "*", "--disable-slash-commands", "--max-turns", "1",
             *model_args],
            prompt, directory,
        )
        result = json.loads(stdout)
        if result.get("is_error"):
            raise ProviderError("Claude Code 未完成请求。请检查本机 CLI 的认证和模型设置。")
        return result["result"], profile.model or "claude", result.get("usage") or {}


async def run_profile(
    profile: AIProfileInput, messages: list[dict], feature: AIFeature | None = None,
) -> dict[str, Any]:
    started = monotonic()
    try:
        async with asyncio.timeout(profile.timeout_seconds):
            provider = _responses if profile.provider is Provider.RESPONSES else _cli
            content, model, usage = await provider(profile, messages)
            if not isinstance(content, str) or not content.strip():
                raise ProviderError("提供方返回了空文本。")
            if feature in JSON_FEATURES:
                content = _normalize_json(content, feature)
            input_tokens = int(usage.get("input_tokens") or 0)
            output_tokens = int(usage.get("output_tokens") or 0)
            total_tokens = int(usage.get("total_tokens") or (input_tokens + output_tokens))
    except (TimeoutError, httpx.TimeoutException):
        raise ProviderError(f"请求超过 {profile.timeout_seconds} 秒。") from None
    except httpx.HTTPStatusError as exc:
        raise ProviderError(f"Responses API 返回 HTTP {exc.response.status_code}。") from None
    except (httpx.RequestError, httpx.InvalidURL):
        raise ProviderError("无法连接到 Responses API。") from None
    except (ValueError, TypeError, AttributeError, KeyError, OSError):
        raise ProviderError("无法读取提供方返回的结果。") from None

    return {
        "content": content,
        "model": model,
        "tokens_used": total_tokens,
        "processing_time": round((monotonic() - started) * 1000),
        "metadata": {
            "profile_id": str(profile.id),
            "provider": profile.provider.value,
            "prompt_tokens": input_tokens,
            "completion_tokens": output_tokens,
        },
    }


async def call_ai(
    db: AsyncSession,
    feature: AIFeature,
    prompt: str,
    context: dict | None = None,
) -> dict[str, Any]:
    return await _complete(await load_ai_settings(db), feature, prompt, context)


async def _complete(
    config: AISettingsInput,
    feature: AIFeature,
    prompt: str,
    context: dict | None = None,
) -> dict[str, Any]:
    queue = config.routes.get(feature) or config.routes.get(AIFeature.DEFAULT, [])
    if not queue:
        raise AIUnavailable("请先在「AI 配置」为该功能或默认路由设置队列。")

    context = context or {}
    messages = []
    if context.get("system_prompt"):
        messages.append({"role": "system", "content": context["system_prompt"]})
    messages.extend(context.get("history") or [])
    messages.append({"role": "user", "content": prompt})

    profiles = {profile.id: profile for profile in config.profiles}
    started = monotonic()
    for profile_id in queue:
        profile = profiles[profile_id]
        try:
            result = await run_profile(profile, messages, feature)
        except ProviderError as exc:
            logger.warning("AI request failed for %s with profile %s: %s", feature, profile_id, exc)
            continue
        result["processing_time"] = round((monotonic() - started) * 1000)
        return result
    raise AIUnavailable("该功能的 AI 队列均调用失败，请在「AI 配置」测试连接。")


def call_ai_for_worker(feature: AIFeature, prompt: str) -> dict[str, Any]:
    """在同步 Celery 任务内完成一次异步调用。"""
    async def run():
        engine = create_async_engine(settings.database_url, poolclass=NullPool, hide_parameters=True)
        try:
            async with AsyncSession(engine) as db:
                config = await load_ai_settings(db)
        finally:
            await engine.dispose()
        return await _complete(config, feature, prompt)

    return asyncio.run(run())
