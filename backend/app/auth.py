import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_db_session
from app.models import User
from app.settings import Settings, get_settings

# HTTP Bearer token for JWT
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Hash a password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(data: dict, settings: Settings) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt


async def get_user_by_email(email: str, session: AsyncSession) -> Optional[User]:
    """Get a user by email."""
    statement = select(User).where(User.email == email)
    result = await session.exec(statement)
    return result.first()


async def get_user_by_guest_token(guest_token: str, session: AsyncSession) -> Optional[User]:
    """Get a user by guest token."""
    statement = select(User).where(User.guest_token == guest_token)
    result = await session.exec(statement)
    return result.first()


async def create_guest_user(session: AsyncSession) -> User:
    """Create a new guest user with a unique token."""
    # Generate a unique guest token
    guest_token = secrets.token_urlsafe(32)

    # Create a dummy email and password for the guest user
    guest_email = f"guest_{guest_token[:8]}@aleatoric.agency"
    dummy_password = secrets.token_urlsafe(16)

    guest_user = User(
        email=guest_email, hashed_password=get_password_hash(dummy_password), is_guest=True, guest_token=guest_token
    )

    session.add(guest_user)
    await session.commit()
    await session.refresh(guest_user)

    return guest_user


async def authenticate_user(email: str, password: str, session: AsyncSession) -> Optional[User]:
    """Authenticate a user with email and password."""
    user = await get_user_by_email(email, session)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> User:
    """Get the current user from JWT token or guest token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    # First, try to decode as JWT token
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception

        user = await get_user_by_email(email, session)
        if user is None:
            raise credentials_exception

        return user
    except jwt.PyJWTError:
        # If JWT decode fails, try as guest token
        user = await get_user_by_guest_token(token, session)
        if user is None:
            raise credentials_exception

        return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
