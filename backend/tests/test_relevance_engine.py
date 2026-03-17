import types
from datetime import datetime, timedelta, timezone

import pytest

from app.services.relevance_engine import score_opportunity, score_to_label, get_urgency_tier
from app.models.profile import UserProfile


def make_opp(**kwargs):
    """Create a SimpleNamespace opportunity object with defaults."""
    defaults = dict(
        naics_codes=[],
        set_asides=[],
        value_min=None,
        value_max=None,
        state=None,
        title="",
        description="",
    )
    defaults.update(kwargs)
    return types.SimpleNamespace(**defaults)


def test_perfect_match():
    """All 5 dimensions match -> score >= 0.95, label = High."""
    profile = UserProfile(
        naics_codes=["541512"],
        certifications=["8a"],
        value_min=100_000.0,
        value_max=5_000_000.0,
        states=["CA"],
        keywords=["cybersecurity"],
    )
    opp = make_opp(
        naics_codes=["541512"],
        set_asides=["8a"],
        value_min=500_000.0,
        value_max=2_000_000.0,
        state="CA",
        title="Cybersecurity Support",
        description="",
    )
    score, reasons = score_opportunity(opp, profile)
    assert score >= 0.95
    assert score_to_label(score) == "High"


def test_naics_only():
    """Only NAICS matches -> score = 0.40, label = Medium."""
    profile = UserProfile(
        naics_codes=["541512"],
        certifications=["8a"],
        value_min=None,
        value_max=None,
        states=[],
        keywords=[],
    )
    opp = make_opp(
        naics_codes=["541512"],
        set_asides=["hubzone"],  # has set_asides but not matching cert → no unrestricted bonus
    )
    score, reasons = score_opportunity(opp, profile)
    assert score == pytest.approx(0.40)
    assert score_to_label(score) == "Medium"


def test_empty_profile():
    """Empty profile -> score = 0.10 (unrestricted bonus), label = Low."""
    profile = UserProfile(
        naics_codes=[],
        certifications=[],
        value_min=None,
        value_max=None,
        states=[],
        keywords=[],
    )
    opp = make_opp(
        naics_codes=["541512"],
        set_asides=[],  # empty set_asides -> unrestricted bonus
    )
    score, reasons = score_opportunity(opp, profile)
    assert score == pytest.approx(0.10)
    assert score_to_label(score) == "Low"
    assert any("Unrestricted" in r for r in reasons)


def test_urgent_deadline():
    """response_deadline = now + 24h -> urgency_tier='urgent', is_urgent=True."""
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(hours=24)
    days = (deadline.replace(tzinfo=None) - datetime.utcnow()).days
    urgency_tier = get_urgency_tier(days)
    is_urgent = urgency_tier == "urgent"
    assert urgency_tier == "urgent"
    assert is_urgent is True


def test_normal_deadline():
    """response_deadline = now + 10 days -> urgency_tier='normal', is_urgent=False."""
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(days=10)
    days = (deadline.replace(tzinfo=None) - datetime.utcnow()).days
    urgency_tier = get_urgency_tier(days)
    is_urgent = urgency_tier == "urgent"
    assert urgency_tier == "normal"
    assert is_urgent is False
