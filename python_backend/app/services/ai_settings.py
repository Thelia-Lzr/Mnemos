"""读取和保存工作台级别的 AI 设置。"""
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workspace import WorkspaceSettings
from app.schemas.ai import AIProfileInput, AIProfileView, AISettingsInput, AISettingsView, Provider


class SettingsConflict(Exception):
    """另一个窗口已保存了更新。"""


async def load_ai_settings(db: AsyncSession) -> AISettingsInput:
    revision, data = (await db.execute(
        select(WorkspaceSettings.ai_revision, WorkspaceSettings.ai_settings)
        .where(WorkspaceSettings.id == 1)
    )).one()
    return AISettingsInput(revision=revision, **(data or {"profiles": [], "routes": {}}))


def public_settings(config: AISettingsInput) -> AISettingsView:
    return AISettingsView(
        revision=config.revision,
        profiles=[
            AIProfileView(
                **profile.model_dump(exclude={"api_key"}),
                has_api_key=bool(profile.api_key),
            )
            for profile in config.profiles
        ],
        routes=config.routes,
    )


async def save_ai_settings(db: AsyncSession, config: AISettingsInput) -> AISettingsView:
    current = await load_ai_settings(db)
    if current.revision != config.revision:
        raise SettingsConflict

    previous = {profile.id: profile for profile in current.profiles}
    for profile in config.profiles:
        old = previous.get(profile.id)
        if profile.provider is not Provider.RESPONSES:
            profile.api_key = None
        elif (
            "api_key" not in profile.model_fields_set and old
            and old.provider is profile.provider and old.endpoint == profile.endpoint
        ):
            profile.api_key = old.api_key

    data = config.model_dump(mode="json", exclude={"revision"})
    for profile_data, profile in zip(data["profiles"], config.profiles):
        profile_data["api_key"] = profile.api_key.get_secret_value() if profile.api_key else None

    updated = await db.execute(
        update(WorkspaceSettings)
        .where(WorkspaceSettings.id == 1, WorkspaceSettings.ai_revision == config.revision)
        .values(ai_settings=data, ai_revision=WorkspaceSettings.ai_revision + 1)
        .returning(WorkspaceSettings.ai_revision)
    )
    revision = updated.scalar_one_or_none()
    if revision is None:
        raise SettingsConflict
    await db.commit()
    config.revision = revision
    return public_settings(config)


def find_profile(config: AISettingsInput, profile_id: UUID) -> AIProfileInput | None:
    return next((profile for profile in config.profiles if profile.id == profile_id), None)
