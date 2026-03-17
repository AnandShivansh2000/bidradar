import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import httpx

from ..database import get_db
from ..models.profile import UserProfile

logger = logging.getLogger(__name__)

AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY", "")
AGENTMAIL_INBOX = os.getenv("AGENTMAIL_INBOX", "bidradar")
AGENTMAIL_BASE_URL = "https://api.agentmail.to/v0"


def _build_digest_html(opportunities: list, profile: UserProfile) -> str:
    count = len(opportunities)
    date_str = datetime.utcnow().strftime("%B %d, %Y")
    opp_cards = ""
    for opp in opportunities:
        label = opp.get("relevance_label", "Medium")
        badge_color = "#10B981" if label == "High" else "#F59E0B"
        title = opp.get("title", "Untitled Opportunity")
        agency = opp.get("agency", "")
        value_display = opp.get("value_display", "")
        state = opp.get("state", "")
        deadline = opp.get("response_deadline")
        deadline_str = deadline.strftime("%b %d, %Y") if isinstance(deadline, datetime) else str(deadline or "TBD")
        description = opp.get("description", "")[:200]
        if len(opp.get("description", "")) > 200:
            description += "..."
        opp_url = opp.get("opportunity_url", "#")
        opp_cards += f"""
        <div style="border-left:4px solid #10B981;padding:16px;margin-bottom:16px;background:#f9fafb;border-radius:0 8px 8px 0;">
          <div style="margin-bottom:8px;">
            <span style="background:{badge_color};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;text-transform:uppercase;">{label}</span>
          </div>
          <h3 style="margin:0 0 8px;font-size:16px;color:#111827;">{title}</h3>
          <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">
            {agency} &nbsp;|&nbsp; {value_display} &nbsp;|&nbsp; {state} &nbsp;|&nbsp; Deadline: {deadline_str}
          </p>
          <p style="margin:0 0 12px;font-size:14px;color:#374151;">{description}</p>
          <a href="{opp_url}" style="display:inline-block;background:#10B981;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">View Opportunity &rarr;</a>
        </div>
        """
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:#10B981;padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:28px;color:#fff;font-weight:800;">&#127919; BidRadar</h1>
      <p style="margin:0;color:#d1fae5;font-size:15px;">Your daily government contract intelligence briefing</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">
        Good morning! Here are <strong>{count} contract opportunit{'y' if count == 1 else 'ies'}</strong> matching your profile for {date_str}.
      </p>
      {opp_cards}
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">Powered by BidRadar + TinyFish Web Agent API</p>
    </div>
  </div>
</body>
</html>"""


def _build_alert_html(opportunity: dict) -> str:
    title = opportunity.get("title", "Untitled Opportunity")
    agency = opportunity.get("agency", "")
    value_display = opportunity.get("value_display", "")
    solicitation_number = opportunity.get("solicitation_number", "N/A")
    deadline = opportunity.get("response_deadline")
    deadline_str = deadline.strftime("%B %d, %Y at %I:%M %p UTC") if isinstance(deadline, datetime) else str(deadline or "TBD")
    portal = opportunity.get("portal", "sam_gov").replace("_", " ").title()
    opp_url = opportunity.get("opportunity_url", "#")
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:#dc2626;padding:32px 24px;text-align:center;">
      <h1 style="margin:0 0 8px;font-size:26px;color:#fff;font-weight:800;">&#9888;&#65039; ACTION REQUIRED</h1>
      <p style="margin:0;color:#fecaca;font-size:15px;">Bid deadline approaching</p>
    </div>
    <div style="padding:24px;">
      <h2 style="margin:0 0 20px;font-size:20px;color:#111827;">{title}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;font-size:13px;color:#6B7280;font-weight:600;width:40%;">Agency</td>
          <td style="padding:10px 0;font-size:14px;color:#111827;">{agency}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;font-size:13px;color:#6B7280;font-weight:600;">Value</td>
          <td style="padding:10px 0;font-size:14px;color:#111827;">{value_display}</td>
        </tr>
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:10px 0;font-size:13px;color:#6B7280;font-weight:600;">Solicitation #</td>
          <td style="padding:10px 0;font-size:14px;color:#111827;">{solicitation_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:13px;color:#dc2626;font-weight:800;">DEADLINE</td>
          <td style="padding:10px 0;font-size:14px;color:#dc2626;font-weight:800;">{deadline_str}</td>
        </tr>
      </table>
      <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
        <p style="margin:0;font-size:18px;color:#dc2626;font-weight:800;">&#9200; Respond before: {deadline_str}</p>
      </div>
      <div style="text-align:center;">
        <a href="{opp_url}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:700;">View on {portal} &rarr;</a>
      </div>
    </div>
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">Powered by BidRadar + TinyFish Web Agent API</p>
    </div>
  </div>
</body>
</html>"""


