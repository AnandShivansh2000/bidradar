import asyncio
from datetime import datetime, timedelta

import app.services.notification_service as ns
from app.models.profile import UserProfile


def test_build_digest_html_contains_opportunity_title():
    profile = UserProfile(email="test@example.com")
    opportunities = [{"title": "Test Opportunity Title"}]
    html = ns._build_digest_html(opportunities, profile)
    assert "Test Opportunity Title" in html


def test_build_alert_html_contains_action_required():
    opportunity = {
        "title": "Urgent Contract",
        "response_deadline": datetime.utcnow() + timedelta(hours=1),
    }
    html = ns._build_alert_html(opportunity)
    assert "ACTION REQUIRED" in html


def test_send_email_without_api_key_returns_false(monkeypatch):
    monkeypatch.setattr(ns, "AGENTMAIL_API_KEY", "")
    result = asyncio.run(ns._send_email("test@test.com", "subj", "<p>html</p>"))
    assert result is False
