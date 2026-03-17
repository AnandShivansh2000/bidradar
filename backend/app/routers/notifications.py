from fastapi import APIRouter
from ..database import get_db
from ..services.notification_service import send_digest, send_alert
from ..models.profile import UserProfile

router = APIRouter(prefix="/notifications", tags=["notifications"])

DEFAULT_PROFILE = UserProfile()


@router.post("/test-digest")
async def test_digest():
    db = get_db()
    cursor = db["opportunities"].find({"relevance_label": "High"}).sort("relevance_score", -1).limit(10)
    opps = [doc async for doc in cursor]
    for doc in opps:
        doc["id"] = str(doc.pop("_id"))

    profile_doc = await db["user_profile"].find_one({})
    profile = UserProfile(**(profile_doc or {})) if profile_doc else DEFAULT_PROFILE

    success = await send_digest(opps, profile)
    return {"success": success, "opportunities_included": len(opps)}


@router.post("/test-alert")
async def test_alert():
    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    profile = UserProfile(**(profile_doc or {})) if profile_doc else DEFAULT_PROFILE

    sample_opp = {
        "title": "Test Alert Opportunity",
        "agency": "Test Agency",
        "portal": "sam_gov",
        "relevance_score": 0.9,
        "relevance_label": "High",
    }
    success = await send_alert(sample_opp, profile)
    return {"success": success}
