from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from bson import ObjectId

from ..database import get_db
from ..models.scan import ScanCreate

router = APIRouter(prefix="/scans", tags=["scans"])


def _doc_to_scan(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def _doc_to_opp(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/demo-replay")
async def demo_replay():
    now = datetime.utcnow()
    opps = [
        {
            "id": "demo-1",
            "external_id": "demo-cybersec-001",
            "portal": "sam_gov",
            "title": "Cybersecurity Operations Support Services",
            "agency": "DoD",
            "naics_codes": ["541512"],
            "set_asides": ["8a"],
            "value_display": "$2.5M",
            "value_min": 2500000.0,
            "value_max": None,
            "state": "VA",
            "response_deadline": (now + timedelta(days=1)).isoformat(),
            "posted_date": (now - timedelta(days=5)).isoformat(),
            "description": "DoD seeks cybersecurity operations support for 24/7 monitoring and incident response.",
            "opportunity_url": "https://sam.gov/opp/demo-001",
            "solicitation_number": "W52P1J-26-R-0001",
            "relevance_score": 0.92,
            "relevance_label": "High",
            "relevance_reasons": ["NAICS 541512 matches profile", "8(a) set-aside matches certification"],
            "days_until_deadline": 1,
            "urgency_tier": "urgent",
            "is_urgent": True,
            "alert_sent_at": None,
            "scan_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "demo-2",
            "external_id": "demo-itmod-002",
            "portal": "sam_gov",
            "title": "IT Modernization & Cloud Migration",
            "agency": "GSA",
            "naics_codes": ["541511"],
            "set_asides": ["sba"],
            "value_display": "$5M–$10M",
            "value_min": 5000000.0,
            "value_max": 10000000.0,
            "state": "DC",
            "response_deadline": (now + timedelta(days=2)).isoformat(),
            "posted_date": (now - timedelta(days=3)).isoformat(),
            "description": "GSA seeks contractor to modernize legacy IT systems and migrate workloads to cloud.",
            "opportunity_url": "https://sam.gov/opp/demo-002",
            "solicitation_number": "47QRAA26R0002",
            "relevance_score": 0.88,
            "relevance_label": "High",
            "relevance_reasons": ["NAICS 541511 matches profile", "Value range in profile range"],
            "days_until_deadline": 2,
            "urgency_tier": "urgent",
            "is_urgent": True,
            "alert_sent_at": None,
            "scan_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "demo-3",
            "external_id": "demo-zerotrust-003",
            "portal": "sam_gov",
            "title": "Zero Trust Architecture Implementation",
            "agency": "DHS",
            "naics_codes": ["541512"],
            "set_asides": ["sdvosb"],
            "value_display": "$1.2M",
            "value_min": 1200000.0,
            "value_max": None,
            "state": "MD",
            "response_deadline": (now + timedelta(days=5)).isoformat(),
            "posted_date": (now - timedelta(days=2)).isoformat(),
            "description": "DHS requires zero trust architecture design and implementation across enterprise network.",
            "opportunity_url": "https://sam.gov/opp/demo-003",
            "solicitation_number": "70RDSD26R0003",
            "relevance_score": 0.85,
            "relevance_label": "High",
            "relevance_reasons": ["NAICS 541512 matches profile", "SDVOSB set-aside"],
            "days_until_deadline": 5,
            "urgency_tier": "closing_soon",
            "is_urgent": False,
            "alert_sent_at": None,
            "scan_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "demo-4",
            "external_id": "demo-netsec-004",
            "portal": "sam_gov",
            "title": "Enterprise Network Security Assessment",
            "agency": "DoD",
            "naics_codes": ["541512"],
            "set_asides": [],
            "value_display": "$800K",
            "value_min": 800000.0,
            "value_max": None,
            "state": "VA",
            "response_deadline": (now + timedelta(days=10)).isoformat(),
            "posted_date": (now - timedelta(days=1)).isoformat(),
            "description": "DoD requires enterprise network security assessment and vulnerability analysis.",
            "opportunity_url": "https://sam.gov/opp/demo-004",
            "solicitation_number": "W911NF26R0004",
            "relevance_score": 0.87,
            "relevance_label": "High",
            "relevance_reasons": ["NAICS 541512 matches profile", "State VA matches profile"],
            "days_until_deadline": 10,
            "urgency_tier": "normal",
            "is_urgent": False,
            "alert_sent_at": None,
            "scan_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "demo-5",
            "external_id": "demo-swdev-005",
            "portal": "sam_gov",
            "title": "Software Development Services — DISA",
            "agency": "DISA",
            "naics_codes": ["541511"],
            "set_asides": [],
            "value_display": "$500K",
            "value_min": 500000.0,
            "value_max": None,
            "state": "MD",
            "response_deadline": (now + timedelta(days=14)).isoformat(),
            "posted_date": (now - timedelta(days=7)).isoformat(),
            "description": "DISA seeks software development services for enterprise application modernization.",
            "opportunity_url": "https://sam.gov/opp/demo-005",
            "solicitation_number": "HC102826R0005",
            "relevance_score": 0.55,
            "relevance_label": "Medium",
            "relevance_reasons": ["NAICS 541511 matches profile"],
            "days_until_deadline": 14,
            "urgency_tier": "normal",
            "is_urgent": False,
            "alert_sent_at": None,
            "scan_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        },
    ]
    return opps


@router.get("")
async def list_scans():
    db = get_db()
    portals = ["sam_gov", "cal_eprocure", "tx_smartbuy"]
    result = []
    for portal in portals:
        cursor = db["scans"].find({"portal": portal}).sort("started_at", -1).limit(10)
        async for doc in cursor:
            result.append(_doc_to_scan(doc))
    return result


@router.get("/{scan_id}/opportunities")
async def get_scan_opportunities(scan_id: str):
    db = get_db()
    cursor = db["opportunities"].find({"scan_id": scan_id})
    return [_doc_to_opp(doc) async for doc in cursor]


@router.get("/{scan_id}")
async def get_scan(scan_id: str):
    db = get_db()
    doc = await db["scans"].find_one({"_id": ObjectId(scan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Scan not found")
    return _doc_to_scan(doc)


async def _run_scan_with_relevance(agent, scan_id: str):
    """Run a scan then score all resulting opportunities."""
    from ..services.relevance_engine import RelevanceEngine
    from ..database import get_db as _get_db
    db = _get_db()
    await agent.run_scan(scan_id)
    engine = RelevanceEngine(db)
    await engine.score_all(scan_id)


@router.post("/trigger")
async def trigger_scan(portal: str = Query(default="sam_gov"), background_tasks: BackgroundTasks = None):
    db = get_db()
    now = datetime.utcnow()
    scan_doc = {
        "portal": portal,
        "status": "running",
        "started_at": now,
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

    if background_tasks:
        if portal == "sam_gov":
            from ..agents.sam_gov_agent import SamGovAgent
            agent = SamGovAgent(db)
            background_tasks.add_task(_run_scan_with_relevance, agent, scan_id)
        elif portal == "cal_eprocure":
            from ..agents.cal_eprocure_agent import CalEprocureAgent
            agent = CalEprocureAgent(db)
            background_tasks.add_task(_run_scan_with_relevance, agent, scan_id)
        elif portal == "tx_smartbuy":
            from ..agents.tx_smartbuy_agent import TxSmartbuyAgent
            agent = TxSmartbuyAgent(db)
            background_tasks.add_task(_run_scan_with_relevance, agent, scan_id)

    scan_doc["id"] = scan_id
    scan_doc.pop("_id", None)
    return scan_doc


@router.post("/cal_eprocure")
async def trigger_cal_eprocure_scan(background_tasks: BackgroundTasks):
    db = get_db()
    now = datetime.utcnow()
    scan_doc = {
        "portal": "cal_eprocure",
        "status": "running",
        "started_at": now,
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

    from ..agents.cal_eprocure_agent import CalEprocureAgent
    agent = CalEprocureAgent(db)
    background_tasks.add_task(_run_scan_with_relevance, agent, scan_id)

    scan_doc["id"] = scan_id
    scan_doc.pop("_id", None)
    return scan_doc


@router.post("/tx_smartbuy")
async def trigger_tx_smartbuy_scan(background_tasks: BackgroundTasks):
    db = get_db()
    now = datetime.utcnow()
    scan_doc = {
        "portal": "tx_smartbuy",
        "status": "running",
        "started_at": now,
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

    from ..agents.tx_smartbuy_agent import TxSmartbuyAgent
    agent = TxSmartbuyAgent(db)
    background_tasks.add_task(_run_scan_with_relevance, agent, scan_id)

    scan_doc["id"] = scan_id
    scan_doc.pop("_id", None)
    return scan_doc
