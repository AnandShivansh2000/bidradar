from typing import List, Optional
from pydantic import BaseModel


class UserProfile(BaseModel):
    naics_codes: List[str] = ["541512", "541511"]
    certifications: List[str] = []
    value_min: Optional[float] = None
    value_max: Optional[float] = None
    states: List[str] = []
    keywords: List[str] = []
    email: str = ""
    digest_enabled: bool = True
    digest_time: str = "07:00"
    alert_threshold_hours: int = 48
