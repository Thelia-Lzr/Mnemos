"""工作台 AI 配置及单配置连接测试。"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.ai import AISettingsInput, AISettingsView
from app.services.ai_service import ProviderError, run_profile
from app.services.ai_settings import SettingsConflict, find_profile, load_ai_settings, public_settings, save_ai_settings

router = APIRouter(prefix="/api/ai-settings", tags=["AI 配置"])


@router.get("", response_model=AISettingsView)
async def read_settings(db: AsyncSession = Depends(get_db)):
    return public_settings(await load_ai_settings(db))


@router.put("", response_model=AISettingsView)
async def update_settings(config: AISettingsInput, db: AsyncSession = Depends(get_db)):
    try:
        return await save_ai_settings(db, config)
    except SettingsConflict:
        raise HTTPException(status_code=409, detail="AI 配置已在另一窗口更新，请重新加载后再保存。") from None


@router.post("/profiles/{profile_id}/test")
async def test_connection(profile_id: UUID, db: AsyncSession = Depends(get_db)):
    config = await load_ai_settings(db)
    await db.rollback()
    profile = find_profile(config, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="请先保存此配置。")
    try:
        result = await run_profile(profile, [{"role": "user", "content": "Reply with OK."}])
    except ProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None
    return {"model": result["model"], "processing_time": result["processing_time"]}
