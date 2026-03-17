from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class OpportunityCreate(BaseModel):
    external_id: str
    portal: Literal["sam_gov", "cal_eprocure", "tx_smartbuy"]
    title: str
    agency: str
    naics_codes: List[str] = []
    set_asides: List[str] = []
    value_min: Optional[float] = None
    value_max: Optional[float] = None
    value_display: str = ""
    state: Optional[str] = None
    response_deadline: Optional[datetime] = None
    posted_date: datetime
    description: str = ""
    opportunity_url: str
    solicitation_number: Optional[str] = None
    scan_id: Optional[str] = None


class Opportunity(OpportunityCreate):
    id: Optional[str] = None
    relevance_score: float = 0.0
    relevance_label: str = "Low"
    relevance_reasons: List[str] = []
    days_until_deadline: Optional[int] = None
    urgency_tier: str = "normal"
    is_urgent: bool = False
    alert_sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
