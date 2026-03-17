import pytest
from app.services import portal_health


@pytest.fixture(autouse=True)
def reset_health():
    """Reset module-level _health state before each test."""
    for portal in portal_health.PORTALS:
        portal_health._health[portal] = {
            "last_scanned_at": None,
            "last_successful_scan_at": None,
            "consecutive_failures": 0,
            "status": "active",
        }
    yield


def test_initial_status_active():
    assert portal_health._health["sam_gov"]["status"] == "active"
    assert portal_health._health["sam_gov"]["consecutive_failures"] == 0


def test_record_failure_degraded():
    portal_health.record_failure("sam_gov")
    status = portal_health.get_portal_status("sam_gov")
    assert status["status"] == "degraded"


def test_record_failure_down():
    portal_health.record_failure("sam_gov")
    portal_health.record_failure("sam_gov")
    status = portal_health.get_portal_status("sam_gov")
    assert status["status"] == "down"


def test_record_success_resets():
    portal_health.record_failure("sam_gov")
    portal_health.record_success("sam_gov")
    status = portal_health.get_portal_status("sam_gov")
    assert status["status"] == "active"
    assert status["consecutive_failures"] == 0


def test_get_all_health_returns_portals():
    statuses = portal_health.get_all_statuses()
    for portal in portal_health.PORTALS:
        assert portal in statuses
