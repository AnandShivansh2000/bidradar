import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from .services import notification_service

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


def setup_scheduler():
    scheduler.add_job(
        run_all_portals_scan,
        CronTrigger(hour=6, minute=0),
        id="daily_scan",
    )
    scheduler.add_job(
        notification_service.daily_digest_job,
        CronTrigger(hour=7, minute=0),
        id="daily_digest",
    )
    scheduler.add_job(
        notification_service.check_and_send_alerts,
        IntervalTrigger(hours=6),
        id="alert_check",
    )
