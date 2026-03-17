from typing import Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ScanCreate(BaseModel):
    portal: str
    status: Literal["running", "completed", "failed"] = "running"
    tinyfish_session_id: Optional[str] = None
    stream_url: Optional[str] = None


class Scan(ScanCreate):
    id: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    opportunities_found: int = 0
    opportunities_new: int = 0
    opportunities_updated: int = 0
    opportunities_skipped: int = 0
    error_message: Optional[str] = None
