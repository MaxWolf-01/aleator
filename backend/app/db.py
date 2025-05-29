from contextlib import asynccontextmanager
from typing import AsyncIterator

from alembic import command, config
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.settings import Settings, get_settings

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine(settings: Settings = Depends(get_settings)) -> AsyncEngine:
    """Get or create the database engine using cached settings."""
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=settings.sqlalchemy_echo,
            pool_pre_ping=True,
        )
    return _engine


def get_session_maker(engine: AsyncEngine = Depends(get_engine)) -> async_sessionmaker[AsyncSession]:
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _session_maker


async def get_db_session(
    session_maker: async_sessionmaker[AsyncSession] = Depends(get_session_maker),
) -> AsyncIterator[AsyncSession]:
    async with session_maker() as session:
        yield session


async def prepare_database(
    settings: Settings = Depends(get_settings), engine: AsyncEngine = Depends(get_engine)
) -> None:
    """Prepare the database - either create tables or run migrations."""
    if settings.db_auto_create:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    else:
        alembic_cfg = config.Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")


async def prepare_database_startup() -> None:
    """Prepare the database during startup without dependency injection."""
    # Import models to ensure they're registered with SQLModel.metadata
    from app.models import BinaryDecision, Choice, Decision, MultiChoiceDecision, ProbabilityHistory, Roll, User

    settings = get_settings()
    engine = get_engine(settings)

    if settings.db_auto_create:
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    else:
        alembic_cfg = config.Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")


async def close_db(engine: AsyncEngine = Depends(get_engine)) -> None:
    await engine.dispose()
    global _engine, _session_maker
    _engine = None
    _session_maker = None


@asynccontextmanager
async def get_test_db_session(database_url: str):
    """Helper for testing - creates a temporary database session."""
    test_engine = create_async_engine(database_url, echo=False)
    test_session_maker = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with test_session_maker() as session:
        try:
            yield session
        finally:
            await test_engine.dispose()
