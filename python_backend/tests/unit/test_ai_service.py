import json
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest

from app.schemas.ai import AIFeature, AIProfileInput, AISettingsInput, Provider
from app.services import ai_service
from app.services.ai_settings import public_settings


def profile(name, **fields):
    return AIProfileInput(
        id=uuid4(), name=name, provider=Provider.RESPONSES,
        endpoint="http://localhost:4321/v1/responses", model=name, **fields,
    )


@pytest.mark.asyncio
async def test_feature_queue_falls_back_in_order(monkeypatch):
    default, primary, backup, unused = map(profile, ["default", "primary", "backup", "unused"])
    config = AISettingsInput(
        revision=1, profiles=[default, primary, backup, unused],
        routes={AIFeature.DEFAULT: [default.id], AIFeature.CONVERSATION: [primary.id, backup.id, unused.id]},
    )
    run = AsyncMock(side_effect=[ai_service.ProviderError("test error"), {"content": "backup"}])
    monkeypatch.setattr(ai_service, "run_profile", run)

    result = await ai_service._complete(config, AIFeature.CONVERSATION, "hello")

    assert result["content"] == "backup"
    assert [call.args[0].id for call in run.await_args_list] == [primary.id, backup.id]


@pytest.mark.asyncio
async def test_empty_feature_queue_inherits_default(monkeypatch):
    default = profile("default")
    config = AISettingsInput(
        revision=1, profiles=[default],
        routes={AIFeature.DEFAULT: [default.id], AIFeature.CONVERSATION: []},
    )
    run = AsyncMock(return_value={"content": "ok"})
    monkeypatch.setattr(ai_service, "run_profile", run)

    await ai_service._complete(config, AIFeature.CONVERSATION, "hello")

    assert run.await_args.args[0].id == default.id


@pytest.mark.asyncio
async def test_exhausted_feature_queue_does_not_call_default(monkeypatch):
    default, primary = map(profile, ["default", "primary"])
    config = AISettingsInput(
        revision=1, profiles=[default, primary],
        routes={AIFeature.DEFAULT: [default.id], AIFeature.CONVERSATION: [primary.id]},
    )
    run = AsyncMock(side_effect=ai_service.ProviderError("test error"))
    monkeypatch.setattr(ai_service, "run_profile", run)

    with pytest.raises(ai_service.AIUnavailable):
        await ai_service._complete(config, AIFeature.CONVERSATION, "hello")

    assert run.await_count == 1
    assert run.await_args.args[0].id == primary.id


@pytest.mark.asyncio
async def test_responses_http_contract_and_key_redaction(monkeypatch):
    provider = profile("configured-model", api_key="test-key")
    messages = [{"role": "user", "content": "hello"}]

    def respond(request):
        assert request.url.path == "/v1/responses"
        assert request.headers["Authorization"] == "Bearer test-key"
        assert json.loads(request.content) == {
            "model": "configured-model", "input": messages, "store": False, "max_output_tokens": 8192,
        }
        return httpx.Response(200, json={
            "status": "completed", "model": "resolved-model",
            "output": [{"type": "message", "content": [{"type": "output_text", "text": "ok"}]}],
            "usage": {"input_tokens": 10, "output_tokens": 5},
        })

    http_client = httpx.AsyncClient
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", lambda **kwargs: http_client(
        transport=httpx.MockTransport(respond), **kwargs,
    ))
    result = await ai_service.run_profile(provider, messages)

    assert result["content"] == "ok"
    assert result["model"] == "resolved-model"
    assert result["tokens_used"] == 15
    config = public_settings(AISettingsInput(revision=1, profiles=[provider], routes={}))
    assert config.profiles[0].has_api_key is True
    assert "test-key" not in config.model_dump_json()


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", [Provider.CODEX, Provider.CLAUDE_CODE])
async def test_cli_replies_from_an_isolated_subprocess(tmp_path, monkeypatch, provider):
    command = "codex" if provider is Provider.CODEX else "claude"
    executable = tmp_path / command
    executable.write_text("""#!/bin/sh
cat >/dev/null
if [ "$(basename "$0")" = "codex" ]; then
  while [ "$#" -gt 0 ]; do
    if [ "$1" = "--output-last-message" ]; then
      printf '%s' 'codex reply' > "$2"
      exit 0
    fi
    shift
  done
  exit 1
fi
printf '%s' '{"result":"claude reply","is_error":false,"usage":{"input_tokens":3,"output_tokens":7}}'
""")
    executable.chmod(0o700)
    monkeypatch.setenv("PATH", f"{tmp_path}:/bin:/usr/bin")
    configured = AIProfileInput(id=uuid4(), name=command, provider=provider)

    result = await ai_service.run_profile(configured, [{"role": "user", "content": "hello"}])
    assert result["content"] == f"{command} reply"


@pytest.mark.asyncio
async def test_invalid_structured_response_is_provider_failure(monkeypatch):
    monkeypatch.setattr(ai_service, "_responses", AsyncMock(return_value=("hello", "model", {})))

    with pytest.raises(ai_service.ProviderError, match="JSON"):
        await ai_service.run_profile(profile("model"), [], AIFeature.EXERCISE_GENERATION)
