"""
Demo seed script for BidRadar.
Run from backend/: python scripts/seed_demo.py [--reset]
"""
import argparse
import asyncio
import os
import random
import sys
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "bidradar")

TITLES = [
    "Cybersecurity Operations Support Services",
    "IT Modernization & Cloud Migration",
    "Zero Trust Architecture Implementation",
    "Enterprise Network Security Assessment",
    "Cloud Infrastructure Services",
    "Software Development Services",
    "Data Analytics Platform Development",
    "Secure Communications Systems Integration",
    "Penetration Testing and Vulnerability Assessment",
    "Identity and Access Management Services",
    "SOC-as-a-Service",
    "DevSecOps Pipeline Implementation",
    "ERP Modernization",
    "NOC Support Services",
    "AI/ML Platform Services",
    "Statewide IT Infrastructure Upgrade",
    "Emergency Communications Systems",
]

SAM_AGENCIES = [
    "Department of Defense (DoD)",
    "Department of Homeland Security",
    "General Services Administration",
    "Defense Information Systems Agency (DISA)",
    "Department of the Army",
    "Department of the Navy",
    "Department of Veterans Affairs",
]

CAL_AGENCIES = [
    "California Department of Technology (CalTech)",
    "California Department of Transportation (Caltrans)",
    "California Department of Public Health (CDPH)",
    "California Office of Emergency Services (CalOES)",
    "California Department of General Services (DGS)",
]

TX_AGENCIES = [
    "Texas Division of Emergency Management (TDEM)",
    "Texas Department of Transportation (TxDOT)",
    "Texas Health and Human Services Commission (HHSC)",
    "Department of Information Resources (DIR)",
    "Texas Department of Public Safety (DPS)",
]

NAICS_SAM = ["541512", "541511", "518210"]
NAICS_CAL = ["541512", "541511", "518210"]
NAICS_TX = ["541512", "541511", "541519"]

SET_ASIDES_POOL = [
    ["8a"],
    ["hubzone"],
    ["sdvosb"],
    ["8a", "sdvosb"],
    ["wosb"],
    [],
    [],
    [],
]


def _pick_title(used: set) -> str:
    remaining = [t for t in TITLES if t not in used]
    if not remaining:
        remaining = TITLES
    t = random.choice(remaining)
    used.add(t)
    return t


def _value_range(label: str):
    if label == "High":
        vmin = random.choice([500000, 750000, 1000000, 2000000])
        vmax = vmin * random.choice([2, 3, 5])
    elif label == "Medium":
        vmin = random.choice([100000, 250000, 300000])
        vmax = vmin * random.choice([2, 4])
    else:
        vmin = random.choice([25000, 50000, 75000])
        vmax = vmin * random.choice([2, 3])
    return vmin, vmax


def _value_display(vmin: int, vmax: int) -> str:
    def fmt(v):
        if v >= 1_000_000:
            return f"${v // 1_000_000}M"
        return f"${v // 1_000}K"
    return f"{fmt(vmin)}–{fmt(vmax)}"


