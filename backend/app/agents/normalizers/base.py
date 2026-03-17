import logging
import re
from abc import ABC, abstractmethod
from typing import List, Optional

from ...models.opportunity import OpportunityCreate

logger = logging.getLogger(__name__)


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

    def parse_dollar_amount(self, s: Optional[str]) -> Optional[float]:
        if not s:
            return None
        s = s.strip()
        if not s or s.upper() in ("TBD", "N/A", "NONE", "-"):
            return None

        # Handle range like "$500K–$2M" - return the lower bound
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
