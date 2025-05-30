#!/usr/bin/env python3
"""
End-to-end test for authentication flow.
Can be run manually to verify auth is working properly.
"""

import asyncio
import sys

import httpx


async def test_auth_flow():
    """Test the complete authentication flow."""
    base_url = "http://localhost:8000"

    async with httpx.AsyncClient() as client:
        print("🧪 Testing Authentication Flow...")

        # 1. Test guest session creation
        print("\n1️⃣ Creating guest session...")
        response = await client.post(f"{base_url}/api/v1/auth/guest")
        if response.status_code != 201:
            print(f"❌ Failed to create guest session: {response.status_code} - {response.text}")
            return False

        guest_token = response.json()["guest_token"]
        print(f"✅ Guest token: {guest_token[:20]}...")

        # 2. Test guest authentication
        print("\n2️⃣ Testing guest authentication...")
        headers = {"Authorization": f"Bearer {guest_token}"}
        response = await client.get(f"{base_url}/api/v1/auth/me", headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to authenticate as guest: {response.status_code}")
            return False

        guest_user = response.json()
        print(f"✅ Authenticated as guest: {guest_user['email']}")

        # 3. Test user registration
        print("\n3️⃣ Registering new user...")
        test_email = f"test_{int(asyncio.get_event_loop().time())}@example.com"
        register_data = {"email": test_email, "password": "TestPassword123!"}
        response = await client.post(f"{base_url}/api/v1/auth/register", json=register_data)
        if response.status_code != 201:
            print(f"❌ Failed to register: {response.status_code} - {response.text}")
            return False

        print(f"✅ Registered user: {test_email}")

        # 4. Test login
        print("\n4️⃣ Testing login...")
        login_data = {"username": test_email, "password": "TestPassword123!"}
        response = await client.post(
            f"{base_url}/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            print(f"❌ Failed to login: {response.status_code} - {response.text}")
            return False

        access_token = response.json()["access_token"]
        print(f"✅ Login successful, token: {access_token[:20]}...")

        # 5. Test authenticated access
        print("\n5️⃣ Testing authenticated access...")
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get(f"{base_url}/api/v1/auth/me", headers=headers)
        if response.status_code != 200:
            print(f"❌ Failed to access protected route: {response.status_code}")
            return False

        user_data = response.json()
        print(f"✅ Authenticated as: {user_data['email']}")

        # 6. Test logout
        print("\n6️⃣ Testing logout...")
        response = await client.post(f"{base_url}/api/v1/auth/logout", headers=headers)
        if response.status_code != 204:
            print(f"❌ Failed to logout: {response.status_code}")
            return False

        print("✅ Logout successful")

        print("\n🎉 All authentication tests passed!")
        return True


async def main():
    """Run the test."""
    try:
        success = await test_auth_flow()
        sys.exit(0 if success else 1)
    except httpx.ConnectError:
        print("❌ Could not connect to backend. Is it running on http://localhost:8000?")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