async def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    if not AGENTMAIL_API_KEY:
        logger.warning("AGENTMAIL_API_KEY not set — skipping email send")
        return False
    url = f"{AGENTMAIL_BASE_URL}/inboxes/{AGENTMAIL_INBOX}/messages"
    headers = {
        "Authorization": f"Bearer {AGENTMAIL_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "to": [{"email": to_email}],
        "subject": subject,
        "html": html_body,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return True
    except Exception as e:
        logger.warning(f"AgentMail send failed: {e}")
        return False


async def _log_notification(db, type_: str, recipient: str, subject: str, status: str, opportunities_count: int = 0) -> None:
    try:
        await db["notification_log"].insert_one({
            "type": type_,
            "recipient": recipient,
            "subject": subject,
            "status": status,
            "sent_at": datetime.utcnow(),
            "opportunities_count": opportunities_count,
        })
    except Exception as e:
        logger.warning(f"Failed to log notification: {e}")


async def send_daily_digest(profile: UserProfile) -> bool:
    db = get_db()
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=24)

    # Fetch top 10 High relevance opps posted in last 24h
    cursor = db["opportunities"].find({
        "relevance_label": "High",
        "posted_date": {"$gte": cutoff},
    }).sort("relevance_score", -1).limit(10)
    opps = [doc async for doc in cursor]

    # Fill with Medium if < 10
    if len(opps) < 10:
        needed = 10 - len(opps)
        high_ids = [o["_id"] for o in opps]
        cursor2 = db["opportunities"].find({
            "relevance_label": "Medium",
            "posted_date": {"$gte": cutoff},
            "_id": {"$nin": high_ids},
        }).sort("relevance_score", -1).limit(needed)
        medium_opps = [doc async for doc in cursor2]
        opps.extend(medium_opps)

    # If still empty, fall back to any High/Medium regardless of date
    if not opps:
        cursor3 = db["opportunities"].find({
            "relevance_label": {"$in": ["High", "Medium"]},
        }).sort("relevance_score", -1).limit(10)
        opps = [doc async for doc in cursor3]

    for doc in opps:
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))

    count = len(opps)
    date_str = now.strftime("%B %d, %Y")
    subject = f"BidRadar: {count} New Contract Opportunit{'y' if count == 1 else 'ies'} - {date_str}"
    html = _build_digest_html(opps, profile)
    success = await _send_email(profile.email, subject, html)
    status = "sent" if success else "failed"
    await _log_notification(db, "daily_digest", profile.email, subject, status, count)
    return success


async def send_deadline_alert(opportunity: dict, profile: UserProfile) -> bool:
    db = get_db()
    title = opportunity.get("title", "Untitled")
    subject = f"Deadline in 24 hours: {title}"
    html = _build_alert_html(opportunity)
    success = await _send_email(profile.email, subject, html)

    # Update alert_sent_at in MongoDB
    try:
        ext_id = opportunity.get("external_id")
        portal = opportunity.get("portal")
        if ext_id and portal:
            await db["opportunities"].update_one(
                {"external_id": ext_id, "portal": portal},
                {"$set": {"alert_sent_at": datetime.utcnow()}},
            )
    except Exception as e:
        logger.warning(f"Failed to update alert_sent_at: {e}")

    status = "sent" if success else "failed"
    await _log_notification(db, "deadline_alert", profile.email, subject, status)
    return success


# Backward-compatible stubs used by scheduler
async def send_digest(opportunities: list, profile: UserProfile) -> bool:
    return await send_daily_digest(profile)


async def send_alert(opportunity: dict, profile: UserProfile) -> bool:
    return await send_deadline_alert(opportunity, profile)


async def check_and_send_alerts() -> None:
    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        logger.warning("No profile found, skipping alerts")
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)

    threshold = datetime.utcnow() + timedelta(hours=48)
    cursor = db["opportunities"].find({
        "relevance_label": {"$in": ["High", "Medium"]},
        "response_deadline": {"$lte": threshold},
        "alert_sent_at": None,
    })
    async for doc in cursor:
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        try:
            await send_deadline_alert(doc, profile)
        except Exception as e:
            logger.warning(f"Failed to send alert for {doc.get('title')}: {e}")


async def daily_digest_job() -> None:
    db = get_db()
    profile_doc = await db["user_profile"].find_one({})
    if not profile_doc:
        logger.warning("No profile found, skipping digest")
        return
    profile_doc.pop("_id", None)
    profile = UserProfile(**profile_doc)
    if not profile.digest_enabled:
        return
    await send_daily_digest(profile)
