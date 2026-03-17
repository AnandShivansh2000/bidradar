import logging
from .base_agent import BaseAgent

logger = logging.getLogger(__name__)


class CalEprocureAgent(BaseAgent):
    def __init__(self, db):
        self.db = db

    async def run_scan(self, scan_id: str):
        logger.info(f"CalEprocureAgent stub: scan_id={scan_id}, returning empty results")
        return []
