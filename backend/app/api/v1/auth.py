from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import (
    authenticate_user,
    create_access_token,
    create_guest_user,
    get_current_active_user,
    get_password_hash,
    get_user_by_email,
)
from app.db import get_db_session
from app.models import User
from app.schemas import GuestTokenResponse, GuestUserConvert, Token, UserLogin, UserRegister, UserResponse
from app.settings import Settings, get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, session: AsyncSession = Depends(get_db_session)):
    """Register a new user."""
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email, session)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(email=user_data.email, hashed_password=hashed_password)

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
):
    """Login and get access token."""
    user = await authenticate_user(form_data.username, form_data.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.email}, settings=settings)

    return Token(access_token=access_token)


@router.post("/guest", response_model=GuestTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_session(session: AsyncSession = Depends(get_db_session)):
    """Create a new guest session."""
    guest_user = await create_guest_user(session)
    return GuestTokenResponse(guest_token=guest_user.guest_token)


@router.post("/convert", response_model=Token)
async def convert_guest_to_user(
    convert_data: GuestUserConvert,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
):
    """Convert a guest user to a registered user."""
    if not current_user.is_guest:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a guest")

    # Check if email already exists
    existing_user = await get_user_by_email(convert_data.email, session)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Update the guest user
    current_user.email = convert_data.email
    current_user.hashed_password = get_password_hash(convert_data.password)
    current_user.is_guest = False
    current_user.guest_token = None  # Clear the guest token

    await session.commit()
    await session.refresh(current_user)

    # Create a new JWT token with the updated email
    access_token = create_access_token(data={"sub": current_user.email}, settings=settings)

    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    """Logout the current user."""
    # Since we're using JWT tokens, we don't need to do anything server-side
    # The client will remove the token from local storage
    return None
