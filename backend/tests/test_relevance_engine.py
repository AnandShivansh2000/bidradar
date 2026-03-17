import pytest

from app.services.relevance_engine import score_opportunity
from app.models.profile import UserProfile


@pytest.fixture
def default_profile():
    return UserProfile(
        naics_codes=["541512", "541511"],
        certifications=["8a"],
        value_min=None,
        value_max=None,
        states=["VA", "MD"],
        keywords=["cybersecurity", "cloud"],
    )


def test_high_score_naics_and_cert(default_profile):
    """NAICS match + cert match should yield High label (>= 0.65)."""
    opp = {
        "naics_codes": ["541512"],
        "set_asides": ["8a"],
        "title": "Cybersecurity Support",
        "description": "",
        "state": None,
        "value_min": None,
        "value_max": None,
    }
    score, label, reasons = score_opportunity(opp, default_profile)
    assert score >= 0.65
    assert label == "High"
    assert any("NAICS" in r for r in reasons)
    assert any("set-aside" in r.lower() or "cert" in r.lower() for r in reasons)


def test_medium_score_naics_only(default_profile):
    """NAICS match only (0.4) should yield Medium label."""
    opp = {
        "naics_codes": ["541511"],
        "set_asides": [],
        "title": "Software Development",
        "description": "",
        "state": None,
        "value_min": None,
        "value_max": None,
    }
    score, label, reasons = score_opportunity(opp, default_profile)
    assert score == 0.4
    assert label == "Medium"


def test_low_score_no_match(default_profile):
    """No matching NAICS or certs yields Low label."""
    opp = {
        "naics_codes": ["999999"],
        "set_asides": ["hubzone"],
        "title": "Unrelated Opportunity",
        "description": "",
        "state": None,
        "value_min": None,
        "value_max": None,
    }
    score, label, reasons = score_opportunity(opp, default_profile)
    assert score < 0.4
    assert label == "Low"


def test_keyword_boost(default_profile):
    """Keyword match adds 0.2 to base score."""
    opp = {
        "naics_codes": ["541512"],
        "set_asides": [],
        "title": "Cloud Migration Services",
        "description": "cloud infrastructure modernization",
        "state": None,
        "value_min": None,
        "value_max": None,
    }
    score, label, reasons = score_opportunity(opp, default_profile)
    # NAICS (0.4) + keyword (0.2) = 0.6 -> Medium
    assert score == pytest.approx(0.6)
    assert label == "Medium"
    assert any("keyword" in r.lower() for r in reasons)


def test_state_match_boost(default_profile):
    """State match adds 0.1."""
    opp = {
        "naics_codes": ["541512"],
        "set_asides": [],
        "title": "IT Support",
        "description": "",
        "state": "VA",
        "value_min": None,
        "value_max": None,
    }
    score, label, reasons = score_opportunity(opp, default_profile)
    # NAICS (0.4) + state (0.1) = 0.5 -> Medium
    assert score == pytest.approx(0.5)
    assert any("VA" in r for r in reasons)
