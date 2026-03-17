import pytest
import os

from app.agents.tinyfish_client import TinyFishClient
from app.agents.normalizers.sam_gov import SamGovNormalizer


@pytest.mark.integration
async def test_sam_gov_real_scan():
    """
    Tests a real TinyFish call to SAM.gov (excluded from CI).
    Requires TINYFISH_API_KEY env var to be set.
    """
    api_key = os.getenv("TINYFISH_API_KEY")
    if not api_key:
        pytest.skip("TINYFISH_API_KEY not set, skipping integration test")

    from app.agents.sam_gov_agent import SamGovAgent, SAM_GOV_AGENT_PROMPT

    client = TinyFishClient()
    session = await client.start_scan(
        portal="sam_gov",
        agent_prompt=SAM_GOV_AGENT_PROMPT,
        search_params={},
    )
    assert session.session_id
    assert session.stream_url

    raw_results = await client.poll_results(session.session_id)
    assert len(raw_results) >= 10, f"Expected >= 10 results, got {len(raw_results)}"

    normalizer = SamGovNormalizer()
    normalized = normalizer.normalize_batch(raw_results)

    required_fields = ["title", "agency", "opportunity_url", "posted_date"]
    populated_count = 0
    for opp in normalized:
        opp_dict = opp.model_dump()
        if all(opp_dict.get(f) for f in required_fields):
            populated_count += 1

    populated_ratio = populated_count / len(normalized) if normalized else 0
    assert populated_ratio >= 0.8, (
        f"Expected >= 80% of results to have required fields populated, "
        f"got {populated_ratio:.0%} ({populated_count}/{len(normalized)})"
    )
