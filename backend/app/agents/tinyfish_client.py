import asyncio
import os
from dataclasses import dataclass
from typing import List, Optional

import httpx


class TinyFishError(Exception):
    pass


@dataclass
class ScanSession:
    session_id: str
    stream_url: str


class TinyFishClient:
    def __init__(self):
        self.api_key = os.getenv("TINYFISH_API_KEY")
        self.base_url = os.getenv("TINYFISH_API_URL", "https://api.tinyfish.io")
        if not self.api_key:
            raise TinyFishError("TINYFISH_API_KEY environment variable not set")

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def start_scan(
        self, portal: str, agent_prompt: str, search_params: Optional[dict] = None
    ) -> ScanSession:
        payload = {
            "portal": portal,
            "prompt": agent_prompt,
            "search_params": search_params or {},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/v1/sessions",
                    json=payload,
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
                return ScanSession(
                    session_id=data["session_id"],
                    stream_url=data.get("stream_url", ""),
                )
            except httpx.HTTPError as e:
                raise TinyFishError(f"Failed to start scan session: {e}") from e

    def get_stream_url(self, session_id: str) -> str:
        return f"{self.base_url}/v1/sessions/{session_id}/stream"

    async def poll_results(self, session_id: str) -> List[dict]:
        delays = [1, 2, 4]
        for attempt, delay in enumerate(delays):
            try:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    resp = await client.get(
                        f"{self.base_url}/v1/sessions/{session_id}/results",
                        headers=self._headers(),
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    if isinstance(data, list):
                        return data
                    return data.get("results", [])
            except httpx.HTTPError as e:
                if attempt < len(delays) - 1:
                    await asyncio.sleep(delay)
                else:
                    raise TinyFishError(f"Failed to poll results after {len(delays)} attempts: {e}") from e
        return []
