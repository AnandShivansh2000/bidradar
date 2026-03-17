import logging
from typing import List

from ..models.profile import UserProfile

logger = logging.getLogger(__name__)


async def send_digest(opportunities: List, profile: UserProfile) -> bool:
    """Stub: log digest and return True."""
    logger.info(
        f"[NotificationService] Sending digest to {profile.email or 'no-email'} "
        f"with {len(opportunities)} opportunities"
    )
    return True


async def send_alert(opportunity: dict, profile: UserProfile) -> bool:
    """Stub: log alert and return True."""
    logger.info(
        f"[NotificationService] Sending alert to {profile.email or 'no-email'} "
        f"for opportunity: {opportunity.get('title', 'unknown')}"
    )
    return True
