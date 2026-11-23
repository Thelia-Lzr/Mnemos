"""Encrypted personal OpenRouter credentials."""
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import UserAiCredential


OPENROUTER_URL = "https://openrouter.ai/api/v1"


def get_credential_cipher() -> Fernet | None:
    try:
        return Fernet(settings.AI_CREDENTIAL_ENCRYPTION_KEY.encode("ascii"))
    except ValueError:
        return None


async def get_personal_api_key(db: AsyncSession, user_id: str) -> str | None:
    credential = await db.get(UserAiCredential, UUID(str(user_id)))
    if credential is None:
        return None

    cipher = get_credential_cipher()
    if cipher is None:
        raise ValueError("Personal AI credentials are unavailable")
    try:
        return cipher.decrypt(credential.encrypted_api_key.encode("ascii")).decode("ascii")
    except InvalidToken:
        raise ValueError("Personal AI credential could not be decrypted") from None
