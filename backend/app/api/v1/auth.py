from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import User
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.auth import (
    authenticate_user, 
    create_access_token, 
    get_password_hash,
    get_current_active_user,
    get_user_by_email
)
from app.db import get_db_session
from app.settings import Settings, get_settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    session: AsyncSession = Depends(get_db_session)
):
    """Register a new user."""
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email, session)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user


@router.post("/login", response_model=Token)
async def login(
    user_data: UserLogin,
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings)
):
    """Login and get access token."""
    user = await authenticate_user(user_data.email, user_data.password, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email}, 
        settings=settings
    )
    
    return Token(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information."""
    return current_user