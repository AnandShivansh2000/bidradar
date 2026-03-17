import logging
from datetime import datetime
from typing import List, Optional

from .base import BasePortalNormalizer
from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)

TX_SETASIDE_MAP = {
    "HUBS": ["hubs"],
    "HUB": ["hubs"],
    "HUB ONLY": ["hubs"],
    "HUBS ONLY": ["hubs"],
}


class TxSmartbuyNormalizer(BasePortalNormalizer):
    """Normalizer for Texas SmartBuy portal."""

    def normalize(self, raw: dict) -> OpportunityCreate:
        external_id = str(raw.get("external_id") or raw.get("solicitation_number") or "")
        title = raw.get("title") or ""
        agency = raw.get("agency") or ""

        value_display = raw.get("value_display") or raw.get("dollar_value") or ""
        value_min, value_max, value_display = self.parse_dollar(value_display)

        set_asides_raw = raw.get("set_asides") or raw.get("set_aside") or []
        if isinstance(set_asides_raw, str):
            set_asides_raw = [set_asides_raw]
        set_asides = self._map_set_asides(set_asides_raw)

        naics_codes = raw.get("naics_codes") or raw.get("commodity_codes") or []
        if isinstance(naics_codes, str):
            naics_codes = [naics_codes] if naics_codes else []

        posted_date = self.parse_date(raw.get("posted_date")) or datetime.utcnow()
        response_deadline = self.parse_date(raw.get("response_deadline") or raw.get("response_due_date"))

        return OpportunityCreate(
            external_id=external_id,
            portal="tx_smartbuy",
            title=title,
            agency=agency,
            naics_codes=naics_codes,
            set_asides=set_asides,
            value_min=value_min,
            value_max=value_max,
            value_display=value_display,
            state="TX",
            response_deadline=response_deadline,
            posted_date=posted_date,
            description=(raw.get("description") or "")[:500],
            opportunity_url=raw.get("opportunity_url") or "",
            solicitation_number=raw.get("solicitation_number"),
        )

    def _map_set_asides(self, raw_list: List[str]) -> List[str]:
        result = []
        for item in raw_list:
            if not item:
                continue
            item_upper = item.strip().upper()
            if item_upper in TX_SETASIDE_MAP:
                result.extend(TX_SETASIDE_MAP[item_upper])
            else:
                result.append(item.lower())
        return list(dict.fromkeys(result))  # deduplicate preserving order
