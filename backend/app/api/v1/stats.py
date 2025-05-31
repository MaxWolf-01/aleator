import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_db_session
from app.models import Decision, Roll, User

router = APIRouter(prefix="/stats", tags=["stats"])

# Store server start time
SERVER_START_TIME = time.time()

# Simple in-memory cache for stats
_stats_cache: Optional[Dict[str, Any]] = None
_cache_timestamp: Optional[datetime] = None
CACHE_DURATION = timedelta(hours=1)


@router.get("/")
async def get_stats(session: AsyncSession = Depends(get_db_session)):
    """Get basic statistics about the Aleator service (cached for 1 hour)"""
    global _stats_cache, _cache_timestamp

    # Check if cache is valid
    now = datetime.now(timezone.utc)
    if _stats_cache and _cache_timestamp and (now - _cache_timestamp) < CACHE_DURATION:
        # Update only the dynamic fields (uptime and potentially today's stats)
        uptime_seconds = int(time.time() - SERVER_START_TIME)
        days = uptime_seconds // 86400
        hours = (uptime_seconds % 86400) // 3600
        minutes = (uptime_seconds % 3600) // 60
        seconds = uptime_seconds % 60

        _stats_cache["server_uptime"] = {
            "seconds": uptime_seconds,
            "formatted": f"{days}d {hours}h {minutes}m {seconds}s",
        }
        return _stats_cache

    # Get current time for "today" calculations
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Total users (guest + registered)
    result = await session.exec(select(func.count(User.id)))
    total_users = result.one()

    # Guest users
    result = await session.exec(select(func.count(User.id)).where(User.is_guest == True))
    guest_users = result.one()

    # Registered users
    result = await session.exec(select(func.count(User.id)).where(User.is_guest == False))
    registered_users = result.one()

    # Total decisions
    result = await session.exec(select(func.count(Decision.id)))
    total_decisions = result.one()

    # Total rolls
    result = await session.exec(select(func.count(Roll.id)))
    total_rolls = result.one()

    # New users today
    result = await session.exec(select(func.count(User.id)).where(User.created_at >= today_start))
    new_users_today = result.one()

    # Active users today (made a roll)
    result = await session.exec(
        select(func.count(func.distinct(Decision.user_id))).join(Roll).where(Roll.created_at >= today_start)
    )
    active_users_today = result.one()

    # Rolls today
    result = await session.exec(select(func.count(Roll.id)).where(Roll.created_at >= today_start))
    rolls_today = result.one()

    # Decisions created today
    result = await session.exec(select(func.count(Decision.id)).where(Decision.created_at >= today_start))
    decisions_today = result.one()

    # Server uptime in seconds
    uptime_seconds = int(time.time() - SERVER_START_TIME)

    # Convert uptime to human-readable format
    days = uptime_seconds // 86400
    hours = (uptime_seconds % 86400) // 3600
    minutes = (uptime_seconds % 3600) // 60
    seconds = uptime_seconds % 60

    uptime_formatted = f"{days}d {hours}h {minutes}m {seconds}s"

    stats = {
        "total_users": total_users or 0,
        "guest_users": guest_users or 0,
        "registered_users": registered_users or 0,
        "total_decisions": total_decisions or 0,
        "total_rolls": total_rolls or 0,
        "new_users_today": new_users_today or 0,
        "active_users_today": active_users_today or 0,
        "rolls_today": rolls_today or 0,
        "decisions_today": decisions_today or 0,
        "server_uptime": {"seconds": uptime_seconds, "formatted": uptime_formatted},
    }

    # Update cache
    _stats_cache = stats
    _cache_timestamp = now

    return stats
