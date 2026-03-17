import logging
from typing import List, Optional, Tuple

from ..models.profile import UserProfile

logger = logging.getLogger(__name__)


def score_opportunity(opp: dict, profile: UserProfile) -> Tuple[float, str, List[str]]:
    """
    Score an opportunity against a user profile.
    Returns (score 0.0-1.0, label "High"|"Medium"|"Low", reasons list)
    """
    score = 0.0
    reasons = []

    # NAICS match: +0.4
    opp_naics = set(opp.get("naics_codes") or [])
    profile_naics = set(profile.naics_codes or [])
    if opp_naics & profile_naics:
        score += 0.4
        matched = opp_naics & profile_naics
        reasons.append(f"NAICS {', '.join(sorted(matched))} matches profile")

    # Certification/set_aside match: +0.25
    opp_set_asides = set(opp.get("set_asides") or [])
    profile_certs = set(profile.certifications or [])
    if opp_set_asides & profile_certs:
        score += 0.25
        matched = opp_set_asides & profile_certs
        reasons.append(f"Set-aside {', '.join(sorted(matched))} matches certification")

    # Keyword match: +0.2
    if profile.keywords:
        title = (opp.get("title") or "").lower()
        desc = (opp.get("description") or "").lower()
        text = f"{title} {desc}"
        matched_kw = [kw for kw in profile.keywords if kw.lower() in text]
        if matched_kw:
            score += 0.2
            reasons.append(f"Keywords matched: {', '.join(matched_kw[:3])}")

    # State match: +0.1
    opp_state = opp.get("state")
    if opp_state and profile.states and opp_state in profile.states:
        score += 0.1
        reasons.append(f"State {opp_state} matches profile")

    # Value in range: +0.05
    value_min = opp.get("value_min")
    value_max = opp.get("value_max")
    profile_min = profile.value_min
    profile_max = profile.value_max
    if _value_in_range(value_min, value_max, profile_min, profile_max):
        score += 0.05
        reasons.append("Value range in profile range")

    score = min(score, 1.0)

    if score >= 0.7:
        label = "High"
    elif score >= 0.4:
        label = "Medium"
    else:
        label = "Low"

    return score, label, reasons


def _value_in_range(
    opp_min: Optional[float],
    opp_max: Optional[float],
    profile_min: Optional[float],
    profile_max: Optional[float],
) -> bool:
    if profile_min is None and profile_max is None:
        return False
    opp_val = opp_min or opp_max
    if opp_val is None:
        return False
    if profile_min is not None and opp_val < profile_min:
        return False
    if profile_max is not None and opp_val > profile_max:
        return False
    return True


async def rescore_all(db) -> None:
    """Rescore all opportunities in DB against the current profile."""
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)

    cursor = db["opportunities"].find({})
    async for doc in cursor:
        opp_id = doc["_id"]
        score, label, reasons = score_opportunity(doc, profile)
        await db["opportunities"].update_one(
            {"_id": opp_id},
            {"$set": {"relevance_score": score, "relevance_label": label, "relevance_reasons": reasons}},
        )
    logger.info("Rescored all opportunities")
