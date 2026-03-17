from fastapi import APIRouter
from ..database import get_db
from ..models.profile import UserProfile
from ..services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])

DEFAULT_PROFILE = UserProfile()

_DEMO_OPPS = [
    {
        "id": "demo-1",
        "title": "Cybersecurity Zero Trust Architecture — Enterprise Support",
        "agency": "Department of Defense (DISA)",
        "portal": "sam_gov",
        "relevance_score": 0.95,
        "relevance_label": "High",
        "value_display": "$1M–$5M",
        "state": "VA",
        "description": "Enterprise-wide Zero Trust Architecture implementation support for DISA infrastructure, including identity management, micro-segmentation, and continuous monitoring.",
        "opportunity_url": "https://sam.gov",
        "solicitation_number": "DISA-26-R-0047",
    },
    {
        "id": "demo-2",
        "title": "IT Modernization & Cloud Migration",
        "agency": "Department of Homeland Security",
        "portal": "sam_gov",
        "relevance_score": 0.88,
        "relevance_label": "High",
        "value_display": "$500K–$2M",
        "state": "DC",
        "description": "Cloud migration and IT modernization services for DHS legacy systems including AWS GovCloud deployment and DevSecOps implementation.",
        "opportunity_url": "https://sam.gov",
        "solicitation_number": "DHS-26-T-0091",
    },
]


@router.post("/test-digest")
async def test_digest():
    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if profile_doc:
        profile_doc.pop("_id", None)
        profile = UserProfile(**profile_doc)
    else:
        profile = DEFAULT_PROFILE

    # Fetch top 5 high-relevance opps from DB
    cursor = db["opportunities"].find(
        {"relevance_label": {"$in": ["High", "Medium"]}}
    ).sort("relevance_score", -1).limit(5)
    opps = [doc async for doc in cursor]
    for doc in opps:
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))

    # Fall back to demo data if empty
    if not opps:
        opps = _DEMO_OPPS

    success = await notification_service.send_daily_digest(profile)
    return {
        "message": f"Digest sent to {profile.email or 'no-email'}",
        "opportunities_count": len(opps),
    }


@router.post("/test-alert")
async def test_alert():
    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if profile_doc:
        profile_doc.pop("_id", None)
        profile = UserProfile(**profile_doc)
    else:
        profile = DEFAULT_PROFILE

    from datetime import datetime, timedelta

    # Find the most urgent opportunity (soonest deadline, High or Medium)
    opp_doc = await db["opportunities"].find_one(
        {
            "relevance_label": {"$in": ["High", "Medium"]},
            "response_deadline": {"$ne": None},
        },
        sort=[("response_deadline", 1)],
    )

    if opp_doc:
        opp_id = str(opp_doc.pop("_id"))
        opp_doc["id"] = opp_id
        # Bypass alert_sent_at check for testing — use send_deadline_alert directly
        success = await notification_service.send_deadline_alert(opp_doc, profile)
        return {
            "message": f"Alert sent for: {opp_doc.get('title', 'Unknown')}",
            "opportunity_id": opp_id,
        }
    else:
        # Demo fallback
        demo_opp = {
            **_DEMO_OPPS[0],
            "response_deadline": datetime.utcnow() + timedelta(hours=20),
            "external_id": "demo-alert-1",
        }
        success = await notification_service.send_deadline_alert(demo_opp, profile)
        return {
            "message": f"Alert sent for: {demo_opp['title']}",
            "opportunity_id": "demo-1",
        }
