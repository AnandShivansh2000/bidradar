import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "bidradar")

_client: AsyncIOMotorClient = None


def get_client() -> AsyncIOMotorClient:
    return _client


def get_db():
    return _client[MONGODB_DB]


async def connect_db():
    global _client
    _client = AsyncIOMotorClient(MONGODB_URI)
    db = _client[MONGODB_DB]
    await _create_indexes(db)


async def disconnect_db():
    global _client
    if _client:
        _client.close()
        _client = None


async def _create_indexes(db):
    # opportunities indexes
    opp_col = db["opportunities"]
    await opp_col.create_index([("external_id", 1), ("portal", 1)], unique=True)
    await opp_col.create_index("portal")
    await opp_col.create_index("relevance_score")
    await opp_col.create_index("response_deadline")
    await opp_col.create_index("posted_date")
    await opp_col.create_index("is_urgent")

    # scans indexes
    scan_col = db["scans"]
    await scan_col.create_index("portal")
    await scan_col.create_index("started_at")

    # user_profile index
    profile_col = db["user_profile"]
    await profile_col.create_index("_id")
