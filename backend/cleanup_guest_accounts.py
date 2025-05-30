#!/usr/bin/env python3
"""Cleanup script for removing old guest accounts.
Can be run as a cron job or scheduled task.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_db_session
from app.models import Decision, User


async def cleanup_old_guest_accounts(days_old: int = 30):
    """Remove guest accounts that haven't been active for specified days."""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)

    async for session in get_db_session():
        # Find old guest accounts
        statement = select(User).where(User.is_guest == True, User.created_at < cutoff_date)
        result = await session.exec(statement)
        old_guests = result.all()

        if not old_guests:
            print("No old guest accounts found.")
            return

        print(f"Found {len(old_guests)} guest accounts older than {days_old} days.")

        # Check if they have any recent activity (rolls)
        removed_count = 0
        for guest in old_guests:
            # Check for recent decisions or rolls
            decisions_stmt = (
                select(Decision).where(Decision.user_id == guest.id).order_by(col(Decision.updated_at).desc()).limit(1)
            )

            decisions_result = await session.exec(decisions_stmt)
            latest_decision = decisions_result.first()

            # If no decisions or last activity is old, delete the account
            if not latest_decision or latest_decision.updated_at < cutoff_date:
                await session.delete(guest)
                removed_count += 1
                print(f"Removed guest account: {guest.email}")

        await session.commit()
        print(f"Cleanup complete. Removed {removed_count} inactive guest accounts.")


if __name__ == "__main__":
    # Run cleanup for accounts older than 30 days
    asyncio.run(cleanup_old_guest_accounts(30))
