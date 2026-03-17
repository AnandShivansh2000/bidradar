import logging
from datetime import datetime
from typing import Dict, Optional

logger = logging.getLogger(__name__)

PORTALS = ["sam_gov", "cal_eprocure", "tx_smartbuy"]

_health: Dict[str, dict] = {
    portal: {
        "last_scanned_at": None,
        "last_successful_scan_at": None,
        "consecutive_failures": 0,
        "status": "active",
    }
    for portal in PORTALS
}


def _compute_status(consecutive_failures: int) -> str:
    if consecutive_failures == 0:
        return "active"
    if consecutive_failures == 1:
        return "degraded"
    return "down"


def record_success(portal_name: str) -> None:
    if portal_name not in _health:
        _health[portal_name] = {"last_scanned_at": None, "last_successful_scan_at": None, "consecutive_failures": 0, "status": "active"}
    now = datetime.utcnow()
    _health[portal_name]["last_scanned_at"] = now
    _health[portal_name]["last_successful_scan_at"] = now
    _health[portal_name]["consecutive_failures"] = 0
    _health[portal_name]["status"] = "active"
    logger.info(f"Portal {portal_name} scan succeeded")


def record_failure(portal_name: str) -> None:
    if portal_name not in _health:
        _health[portal_name] = {"last_scanned_at": None, "last_successful_scan_at": None, "consecutive_failures": 0, "status": "active"}
    now = datetime.utcnow()
    _health[portal_name]["last_scanned_at"] = now
    _health[portal_name]["consecutive_failures"] += 1
    _health[portal_name]["status"] = _compute_status(_health[portal_name]["consecutive_failures"])
    logger.warning(f"Portal {portal_name} scan failed (consecutive={_health[portal_name]['consecutive_failures']})")


def get_all_statuses() -> Dict[str, dict]:
    return {k: dict(v) for k, v in _health.items()}


def get_portal_status(portal_name: str) -> Optional[dict]:
    return dict(_health[portal_name]) if portal_name in _health else None
