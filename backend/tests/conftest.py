import os

# Set test environment variables BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SQLALCHEMY_ECHO"] = "false"
os.environ["DB_AUTO_CREATE"] = "true"
os.environ["CORS_ORIGINS"] = '["http://localhost:5173"]'
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_testing_only"

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app import create_app
from app.db import get_db_session


@pytest_asyncio.fixture(scope="function")
async def engine():
    """Create async engine for tests."""
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def session(engine):
    """Create async session for tests."""
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def app(session):
    """Create test app with overridden dependencies."""
    test_app = create_app()

    # Override the database session dependency
    async def override_get_db():
        yield session

    test_app.dependency_overrides[get_db_session] = override_get_db

    yield test_app

    # Clear overrides
    test_app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def client(app):
    """Create test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
