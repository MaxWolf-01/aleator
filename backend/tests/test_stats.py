import pytest


@pytest.mark.asyncio
async def test_stats_endpoint(client):
    """Test that the stats endpoint returns the expected structure."""
    response = await client.get("/api/v1/stats/")

    assert response.status_code == 200
    data = response.json()

    # Check all expected fields are present
    expected_fields = [
        "total_users",
        "guest_users",
        "registered_users",
        "total_decisions",
        "total_rolls",
        "new_users_today",
        "active_users_today",
        "server_uptime",
    ]

    for field in expected_fields:
        assert field in data, f"Missing field: {field}"

    # Check server_uptime structure
    assert "seconds" in data["server_uptime"]
    assert "formatted" in data["server_uptime"]

    # Check types
    assert isinstance(data["total_users"], int)
    assert isinstance(data["guest_users"], int)
    assert isinstance(data["registered_users"], int)
    assert isinstance(data["total_decisions"], int)
    assert isinstance(data["total_rolls"], int)
    assert isinstance(data["new_users_today"], int)
    assert isinstance(data["active_users_today"], int)
    assert isinstance(data["server_uptime"]["seconds"], int)
    assert isinstance(data["server_uptime"]["formatted"], str)

    # Check values are non-negative
    assert data["total_users"] >= 0
    assert data["guest_users"] >= 0
    assert data["registered_users"] >= 0
    assert data["total_decisions"] >= 0
    assert data["total_rolls"] >= 0
    assert data["new_users_today"] >= 0
    assert data["active_users_today"] >= 0
    assert data["server_uptime"]["seconds"] >= 0
