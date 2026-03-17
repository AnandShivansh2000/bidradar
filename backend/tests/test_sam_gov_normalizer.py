import pytest
from datetime import datetime

from app.agents.normalizers.sam_gov import SamGovNormalizer


@pytest.fixture
def normalizer():
    return SamGovNormalizer()


def test_null_value_parsing(normalizer):
    """TBD value_display should yield None for both min and max."""
    raw = {
        "external_id": "TEST-001",
        "title": "Test Opportunity",
        "agency": "Test Agency",
        "value_display": "TBD",
        "naics_codes": ["541512"],
        "set_asides": [],
        "posted_date": "2026-01-01",
        "opportunity_url": "https://sam.gov/opp/test-001",
    }
    result = normalizer.normalize(raw)
    assert result.value_min is None
    assert result.value_max is None


def test_multiple_naics_codes(normalizer):
    """Multiple NAICS codes preserved; $2.5M parses to 2500000."""
    raw = {
        "external_id": "TEST-002",
        "title": "Multi-NAICS Opportunity",
        "agency": "Test Agency",
        "value_display": "$2.5M",
        "naics_codes": ["541512", "541511"],
        "set_asides": [],
        "posted_date": "2026-01-01",
        "opportunity_url": "https://sam.gov/opp/test-002",
    }
    result = normalizer.normalize(raw)
    assert "541512" in result.naics_codes
    assert "541511" in result.naics_codes
    assert result.value_min == 2500000.0


def test_no_set_aside(normalizer):
    """Range $500K–$2M parses to min=500000, max=2000000; empty set_asides."""
    raw = {
        "external_id": "TEST-003",
        "title": "Range Value Opportunity",
        "agency": "Test Agency",
        "value_display": "$500K–$2M",
        "naics_codes": ["541512"],
        "set_asides": [],
        "posted_date": "2026-01-01",
        "opportunity_url": "https://sam.gov/opp/test-003",
    }
    result = normalizer.normalize(raw)
    assert result.set_asides == []
    assert result.value_min == 500000.0
    assert result.value_max == 2000000.0
