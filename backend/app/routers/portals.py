from fastapi import APIRouter
from ..database import get_db

router = APIRouter(prefix="/portals", tags=["portals"])

PORTALS = [
    {
        "id": "sam_gov",
        "name": "SAM.gov",
        "description": "Federal procurement portal",
        "status": "active",
    },
    {
        "id": "cal_eprocure",
        "name": "Cal eProcure",
        "description": "California state procurement",
        "status": "active",
    },
    {
        "id": "tx_smartbuy",
        "name": "Texas SmartBuy",
        "description": "Texas state procurement",
        "status": "active",
    },
]


@router.get("")
async def list_portals():
    db = get_db()
    result = []
    for portal in PORTALS:
        portal_id = portal["id"]
        last_scan = await db["scans"].find_one(
            {"portal": portal_id},
            sort=[("started_at", -1)],
        )
        last_successful = await db["scans"].find_one(
            {"portal": portal_id, "status": "completed"},
            sort=[("completed_at", -1)],
        )
        opp_count = await db["opportunities"].count_documents({"portal": portal_id})
        result.append({
            **portal,
            "last_scanned_at": last_scan["started_at"].isoformat() if last_scan else None,
            "last_successful_scan_at": last_successful["completed_at"].isoformat() if last_successful and last_successful.get("completed_at") else None,
            "opportunities_count": opp_count,
        })
    return result
