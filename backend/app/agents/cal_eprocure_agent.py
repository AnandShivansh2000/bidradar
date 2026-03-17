import logging
from datetime import datetime
from typing import Any

from bson import ObjectId

from .base_agent import BaseAgent
from .tinyfish_client import TinyFishClient, TinyFishError
from .normalizers.cal_eprocure import CalEprocureNormalizer

logger = logging.getLogger(__name__)

CAL_EPROCURE_AGENT_PROMPT = """Navigate to https://caleprocure.ca.gov/pages/Events/event-search.aspx

Filter for Active events only.

For each event on the current page extract:
1. title/event name
2. agency/department
3. event number as external_id
4. event type
5. dollar value
6. response due date
7. posted date
8. description (first 500 characters)
9. state = "CA"
10. set-aside type (map DVBE -> "dvbe", SB -> "sba")
11. opportunity URL

Repeat for up to 5 pages using the Next button. Stop if no Next button or 5 pages reached.

Return results as a JSON array with fields: external_id, title, agency, naics_codes, set_asides, value_display, value_min, value_max, state, response_deadline, posted_date, description, opportunity_url, solicitation_number

Set null for any unavailable fields. Do not fail — return partial data."""


class CalEprocureAgent(BaseAgent):
    def __init__(self, db):
        self.db = db
        self.normalizer = CalEprocureNormalizer()

    async def run_scan(self, scan_id: str) -> Any:
        from ..services.portal_health import record_success, record_failure

        await self.db["scans"].update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"status": "running", "started_at": datetime.utcnow()}},
        )

        try:
            client = TinyFishClient()
            session = await client.start_scan(
                portal="cal_eprocure",
                agent_prompt=CAL_EPROCURE_AGENT_PROMPT,
                search_params={},
            )
        except TinyFishError as e:
            logger.error(f"TinyFish error starting cal_eprocure scan {scan_id}: {e}")
            await self.db["scans"].update_one(
                {"_id": ObjectId(scan_id)},
                {"$set": {"status": "failed", "error_message": str(e), "completed_at": datetime.utcnow()}},
            )
            record_failure("cal_eprocure")
            return

        await self.db["scans"].update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"tinyfish_session_id": session.session_id, "stream_url": session.stream_url}},
        )

        try:
            raw_results = await client.poll_results(session.session_id)
        except TinyFishError as e:
            logger.error(f"TinyFish polling error for cal_eprocure scan {scan_id}: {e}")
            await self.db["scans"].update_one(
                {"_id": ObjectId(scan_id)},
                {"$set": {"status": "failed", "error_message": str(e), "completed_at": datetime.utcnow()}},
            )
            record_failure("cal_eprocure")
            return

        normalized = self.normalizer.normalize_batch(raw_results)
        counts = await self._ingest(normalized, scan_id)

        await self.db["scans"].update_one(
            {"_id": ObjectId(scan_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "opportunities_found": len(normalized),
                    "opportunities_new": counts["new"],
                    "opportunities_updated": counts["updated"],
                    "opportunities_skipped": counts["skipped"],
                }
            },
        )
        record_success("cal_eprocure")

    async def _ingest(self, opportunities, scan_id: str) -> dict:
        new_count = updated_count = skipped_count = 0
        now = datetime.utcnow()

        for opp in opportunities:
            data = opp.model_dump()
            data["scan_id"] = scan_id
            data["updated_at"] = now

            existing = await self.db["opportunities"].find_one(
                {"external_id": data["external_id"], "portal": data["portal"]}
            )

            if not existing:
                data["created_at"] = now
                await self.db["opportunities"].insert_one(data)
                new_count += 1
            elif existing.get("response_deadline") != data.get("response_deadline"):
                await self.db["opportunities"].update_one(
                    {"_id": existing["_id"]},
                    {"$set": data},
                )
                updated_count += 1
            else:
                skipped_count += 1

        return {"new": new_count, "updated": updated_count, "skipped": skipped_count}
