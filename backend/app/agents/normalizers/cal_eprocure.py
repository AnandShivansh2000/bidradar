import logging
from datetime import datetime
from typing import List, Optional

from .base import BasePortalNormalizer
from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)

CAL_SETASIDE_MAP = {
    "DVBE": ["dvbe"],
    "SB": ["sba"],
    "SB/DVBE": ["sba", "dvbe"],
    "DVBE/SB": ["dvbe", "sba"],
    "MB": ["mb"],
    "NP": ["np"],
}


class CalEprocureNormalizer(BasePortalNormalizer):
    """Normalizer for Cal eProcure portal (California state procurement)."""

    def normalize(self, raw: dict) -> OpportunityCreate:
        external_id = str(raw.get("external_id") or raw.get("event_number") or "")
        title = raw.get("title") or raw.get("event_name") or ""
        agency = raw.get("agency") or raw.get("department") or ""

        value_display = raw.get("value_display") or raw.get("dollar_value") or ""
        value_min, value_max, value_display = self.parse_dollar(value_display)

        set_asides_raw = raw.get("set_asides") or raw.get("set_aside") or []
        if isinstance(set_asides_raw, str):
            set_asides_raw = [set_asides_raw]
        set_asides = self._map_set_asides(set_asides_raw)

        naics_codes = raw.get("naics_codes") or []
        if isinstance(naics_codes, str):
            naics_codes = [naics_codes] if naics_codes else []

        posted_date = self.parse_date(raw.get("posted_date")) or datetime.utcnow()
        response_deadline = self.parse_date(raw.get("response_deadline") or raw.get("response_due_date"))

        return OpportunityCreate(
            external_id=external_id,
            portal="cal_eprocure",
            title=title,
            agency=agency,
            naics_codes=naics_codes,
            set_asides=set_asides,
            value_min=value_min,
            value_max=value_max,
            value_display=value_display,
            state="CA",
            response_deadline=response_deadline,
            posted_date=posted_date,
            description=(raw.get("description") or "")[:500],
            opportunity_url=raw.get("opportunity_url") or "",
            solicitation_number=raw.get("solicitation_number") or raw.get("event_number"),
        )

    def _map_set_asides(self, raw_list: List[str]) -> List[str]:
        result = []
        for item in raw_list:
            if not item:
                continue
            item_upper = item.strip().upper()
            if item_upper in CAL_SETASIDE_MAP:
                result.extend(CAL_SETASIDE_MAP[item_upper])
            else:
                result.append(item.lower())
        return list(dict.fromkeys(result))  # deduplicate preserving order
