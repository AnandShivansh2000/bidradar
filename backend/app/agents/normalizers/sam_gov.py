import logging
import re
from datetime import datetime
from typing import List, Optional, Tuple

from .base import BasePortalNormalizer
from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)

SAM_SETASIDE_MAP = {
    "8(a) Set-Aside": "8a",
    "8(a) Sole Source": "8a",
    "HUBZone Set-Aside": "hubzone",
    "HUBZone Sole Source": "hubzone",
    "Women-Owned Small Business": "wosb",
    "Economically Disadvantaged Women-Owned": "edwosb",
    "Service-Disabled Veteran-Owned": "sdvosb",
    "Veteran-Owned Small Business": "vosb",
    "Total Small Business Set-Aside": "sba",
    "Partial Small Business Set-Aside": "sba",
}

DATE_FORMATS = [
    "%b %d, %Y %I:%M %p %Z",   # "Apr 15, 2026 5:00 pm ET"
    "%b %d, %Y %I:%M %p",       # "Apr 15, 2026 5:00 pm"
    "%Y-%m-%dT%H:%M:%S",        # "2026-04-15T17:00:00"
    "%Y-%m-%dT%H:%M:%SZ",       # "2026-04-15T17:00:00Z"
    "%Y-%m-%dT%H:%M:%S%z",      # ISO with timezone
    "%m/%d/%Y",                  # "04/15/2026"
    "%Y-%m-%d",                  # "2026-04-15"
]


class SamGovNormalizer(BasePortalNormalizer):
    def normalize(self, raw: dict) -> OpportunityCreate:
        value_display = raw.get("value_display") or ""
        value_min, value_max = self._parse_value_range(value_display, raw)

        set_asides_raw = raw.get("set_asides") or []
        if isinstance(set_asides_raw, str):
            set_asides_raw = [set_asides_raw]
        set_asides = [SAM_SETASIDE_MAP.get(s, s) for s in set_asides_raw if s]

        naics_codes = raw.get("naics_codes") or []
        if isinstance(naics_codes, str):
            naics_codes = [naics_codes] if naics_codes else []

        posted_date = self._parse_date(raw.get("posted_date")) or datetime.utcnow()

        return OpportunityCreate(
            external_id=str(raw.get("external_id") or raw.get("opportunity_url", "")),
            portal="sam_gov",
            title=raw.get("title") or "",
            agency=raw.get("agency") or "",
            naics_codes=naics_codes,
            set_asides=set_asides,
            value_min=value_min,
            value_max=value_max,
            value_display=value_display,
            state=raw.get("state"),
            response_deadline=self._parse_date(raw.get("response_deadline")),
            posted_date=posted_date,
            description=(raw.get("description") or "")[:500],
            opportunity_url=raw.get("opportunity_url") or "",
            solicitation_number=raw.get("solicitation_number"),
        )

    def _parse_value_range(self, value_display: str, raw: dict) -> Tuple[Optional[float], Optional[float]]:
        # Check explicit fields first
        value_min = raw.get("value_min")
        value_max = raw.get("value_max")
        if value_min is not None or value_max is not None:
            return value_min, value_max

        if not value_display:
            return None, None

        upper = value_display.upper().strip()
        if upper in ("TBD", "N/A", "NONE", "-", ""):
            return None, None

        # Handle range notation: "$500K–$2M" or "$500K-$2M"
        range_pattern = re.search(
            r"\$?([\d.,]+\s*[KkMmBb]?)\s*[–\-—~]+\s*\$?([\d.,]+\s*[KkMmBb]?)", value_display
        )
        if range_pattern:
            min_val = self._parse_single_amount(range_pattern.group(1))
            max_val = self._parse_single_amount(range_pattern.group(2))
            return min_val, max_val

        single = self._parse_single_amount(value_display)
        return single, None

    def _parse_single_amount(self, s: str) -> Optional[float]:
        if not s:
            return None
        s = s.strip().replace(",", "").replace("$", "").replace(" ", "")
        multiplier = 1.0
        upper = s.upper()
        if upper.endswith("B"):
            multiplier = 1_000_000_000
            s = s[:-1]
        elif upper.endswith("M"):
            multiplier = 1_000_000
            s = s[:-1]
        elif upper.endswith("K"):
            multiplier = 1_000
            s = s[:-1]
        try:
            return float(s) * multiplier
        except (ValueError, TypeError):
            return None

    def _parse_date(self, value) -> Optional[datetime]:
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        s = str(value).strip()
        # Remove timezone abbreviations like "ET", "EST", "EDT" for simpler parsing
        s_clean = re.sub(r"\s+[A-Z]{2,4}$", "", s).strip()
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(s_clean, fmt)
            except (ValueError, TypeError):
                continue
        # Try ISO format with timezone offset
        try:
            from dateutil import parser as dateutil_parser
            return dateutil_parser.parse(s)
        except Exception:
            pass
        logger.warning(f"Could not parse date: {value!r}")
        return None
