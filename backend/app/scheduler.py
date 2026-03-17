import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_all_portals_scan():
    """Run scans for all 3 portals sequentially."""
    from .database import get_db
    from .agents.sam_gov_agent import SamGovAgent
    from .agents.cal_eprocure_agent import CalEprocureAgent
    from .agents.tx_smartbuy_agent import TxSmartbuyAgent
    from datetime import datetime

    db = get_db()
    portals = [
        ("sam_gov", SamGovAgent),
        ("cal_eprocure", CalEprocureAgent),
        ("tx_smartbuy", TxSmartbuyAgent),
    ]
    for portal_name, AgentClass in portals:
        scan_doc = {
            "portal": portal_name,
            "status": "running",
            "started_at": datetime.utcnow(),
            "completed_at": None,
            "opportunities_found": 0,
            "opportunities_new": 0,
            "opportunities_updated": 0,
            "opportunities_skipped": 0,
            "error_message": None,
            "tinyfish_session_id": None,
            "stream_url": None,
        }
        result = await db["scans"].insert_one(scan_doc)
        scan_id = str(result.inserted_id)
        agent = AgentClass(db)
        try:
            await agent.run_scan(scan_id)
        except Exception as e:
            logger.error(f"Error running scan for {portal_name}: {e}")


async def send_daily_digest():
    """Send daily digest email."""
    from .database import get_db
    from .services.notification_service import send_digest
    from .models.profile import UserProfile

    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)

    if not profile.digest_enabled:
        return

    cursor = db["opportunities"].find({"relevance_label": "High"}).sort("relevance_score", -1).limit(20)
    opps = [doc async for doc in cursor]
    for doc in opps:
        doc["id"] = str(doc.pop("_id"))

    await send_digest(opps, profile)


async def check_and_send_alerts():
    """Check for urgent opportunities and send alerts."""
    from .database import get_db
    from .services.notification_service import send_alert
    from .models.profile import UserProfile
    from datetime import datetime, timedelta

    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)

    threshold = datetime.utcnow() + timedelta(hours=profile.alert_threshold_hours)
    cursor = db["opportunities"].find({
        "response_deadline": {"$lte": threshold},
        "is_urgent": True,
        "alert_sent_at": None,
    })
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id", ""))
        await send_alert(doc, profile)
        await db["opportunities"].update_one(
            {"external_id": doc["external_id"], "portal": doc["portal"]},
            {"$set": {"alert_sent_at": datetime.utcnow()}},
        )


def setup_scheduler():
    scheduler.add_job(run_all_portals_scan, CronTrigger(hour=6, minute=0), id="daily_scan")
    scheduler.add_job(send_daily_digest, CronTrigger(hour=7, minute=0), id="daily_digest")
    scheduler.add_job(check_and_send_alerts, IntervalTrigger(hours=6), id="alert_check")
