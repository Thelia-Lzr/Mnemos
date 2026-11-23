"""Manage the signed-in user's OpenRouter key without returning the secret."""
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User, UserAiCredential
from app.services.ai_credentials import OPENROUTER_URL, get_credential_cipher

router = APIRouter(prefix="/api/users/ai-settings", tags=["AI API 设置"])


class AiSettings(BaseModel):
    personalKey: bool
    serverKey: bool
    canSavePersonalKey: bool


def settings_status(personal_key: bool) -> AiSettings:
    return AiSettings(
        personalKey=personal_key,
        serverKey=bool(settings.OPENROUTER_API_KEY),
        canSavePersonalKey=get_credential_cipher() is not None,
    )


@router.get("", response_model=AiSettings)
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AiSettings:
    credential = await db.get(UserAiCredential, current_user.id)
    return settings_status(credential is not None)


@router.put("", status_code=204)
async def save_ai_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    cipher = get_credential_cipher()
    if cipher is None:
        raise HTTPException(503, "此服务器尚未启用个人密钥存储，请联系管理员。")

    # The shared validation handler logs invalid inputs, so parse this secret here.
    try:
        body = await request.json()
    except ValueError:
        body = None
    api_key = body.get("apiKey") if isinstance(body, dict) else None
    if not isinstance(api_key, str) or not re.fullmatch(r"sk-or-[A-Za-z0-9_-]{8,506}", api_key.strip()):
        raise HTTPException(422, "请输入有效的 OpenRouter API 密钥。")
    api_key = api_key.strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            result = await client.get(f"{OPENROUTER_URL}/key", headers={"Authorization": f"Bearer {api_key}"})
    except httpx.RequestError:
        raise HTTPException(503, "暂时无法连接 OpenRouter，请稍后重试。") from None
    if result.status_code in (401, 403):
        raise HTTPException(422, "OpenRouter 拒绝了此密钥，请检查后重试。")
    if result.status_code != 200:
        raise HTTPException(503, "OpenRouter 暂时无法验证密钥，请稍后重试。")

    encrypted_key = cipher.encrypt(api_key.encode("ascii")).decode("ascii")
    insert_key = insert(UserAiCredential).values(
        user_id=current_user.id, encrypted_api_key=encrypted_key
    )
    await db.execute(insert_key.on_conflict_do_update(
        index_elements=[UserAiCredential.user_id],
        set_={"encrypted_api_key": insert_key.excluded.encrypted_api_key},
    ))
    await db.commit()
    return Response(status_code=204)


@router.delete("", response_model=AiSettings)
async def remove_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AiSettings:
    await db.execute(delete(UserAiCredential).where(UserAiCredential.user_id == current_user.id))
    await db.commit()
    return settings_status(False)