def _build_opportunities(now: datetime) -> list:
    opps = []
    used_titles: set = set()

    # Hero record (always first, SAM.gov, urgent)
    hero_deadline = now + timedelta(days=random.randint(1, 2))
    hero = {
        "external_id": "DISA-26-R-0047",
        "portal": "sam_gov",
        "title": "Cybersecurity Zero Trust Architecture — Enterprise Support",
        "agency": "Department of Defense (DISA)",
        "solicitation_number": "DISA-26-R-0047",
        "naics_codes": ["541512"],
        "set_asides": ["8a", "sdvosb"],
        "value_min": 1000000,
        "value_max": 5000000,
        "value_display": "$1M–$5M",
        "state": "VA",
        "response_deadline": hero_deadline,
        "posted_date": now - timedelta(days=3),
        "description": (
            "Enterprise-wide Zero Trust Architecture implementation and ongoing support "
            "for DISA infrastructure. Scope includes identity management, micro-segmentation, "
            "continuous monitoring, and SASE deployment across classified and unclassified networks."
        ),
        "opportunity_url": "https://sam.gov/opp/DISA-26-R-0047",
        "relevance_score": 0.95,
        "relevance_label": "High",
        "is_urgent": True,
        "urgency_tier": "urgent",
        "days_until_deadline": (hero_deadline - now).days,
        "alert_sent_at": None,
        "relevance_reasons": ["NAICS match", "Certification match", "Value range match", "Geography match", "Keywords: cybersecurity, zero trust"],
        "scan_id": None,
        "created_at": now,
        "updated_at": now,
    }
    opps.append(hero)
    used_titles.add(hero["title"])

    # Urgency pool: 3 urgent (1-2 days), 2 closing_soon (4-6 days), rest 10-90 days
    # hero already covers 1 urgent slot
    urgent_deadlines = [now + timedelta(days=random.randint(1, 2)) for _ in range(2)]
    closing_deadlines = [now + timedelta(days=random.randint(4, 6)) for _ in range(2)]
    normal_deadlines_pool = [now + timedelta(days=random.randint(10, 90)) for _ in range(50)]
    urgency_pool = urgent_deadlines + closing_deadlines + normal_deadlines_pool

    # Relevance distribution: 20 High (0.70-0.95), 20 Medium (0.35-0.65), 10 Low (0.10-0.30)
    # Hero is already High; we need 19 more High, 20 Medium, 10 Low = 49 more
    relevance_pool = (
        [("High", round(random.uniform(0.70, 0.95), 2)) for _ in range(19)] +
        [("Medium", round(random.uniform(0.35, 0.65), 2)) for _ in range(20)] +
        [("Low", round(random.uniform(0.10, 0.30), 2)) for _ in range(10)]
    )
    random.shuffle(relevance_pool)

    urgency_idx = 0

    def _next_deadline(tier: str):
        nonlocal urgency_idx
        if tier == "urgent":
            return urgent_deadlines[min(urgency_idx, len(urgent_deadlines) - 1)]
        elif tier == "closing_soon":
            idx = urgency_idx - len(urgent_deadlines)
            return closing_deadlines[min(max(idx, 0), len(closing_deadlines) - 1)]
        else:
            return now + timedelta(days=random.randint(10, 90))

    # 25 SAM.gov (indices 0-24 of remaining = 24 since hero is index 0)
    for i in range(24):
        label, score = relevance_pool[i]
        title = _pick_title(used_titles)
        agency = random.choice(SAM_AGENCIES)
        naics = random.sample(NAICS_SAM, k=random.randint(1, 2))
        set_asides = random.choice(SET_ASIDES_POOL)
        vmin, vmax = _value_range(label)
        states = ["VA", "DC", "MD", "TX", "CA", "GA", "CO"]
        state = random.choice(states)

        if urgency_idx < 2:
            deadline = urgent_deadlines[urgency_idx]
            urgency_tier = "urgent"
            is_urgent = True
        elif urgency_idx < 4:
            deadline = closing_deadlines[urgency_idx - 2]
            urgency_tier = "closing_soon"
            is_urgent = False
        else:
            deadline = now + timedelta(days=random.randint(10, 90))
            urgency_tier = "normal"
            is_urgent = False
        urgency_idx += 1

        ext_id = f"SAM-26-{1000 + i:04d}"
        opp = {
            "external_id": ext_id,
            "portal": "sam_gov",
            "title": title,
            "agency": agency,
            "solicitation_number": f"SOL-{ext_id}",
            "naics_codes": naics,
            "set_asides": set_asides,
            "value_min": vmin,
            "value_max": vmax,
            "value_display": _value_display(vmin, vmax),
            "state": state,
            "response_deadline": deadline,
            "posted_date": now - timedelta(days=random.randint(1, 14)),
            "description": f"{title} — federal procurement opportunity supporting {agency} mission objectives.",
            "opportunity_url": f"https://sam.gov/opp/{ext_id}",
            "relevance_score": score,
            "relevance_label": label,
            "is_urgent": is_urgent,
            "urgency_tier": urgency_tier,
            "days_until_deadline": (deadline - now).days,
            "alert_sent_at": None,
            "relevance_reasons": [],
            "scan_id": None,
            "created_at": now,
            "updated_at": now,
        }
        opps.append(opp)

    # 15 Cal eProcure
    for i in range(15):
        idx = 24 + i
        label, score = relevance_pool[idx]
        title = _pick_title(used_titles)
        agency = random.choice(CAL_AGENCIES)
        naics = random.sample(NAICS_CAL, k=random.randint(1, 2))
        set_asides = random.choice(SET_ASIDES_POOL)
        vmin, vmax = _value_range(label)
        deadline = now + timedelta(days=random.randint(10, 90))
        ext_id = f"CAL-26-{2000 + i:04d}"
        opp = {
            "external_id": ext_id,
            "portal": "cal_eprocure",
            "title": title,
            "agency": agency,
            "solicitation_number": f"CAL-{ext_id}",
            "naics_codes": naics,
            "set_asides": set_asides,
            "value_min": vmin,
            "value_max": vmax,
            "value_display": _value_display(vmin, vmax),
            "state": "CA",
            "response_deadline": deadline,
            "posted_date": now - timedelta(days=random.randint(1, 14)),
            "description": f"{title} — California state procurement opportunity for {agency}.",
            "opportunity_url": f"https://caleprocure.ca.gov/opp/{ext_id}",
            "relevance_score": score,
            "relevance_label": label,
            "is_urgent": False,
            "urgency_tier": "normal",
            "days_until_deadline": (deadline - now).days,
            "alert_sent_at": None,
            "relevance_reasons": [],
            "scan_id": None,
            "created_at": now,
            "updated_at": now,
        }
        opps.append(opp)

    # 10 Texas SmartBuy
    for i in range(10):
        idx = 39 + i
        label, score = relevance_pool[idx]
        title = _pick_title(used_titles)
        agency = random.choice(TX_AGENCIES)
        naics = random.sample(NAICS_TX, k=random.randint(1, 2))
        set_asides = random.choice(SET_ASIDES_POOL)
        vmin, vmax = _value_range(label)
        deadline = now + timedelta(days=random.randint(10, 90))
        ext_id = f"TX-26-{3000 + i:04d}"
        opp = {
            "external_id": ext_id,
            "portal": "tx_smartbuy",
            "title": title,
            "agency": agency,
            "solicitation_number": f"TX-{ext_id}",
            "naics_codes": naics,
            "set_asides": set_asides,
            "value_min": vmin,
            "value_max": vmax,
            "value_display": _value_display(vmin, vmax),
            "state": "TX",
            "response_deadline": deadline,
            "posted_date": now - timedelta(days=random.randint(1, 14)),
            "description": f"{title} — Texas state procurement opportunity for {agency}.",
            "opportunity_url": f"https://txsmartbuy.gov/opp/{ext_id}",
            "relevance_score": score,
            "relevance_label": label,
            "is_urgent": False,
            "urgency_tier": "normal",
            "days_until_deadline": (deadline - now).days,
            "alert_sent_at": None,
            "relevance_reasons": [],
            "scan_id": None,
            "created_at": now,
            "updated_at": now,
        }
        opps.append(opp)

    return opps


