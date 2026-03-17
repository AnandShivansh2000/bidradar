import logging
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from ..models.profile import UserProfile

logger = logging.getLogger(__name__)


def _get_attr(obj, key, default=None):
    """Get attribute from either a dict or an object."""
    if isinstance(obj, dict):
        val = obj.get(key, default)
    else:
        val = getattr(obj, key, default)
    return val if val is not None else default


def score_opportunity(opportunity, profile) -> Tuple[float, List[str]]:
    """Score an opportunity against a user profile.

    Returns (score 0.0-1.0, reasons list).
    Works with both dict and object-style opportunities.
    """
    score = 0.0
    reasons = []

    opp_naics = _get_attr(opportunity, "naics_codes", []) or []
    opp_set_asides = _get_attr(opportunity, "set_asides", []) or []
    opp_state = _get_attr(opportunity, "state")
    opp_value_min = _get_attr(opportunity, "value_min")
    opp_value_max = _get_attr(opportunity, "value_max")
    opp_title = _get_attr(opportunity, "title", "") or ""
    opp_description = _get_attr(opportunity, "description", "") or ""

    # NAICS (40 points)
    if profile.naics_codes:
        if any(n in opp_naics for n in profile.naics_codes):
            score += 0.40
            reasons.append("NAICS match")
        elif any(n[:4] in [o[:4] for o in opp_naics] for n in profile.naics_codes):
            score += 0.20
            reasons.append("NAICS partial match")

    # Certifications (25 points)
    if profile.certifications and opp_set_asides:
        if any(c in opp_set_asides for c in profile.certifications):
            score += 0.25
            reasons.append("Certification match")
    elif not opp_set_asides:
        score += 0.10
        reasons.append("Unrestricted")

    # Value range (20 points)
    if profile.value_min is not None and profile.value_max is not None:
        opp_min = opp_value_min or 0
        opp_max = opp_value_max or float("inf")
        if opp_max >= profile.value_min and opp_min <= profile.value_max:
            score += 0.20
            reasons.append("Value range match")

    # Geography (10 points)
    if profile.states and opp_state in profile.states:
        score += 0.10
        reasons.append("Geography match")

    # Keywords (5 points)
    if profile.keywords:
        text = f"{opp_title} {opp_description}".lower()
        matched = [k for k in profile.keywords if k.lower() in text]
        if matched:
            score += min(0.05 * len(matched), 0.05)
            reasons.append(f"Keywords: {', '.join(matched)}")

    return min(score, 1.0), reasons


def score_to_label(score: float) -> str:
    if score >= 0.65:
        return "High"
    if score >= 0.35:
        return "Medium"
    return "Low"


def get_urgency_tier(days: Optional[int]) -> str:
    if days is None:
        return "normal"
    if days <= 2:
        return "urgent"
    if days <= 7:
        return "closing_soon"
    return "normal"


class RelevanceEngine:
    def __init__(self, db):
        self.db = db

    async def score_all(self, scan_id: str) -> None:
        """Score all opportunities from a scan against the current profile."""
        profile_doc = await self.db["user_profile"].find_one({})
        if not profile_doc:
            return
        profile_doc.pop("_id", None)
        profile = UserProfile(**profile_doc)

        now = datetime.utcnow()
        cursor = self.db["opportunities"].find({"scan_id": scan_id})
        async for doc in cursor:
            opp_id = doc["_id"]
            score, reasons = score_opportunity(doc, profile)
            label = score_to_label(score)

            # Compute urgency
            deadline = doc.get("response_deadline")
            days_until = None
            if deadline:
                if hasattr(deadline, "replace"):
                    diff = deadline.replace(tzinfo=None) - now
                    days_until = diff.days
            urgency_tier = get_urgency_tier(days_until)
            is_urgent = urgency_tier == "urgent"

            await self.db["opportunities"].update_one(
                {"_id": opp_id},
                {
                    "$set": {
                        "relevance_score": score,
                        "relevance_label": label,
                        "relevance_reasons": reasons,
                        "days_until_deadline": days_until,
                        "urgency_tier": urgency_tier,
                        "is_urgent": is_urgent,
                    }
                },
            )
        logger.info(f"Scored all opportunities for scan {scan_id}")

    async def rescore_all(self) -> None:
        """Rescore all opportunities in DB against the current profile."""
        await rescore_all(self.db)


async def rescore_all(db) -> None:
    """Standalone rescore all opportunities (used by profile router)."""
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)

    now = datetime.utcnow()
    cursor = db["opportunities"].find({})
    async for doc in cursor:
        opp_id = doc["_id"]
        score, reasons = score_opportunity(doc, profile)
        label = score_to_label(score)

        deadline = doc.get("response_deadline")
        days_until = None
        if deadline:
            if hasattr(deadline, "replace"):
                diff = deadline.replace(tzinfo=None) - now
                days_until = diff.days
        urgency_tier = get_urgency_tier(days_until)
        is_urgent = urgency_tier == "urgent"

        await db["opportunities"].update_one(
            {"_id": opp_id},
            {
                "$set": {
                    "relevance_score": score,
                    "relevance_label": label,
                    "relevance_reasons": reasons,
                    "days_until_deadline": days_until,
                    "urgency_tier": urgency_tier,
                    "is_urgent": is_urgent,
                }
            },
        )
    logger.info("Rescored all opportunities")
