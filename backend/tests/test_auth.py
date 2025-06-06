import pytest
import pytest_asyncio

from app.auth import get_password_hash
from app.models import User


@pytest_asyncio.fixture
async def test_user(session):
    """Create a test user."""
    user = User(email="test@example.com", hashed_password=get_password_hash("testpass123"))
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


class TestAuthEndpoints:
    @pytest.mark.asyncio
    async def test_register_new_user(self, client):
        """Test user registration."""
        user_data = {"email": "newuser@example.com", "password": "password123"}

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert "id" in data
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client, test_user):
        """Test registration with existing email."""
        user_data = {"email": test_user.email, "password": "password123"}

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_password(self, client):
        """Test registration with invalid password."""
        user_data = {
            "email": "test@example.com",
            "password": "short",  # Too short
        }

        response = await client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_login_valid_credentials(self, client, test_user):
        """Test login with valid credentials."""
        login_data = {"username": test_user.email, "password": "testpass123"}

        response = await client.post(
            "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_invalid_email(self, client):
        """Test login with invalid email."""
        login_data = {"username": "nonexistent@example.com", "password": "password123"}

        response = await client.post(
            "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client, test_user):
        """Test login with invalid password."""
        login_data = {"username": test_user.email, "password": "wrongpassword"}

        response = await client.post(
            "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_current_user_with_token(self, client, test_user):
        """Test getting current user info with valid token."""
        # First login to get token
        login_data = {"username": test_user.email, "password": "testpass123"}

        login_response = await client.post(
            "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = login_response.json()["access_token"]

        # Then get user info
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id

    @pytest.mark.asyncio
    async def test_get_current_user_without_token(self, client):
        """Test getting current user info without token."""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code == 403  # Forbidden

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client):
        """Test getting current user info with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/v1/auth/me", headers=headers)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_guest_session(self, client):
        """Test guest session creation."""
        response = await client.post("/api/v1/auth/guest")
        assert response.status_code == 201
        data = response.json()
        assert "guest_token" in data
        assert len(data["guest_token"]) > 0

        # Test that guest token works for authentication
        guest_token = data["guest_token"]
        response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {guest_token}"})
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["is_guest"] is True
        assert "guest_" in user_data["email"]

    @pytest.mark.asyncio
    async def test_convert_guest_to_user(self, client):
        """Test converting a guest user to a registered user."""
        # First create a guest session
        response = await client.post("/api/v1/auth/guest")
        assert response.status_code == 201
        guest_token = response.json()["guest_token"]

        # Convert guest to user
        convert_data = {"email": "converted@example.com", "password": "TestPassword123"}
        response = await client.post(
            "/api/v1/auth/convert", json=convert_data, headers={"Authorization": f"Bearer {guest_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

        # Verify the user is no longer a guest
        response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["is_guest"] is False
        assert user_data["email"] == "converted@example.com"

    @pytest.mark.asyncio
    async def test_logout(self, client, test_user):
        """Test logout endpoint."""
        # First login to get token
        login_data = {"username": test_user.email, "password": "testpass123"}
        login_response = await client.post(
            "/api/v1/auth/login", data=login_data, headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        token = login_response.json()["access_token"]

        # Test logout
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 204  # No content

        # Note: Since we're using JWT tokens, the token is still technically valid
        # The client is responsible for removing it from storage
