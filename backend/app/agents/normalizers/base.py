import logging
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Optional, Tuple

from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)

DATE_FORMATS = [
    "%m/%d/%Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%B %d %Y",
    "%b %d, %Y %I:%M %p %Z",
    "%b %d, %Y %I:%M %p",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S%z",
    "%Y-%m-%d",
]


class BasePortalNormalizer(ABC):
    @abstractmethod
    def normalize(self, raw: dict) -> OpportunityCreate:
        pass

    def normalize_batch(self, items: List[dict]) -> List[OpportunityCreate]:
        results = []
        for item in items:
            try:
                normalized = self.normalize(item)
                results.append(normalized)
            except Exception as e:
                logger.error(f"Error normalizing record {item.get('external_id', 'unknown')}: {e}")
        return results

    def parse_dollar(self, value_str: Optional[str]) -> Tuple[Optional[float], Optional[float], str]:
        """Parse dollar value string into (value_min, value_max, value_display)."""
        if not value_str:
            return None, None, ""
        display = value_str.strip()
        upper = display.upper()
        if upper in ("TBD", "N/A", "NONE", "-", ""):
            return None, None, display

        range_pattern = re.search(
            r"\$?([\d.,]+\s*[KkMmBb]?)\s*[–\-—~]+\s*\$?([\d.,]+\s*[KkMmBb]?)", display
        )
        if range_pattern:
            min_val = self._parse_single_amount(range_pattern.group(1))
            max_val = self._parse_single_amount(range_pattern.group(2))
            return min_val, max_val, display

        single = self._parse_single_amount(display)
        return single, None, display

    def parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string, trying multiple formats. Returns None on failure, never raises."""
        if not date_str:
            return None
        if isinstance(date_str, datetime):
            return date_str
        s = str(date_str).strip()
        s_clean = re.sub(r"\s+[A-Z]{2,4}$", "", s).strip()
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(s_clean, fmt)
            except (ValueError, TypeError):
                continue
        try:
            from dateutil import parser as dateutil_parser
            return dateutil_parser.parse(s)
        except Exception:
            pass
        logger.warning(f"Could not parse date: {date_str!r}")
        return None

    def parse_dollar_amount(self, s: Optional[str]) -> Optional[float]:
        """Legacy helper: parse a single dollar value string to float."""
        if not s:
            return None
        s = s.strip()
        if not s or s.upper() in ("TBD", "N/A", "NONE", "-"):
            return None

        range_match = re.search(r"[\$]?([\d.,]+)\s*[KkMmBb]?\s*[–\-—~to]+\s*[\$]?([\d.,]+)\s*[KkMmBb]?", s)
        if range_match:
            return self._parse_single_amount(range_match.group(1) + _extract_suffix(s, range_match.start()))

        return self._parse_single_amount(s)

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


def _extract_suffix(s: str, pos: int) -> str:
    """Extract K/M/B suffix near position in string."""
    for ch in s[pos:pos + 5]:
        if ch.upper() in ("K", "M", "B"):
            return ch
    return ""