async def seed(reset: bool = False):
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB]

    if reset:
        await db["opportunities"].delete_many({})
        await db["user_profile"].delete_many({})
        await db["scans"].delete_many({"_id": {"$exists": True}})
        print("Reset: cleared opportunities, profiles, and scan records.")

    now = datetime.utcnow()

    # Upsert demo profile
    demo_profile = {
        "naics_codes": ["541512", "541511"],
        "certifications": ["8a", "hubzone"],
        "value_min": 100000,
        "value_max": 10000000,
        "states": ["CA", "TX", "VA", "DC", "MD"],
        "keywords": ["cybersecurity", "IT modernization", "cloud", "zero trust"],
        "email": "demo@bidradar.io",
        "digest_enabled": True,
        "digest_time": "07:00",
        "alert_threshold_hours": 48,
    }
    await db["user_profile"].replace_one({}, demo_profile, upsert=True)

    # Seed 50 opportunities
    opps = _build_opportunities(now)
    seeded = 0
    existed = 0
    for opp in opps:
        ext_id = opp["external_id"]
        portal = opp["portal"]
        result = await db["opportunities"].update_one(
            {"external_id": ext_id, "portal": portal},
            {"$setOnInsert": opp},
            upsert=True,
        )
        if result.upserted_id:
            seeded += 1
        else:
            existed += 1

    # Seed completed scan records for each portal
    for portal_name in ["sam_gov", "cal_eprocure", "tx_smartbuy"]:
        existing = await db["scans"].find_one({"portal": portal_name, "status": "completed"})
        if not existing:
            portal_count = sum(1 for o in opps if o["portal"] == portal_name)
            await db["scans"].insert_one({
                "portal": portal_name,
                "status": "completed",
                "started_at": now - timedelta(hours=2),
                "completed_at": now - timedelta(hours=1),
                "opportunities_found": portal_count,
                "opportunities_new": portal_count,
                "opportunities_updated": 0,
                "opportunities_skipped": 0,
                "error_message": None,
                "tinyfish_session_id": f"demo-session-{portal_name}",
                "stream_url": None,
            })

    print(f"Seeded {seeded} opportunities | {existed} already existed | Demo profile upserted")
    client.close()


def main():
    parser = argparse.ArgumentParser(description="Seed BidRadar demo data")
    parser.add_argument("--reset", action="store_true", help="Wipe and re-seed all demo data")
    args = parser.parse_args()
    asyncio.run(seed(reset=args.reset))


if __name__ == "__main__":
    main()
