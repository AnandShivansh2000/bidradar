import logging
from datetime import datetime
from typing import Any

from bson import ObjectId

from .base_agent import BaseAgent
from .tinyfish_client import TinyFishClient, TinyFishError
from .normalizers.sam_gov import SamGovNormalizer

logger = logging.getLogger(__name__)

SAM_GOV_AGENT_PROMPT = """Navigate to https://sam.gov/search/?index=opp&sort=-modifiedDate&sfm%5Bstatus%5D%5B0%5D%5B%5D=Open

For each opportunity on the current page:
1. Extract: title, agency, NAICS code(s), set-aside type, contract value (min and max if range), place of performance state, response deadline date, posted date, solicitation number, opportunity URL
2. Click into the opportunity detail to get the description (first 500 characters)
3. Navigate back to the results list

Repeat for up to 5 pages using the Next button. Stop if no Next button or 5 pages reached.

Return results as a JSON array with fields: external_id, title, agency, naics_codes, set_asides, value_display, value_min, value_max, state, response_deadline, posted_date, description, opportunity_url, solicitation_number

If any field is unavailable, set it to null. Do not fail — return partial data."""


class SamGovAgent(BaseAgent):
    def __init__(self, db):
        self.db = db
        self.normalizer = SamGovNormalizer()

    async def run_scan(self, scan_id: str) -> Any:
        # Step 1: Update scan status to running
        await self.db["scans"].update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"status": "running", "started_at": datetime.utcnow()}},
        )

        # Step 2: Start TinyFish session
        try:
            client = TinyFishClient()
            session = await client.start_scan(
                portal="sam_gov",
                agent_prompt=SAM_GOV_AGENT_PROMPT,
                search_params={},
            )
        except TinyFishError as e:
            logger.error(f"TinyFish error starting scan {scan_id}: {e}")
            await self.db["scans"].update_one(
                {"_id": ObjectId(scan_id)},
                {"$set": {"status": "failed", "error_message": str(e), "completed_at": datetime.utcnow()}},
            )
            return

        # Step 3: Save stream_url
        await self.db["scans"].update_one(
            {"_id": ObjectId(scan_id)},
            {"$set": {"tinyfish_session_id": session.session_id, "stream_url": session.stream_url}},
        )

        # Step 4: Poll results
        try:
            raw_results = await client.poll_results(session.session_id)
        except TinyFishError as e:
            logger.error(f"TinyFish polling error for scan {scan_id}: {e}")
            await self.db["scans"].update_one(
                {"_id": ObjectId(scan_id)},
                {"$set": {"status": "failed", "error_message": str(e), "completed_at": datetime.utcnow()}},
            )
            return

        # Step 5: Normalize
        normalized = self.normalizer.normalize_batch(raw_results)

        # Step 6: Ingest with deduplication
        counts = await self._ingest(normalized, scan_id)

        # Step 7: Mark completed
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
