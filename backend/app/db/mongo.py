from typing import Sequence
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models import (
    User,
    Candidate,
    JobRole,
    Repo,
    Project,
    Form,
    FormResponse,
    Task,
    XPEvent,
)

_client: AsyncIOMotorClient | None = None


async def init_mongo() -> bool:
    """Initialize Mongo/Beanie if a URI is configured.
    Returns True if initialized, False if skipped (no URI).
    """
    global _client
    if not settings.MONGODB_URI:
        print("[mongo] MONGODB_URI not set; skipping database initialization (dev mode)")
        return False
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = _client[settings.MONGODB_DB]
    await init_beanie(
        database=db,
        document_models=[
            User,
            Candidate,
            JobRole,
            Repo,
            Project,
            Form,
            FormResponse,
            Task,
            XPEvent,
        ],
    )
    return True


def get_client() -> AsyncIOMotorClient:
    assert _client is not None, "Mongo client not initialized"
    return _client
