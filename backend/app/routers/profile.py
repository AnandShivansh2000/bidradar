from fastapi import APIRouter
from ..database import get_db
from ..models.profile import UserProfile
from ..services.relevance_engine import rescore_all

router = APIRouter(prefix="/profile", tags=["profile"])

DEFAULT_PROFILE = {
    "naics_codes": ["541512", "541511"],
    "certifications": [],
    "value_min": None,
    "value_max": None,
    "states": [],
    "keywords": [],
    "email": "",
    "digest_enabled": True,
    "digest_time": "07:00",
    "alert_threshold_hours": 48,
}


@router.get("")
async def get_profile():
    db = get_db()
    doc = await db["user_profile"].find_one({})
    if not doc:
        await db["user_profile"].insert_one(DEFAULT_PROFILE.copy())
        return DEFAULT_PROFILE
    doc.pop("_id", None)
    return doc


@router.put("")
async def update_profile(profile: UserProfile):
    db = get_db()
    data = profile.model_dump()
    await db["user_profile"].replace_one({}, data, upsert=True)
    await rescore_all(db)
    return data
