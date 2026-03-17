from datetime import datetime

import pytest

from app.agents.normalizers.cal_eprocure import CalEprocureNormalizer
from app.agents.normalizers.tx_smartbuy import TxSmartbuyNormalizer


@pytest.fixture
def cal_normalizer():
    return CalEprocureNormalizer()


@pytest.fixture
def tx_normalizer():
    return TxSmartbuyNormalizer()


def test_cal_normalizer_date_parsing(cal_normalizer):
    """'03/15/2026' parses to datetime(2026, 3, 15)."""
    result = cal_normalizer.parse_date("03/15/2026")
    assert result is not None
    assert result == datetime(2026, 3, 15)


def test_cal_normalizer_dvbe_setaside(cal_normalizer):
    """Input with 'DVBE' set-aside maps to ['dvbe'] in normalized output."""
    raw = {
        "external_id": "CAL-001",
        "title": "IT Services",
        "agency": "Dept of Tech",
        "set_asides": ["DVBE"],
        "opportunity_url": "https://caleprocure.ca.gov/event/CAL-001",
    }
    result = cal_normalizer.normalize(raw)
    assert "dvbe" in result.set_asides


def test_tx_normalizer_date_parsing(tx_normalizer):
    """'March 15, 2026' parses to datetime(2026, 3, 15)."""
    result = tx_normalizer.parse_date("March 15, 2026")
    assert result is not None
    assert result == datetime(2026, 3, 15)


def test_tx_normalizer_hubs_setaside(tx_normalizer):
    """Input with 'HUBs' set-aside maps to ['hubs'] in normalized output."""
    raw = {
        "external_id": "TX-001",
        "title": "Software Development",
        "agency": "Texas DIR",
        "set_asides": ["HUBs"],
        "opportunity_url": "https://www.txsmartbuy.gov/sp/TX-001",
    }
    result = tx_normalizer.normalize(raw)
    assert "hubs" in result.set_asides
