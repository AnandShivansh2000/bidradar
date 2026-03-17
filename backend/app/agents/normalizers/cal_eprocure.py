import logging
from datetime import datetime
from .base import BasePortalNormalizer
from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)


class CalEprocureNormalizer(BasePortalNormalizer):
    """Stub normalizer for Cal eProcure portal."""

    def normalize(self, raw: dict) -> OpportunityCreate:
        return OpportunityCreate(
            external_id=str(raw.get("external_id", "")),
            portal="cal_eprocure",
            title=raw.get("title", ""),
            agency=raw.get("agency", ""),
            posted_date=datetime.utcnow(),
            opportunity_url=raw.get("opportunity_url", ""),
        )
