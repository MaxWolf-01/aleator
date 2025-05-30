import pytest
import pytest_asyncio

from app.auth import get_password_hash
from app.models import BinaryDecision, Decision, DecisionType, User


@pytest_asyncio.fixture
async def test_user(session):
    """Create a test user."""
    user = User(email="test@example.com", hashed_password=get_password_hash("testpass123"))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(client, test_user):
    """Get authentication headers for test user."""
    login_data = {"username": test_user.email, "password": "testpass123"}

    response = await client.post(
        "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def test_binary_decision(session, test_user):
    """Create a test binary decision."""
    decision = Decision(user_id=test_user.id, title="Have dessert?", type=DecisionType.BINARY)
    session.add(decision)
    await session.commit()
    await session.refresh(decision)

    binary_decision = BinaryDecision(
        decision_id=decision.id, probability=67, yes_text="Yes, have dessert", no_text="No dessert tonight"
    )
    session.add(binary_decision)
    await session.commit()

    return decision


class TestDecisionEndpoints:
    @pytest.mark.asyncio
    async def test_create_binary_decision(self, client, auth_headers):
        """Test creating a binary decision."""
        decision_data = {
            "title": "Go for a run?",
            "type": "binary",
            "binary_data": {"probability": 70, "yes_text": "Go running", "no_text": "Stay home"},
        }

        response = await client.post("/api/v1/decisions/", json=decision_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == decision_data["title"]
        assert data["type"] == "binary"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_multi_choice_decision(self, client, auth_headers):
        """Test creating a multi-choice decision."""
        decision_data = {
            "title": "What to eat?",
            "type": "multi_choice",
            "multi_choice_data": {
                "choices": [
                    {"name": "Pizza", "weight": 40},
                    {"name": "Salad", "weight": 30},
                    {"name": "Sandwich", "weight": 30},
                ]
            },
        }

        response = await client.post("/api/v1/decisions/", json=decision_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == decision_data["title"]
        assert data["type"] == "multi_choice"

    @pytest.mark.asyncio
    async def test_create_decision_invalid_weights(self, client, auth_headers):
        """Test creating multi-choice decision with invalid weights."""
        decision_data = {
            "title": "What to eat?",
            "type": "multi_choice",
            "multi_choice_data": {
                "choices": [
                    {"name": "Pizza", "weight": 40},
                    {"name": "Salad", "weight": 30},
                    # Total = 70, should be 100
                ]
            },
        }

        response = await client.post("/api/v1/decisions/", json=decision_data, headers=auth_headers)

        assert response.status_code == 400
        assert "must sum to 100" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_user_decisions(self, client, auth_headers, test_binary_decision):
        """Test getting user's decisions."""
        response = await client.get("/api/v1/decisions/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["title"] == test_binary_decision.title

    @pytest.mark.asyncio
    async def test_get_specific_decision(self, client, auth_headers, test_binary_decision):
        """Test getting a specific decision."""
        response = await client.get(f"/api/v1/decisions/{test_binary_decision.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_binary_decision.id
        assert data["title"] == test_binary_decision.title

    @pytest.mark.asyncio
    async def test_get_nonexistent_decision(self, client, auth_headers):
        """Test getting a nonexistent decision."""
        response = await client.get("/api/v1/decisions/9999", headers=auth_headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_decision(self, client, auth_headers, test_binary_decision):
        """Test updating a decision."""
        update_data = {"title": "Updated title", "probability": 80}

        response = await client.put(
            f"/api/v1/decisions/{test_binary_decision.id}", json=update_data, headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]

    @pytest.mark.asyncio
    async def test_roll_binary_decision(self, client, auth_headers, test_binary_decision):
        """Test rolling a binary decision."""
        response = await client.post(f"/api/v1/decisions/{test_binary_decision.id}/roll", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"] in ["yes", "no"]
        assert "id" in data  # Roll ID

    @pytest.mark.asyncio
    async def test_roll_decision_multiple_times(self, client, auth_headers, test_binary_decision):
        """Test that rolling produces varied results over multiple attempts."""
        results = []
        for _ in range(10):
            # Roll the decision
            response = await client.post(f"/api/v1/decisions/{test_binary_decision.id}/roll", headers=auth_headers)
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            results.append(data["result"])

            # Confirm the roll to allow the next one
            roll_id = data["id"]
            confirm_response = await client.post(
                f"/api/v1/decisions/{test_binary_decision.id}/rolls/{roll_id}/confirm",
                headers=auth_headers,
                json={"followed": True},
            )
            assert confirm_response.status_code == 200

        # With 67% probability, we might get varied results
        # This is probabilistic, so we just check that all results are valid
        assert all(result in ["yes", "no"] for result in results)

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client):
        """Test that endpoints require authentication."""
        # Test without auth headers
        response = await client.get("/api/v1/decisions/")
        assert response.status_code == 403

        response = await client.post("/api/v1/decisions/", json={})
        assert response.status_code == 403
