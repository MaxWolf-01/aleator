#!/usr/bin/env python3
"""Populate database with test data for various time horizons and patterns.
This helps test chart x-axis formatting and date handling.
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_password_hash
from app.models import (
    BinaryDecision,
    Decision,
    DecisionType,
    ProbabilityHistory,
    Roll,
    User,
)
from app.settings import get_settings


def create_rolls_pattern(
    decision_id: int,
    pattern_type: str,
    start_date: datetime,
    end_date: datetime,
    probability: int = 50,
) -> tuple[list[Roll], list[ProbabilityHistory]]:
    """Create rolls and probability history based on pattern type."""
    rolls = []
    prob_history = []
    current_date = start_date
    has_pending_roll = False  # Track if we've already created a pending roll

    if pattern_type == "dense_daily":
        # Multiple rolls per day
        while current_date < end_date:
            num_rolls = random.randint(2, 5)
            for i in range(num_rolls):
                roll_time = current_date + timedelta(hours=random.randint(0, 23), minutes=random.randint(0, 59))
                result = "yes" if random.randint(1, 100) <= probability else "no"
                # Only allow one pending roll per decision
                if not has_pending_roll and random.random() < 0.05:  # 5% chance of pending
                    followed = None
                    has_pending_roll = True
                else:
                    followed = random.choice([True, False])

                roll = Roll(
                    decision_id=decision_id,
                    result=result,
                    followed=followed,
                    created_at=roll_time,
                )
                rolls.append(roll)

            # Occasional probability changes
            if random.random() < 0.1:
                probability = max(1, min(99, probability + random.randint(-10, 10)))
                prob_history.append(
                    ProbabilityHistory(
                        decision_id=decision_id,
                        probability=probability,
                        changed_at=current_date + timedelta(hours=12),
                    )
                )

            current_date += timedelta(days=1)

    elif pattern_type == "sparse_weekly":
        # One or two rolls per week
        while current_date < end_date:
            if random.random() < 0.4:  # 40% chance of roll this week
                roll_time = current_date + timedelta(days=random.randint(0, 6))
                result = "yes" if random.randint(1, 100) <= probability else "no"
                followed = random.choice([True, False])

                roll = Roll(
                    decision_id=decision_id,
                    result=result,
                    followed=followed,
                    created_at=roll_time,
                )
                rolls.append(roll)

                # Occasional second roll in the week
                if random.random() < 0.3:
                    roll_time2 = current_date + timedelta(days=random.randint(0, 6))
                    result2 = "yes" if random.randint(1, 100) <= probability else "no"
                    followed2 = random.choice([True, False])

                    roll2 = Roll(
                        decision_id=decision_id,
                        result=result2,
                        followed=followed2,
                        created_at=roll_time2,
                    )
                    rolls.append(roll2)

            # Rare probability changes
            if random.random() < 0.05:
                probability = max(1, min(99, probability + random.randint(-15, 15)))
                prob_history.append(
                    ProbabilityHistory(
                        decision_id=decision_id,
                        probability=probability,
                        changed_at=current_date + timedelta(days=3),
                    )
                )

            current_date += timedelta(weeks=1)

    elif pattern_type == "regular_daily":
        # One roll per day, very consistent
        while current_date < end_date:
            roll_time = current_date + timedelta(hours=random.randint(18, 21))  # Evening rolls
            result = "yes" if random.randint(1, 100) <= probability else "no"
            followed = True if random.random() > 0.2 else False  # 80% follow-through

            roll = Roll(
                decision_id=decision_id,
                result=result,
                followed=followed,
                created_at=roll_time,
            )
            rolls.append(roll)

            # Gradual probability changes
            if random.random() < 0.03:
                probability = max(1, min(99, probability + random.randint(-5, 5)))
                prob_history.append(
                    ProbabilityHistory(
                        decision_id=decision_id,
                        probability=probability,
                        changed_at=current_date + timedelta(hours=20),
                    )
                )

            current_date += timedelta(days=1)

    elif pattern_type == "burst_then_sparse":
        # Intense usage for a period, then sparse
        burst_end = start_date + (end_date - start_date) / 3

        # Burst phase
        while current_date < burst_end:
            num_rolls = random.randint(1, 3)
            for i in range(num_rolls):
                roll_time = current_date + timedelta(hours=random.randint(0, 23))
                result = "yes" if random.randint(1, 100) <= probability else "no"
                followed = random.choice([True, False])

                roll = Roll(
                    decision_id=decision_id,
                    result=result,
                    followed=followed,
                    created_at=roll_time,
                )
                rolls.append(roll)

            if random.random() < 0.15:
                probability = max(1, min(99, probability + random.randint(-10, 10)))
                prob_history.append(
                    ProbabilityHistory(
                        decision_id=decision_id,
                        probability=probability,
                        changed_at=current_date,
                    )
                )

            current_date += timedelta(days=1)

        # Sparse phase
        while current_date < end_date:
            if random.random() < 0.1:  # 10% chance of roll
                result = "yes" if random.randint(1, 100) <= probability else "no"
                followed = random.choice([True, False, None])

                roll = Roll(
                    decision_id=decision_id,
                    result=result,
                    followed=followed,
                    created_at=current_date,
                )
                rolls.append(roll)

            current_date += timedelta(days=random.randint(3, 10))

    elif pattern_type == "monthly_sparse":
        # A few rolls per month
        while current_date < end_date:
            rolls_this_month = random.randint(1, 4)
            for i in range(rolls_this_month):
                roll_time = current_date + timedelta(days=random.randint(0, 27))
                result = "yes" if random.randint(1, 100) <= probability else "no"
                followed = True if random.random() > 0.3 else False

                roll = Roll(
                    decision_id=decision_id,
                    result=result,
                    followed=followed,
                    created_at=roll_time,
                )
                rolls.append(roll)

            # Very rare probability changes
            if random.random() < 0.02:
                probability = max(1, min(99, probability + random.randint(-20, 20)))
                prob_history.append(
                    ProbabilityHistory(
                        decision_id=decision_id,
                        probability=probability,
                        changed_at=current_date + timedelta(days=15),
                    )
                )

            current_date += timedelta(days=30)

    return rolls, prob_history


async def populate_test_data():
    """Populate database with test data."""
    import os

    settings = get_settings()

    # Use environment variable or PostgreSQL if running in Docker
    database_url = os.getenv(
        "DATABASE_URL", "postgresql+asyncpg://aleator:aleator_dev_password@localhost:5432/aleator_dev"
    )
    if "sqlite" in database_url:
        # For local development without Docker
        engine = create_async_engine(str(settings.database_url))
    else:
        # For Docker PostgreSQL
        engine = create_async_engine(database_url)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with AsyncSession(engine) as session:
        # Create test user
        result = await session.exec(select(User).where(User.email == "test@example.com"))
        existing_user = result.first()
        if not existing_user:
            user = User(
                email="test@example.com",
                hashed_password=get_password_hash("testpassword"),
                created_at=datetime.now(timezone.utc) - timedelta(days=730),  # 2 years ago
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        else:
            user = existing_user
            print("Using existing test user")

        # Test patterns with descriptions
        test_decisions = [
            {
                "title": "Daily Dessert (Dense, Recent)",
                "pattern": "dense_daily",
                "time_range": (7, 0),  # Last week
                "probability": 33,
                "cooldown": 4,
            },
            {
                "title": "Weekly Exercise (Sparse, 3 Months)",
                "pattern": "sparse_weekly",
                "time_range": (90, 0),
                "probability": 75,
                "cooldown": 168,  # 1 week
            },
            {
                "title": "Evening Meditation (Regular, 1 Month)",
                "pattern": "regular_daily",
                "time_range": (30, 0),
                "probability": 80,
                "cooldown": 20,
            },
            {
                "title": "New Year Resolution (Burst then Sparse, 1 Year)",
                "pattern": "burst_then_sparse",
                "time_range": (365, 0),
                "probability": 50,
                "cooldown": 24,
            },
            {
                "title": "Monthly Treat (Very Sparse, 2 Years)",
                "pattern": "monthly_sparse",
                "time_range": (730, 0),
                "probability": 40,
                "cooldown": 720,  # 1 month
            },
            {
                "title": "Weekend Gaming (Weekly Pattern, 6 Months)",
                "pattern": "sparse_weekly",
                "time_range": (180, 0),
                "probability": 60,
                "cooldown": 72,
            },
            {
                "title": "Morning Coffee (Dense Recent + Gap)",
                "pattern": "dense_daily",
                "time_range": (14, 0),  # Last 2 weeks
                "probability": 25,
                "cooldown": 12,
            },
            {
                "title": "Study Break (Irregular, 2 Months)",
                "pattern": "burst_then_sparse",
                "time_range": (60, 0),
                "probability": 70,
                "cooldown": 2,
            },
        ]

        # Need to ensure user.id is loaded before using it
        user_id = user.id

        for decision_data in test_decisions:
            # Check if decision already exists
            result = await session.exec(
                select(Decision).where(Decision.user_id == user_id, Decision.title == decision_data["title"])
            )
            existing = result.first()

            if existing:
                print(f"Decision '{decision_data['title']}' already exists, skipping...")
                continue

            # Create decision
            end_date = datetime.now(timezone.utc) - timedelta(days=decision_data["time_range"][1])
            start_date = datetime.now(timezone.utc) - timedelta(days=decision_data["time_range"][0])

            decision = Decision(
                user_id=user_id,
                title=decision_data["title"],
                type=DecisionType.BINARY,
                cooldown_hours=decision_data["cooldown"],
                created_at=start_date - timedelta(days=1),  # Created just before first roll
                updated_at=end_date,
            )
            session.add(decision)
            await session.commit()
            await session.refresh(decision)

            # Create binary decision
            binary = BinaryDecision(
                decision_id=decision.id,
                probability=decision_data["probability"],
                probability_granularity=0,
                yes_text="Do it",
                no_text="Skip it",
            )
            session.add(binary)

            # Add initial probability history entry
            initial_prob = ProbabilityHistory(
                decision_id=decision.id,
                probability=decision_data["probability"],
                changed_at=start_date - timedelta(hours=1),
            )
            session.add(initial_prob)

            # Generate rolls and probability history
            rolls, prob_history = create_rolls_pattern(
                decision.id,
                decision_data["pattern"],
                start_date,
                end_date,
                decision_data["probability"],
            )

            # Add all rolls and probability history
            for roll in rolls:
                session.add(roll)

            for prob in prob_history:
                session.add(prob)

            await session.commit()
            print(
                f"Created decision '{decision_data['title']}' with {len(rolls)} rolls and {len(prob_history)} probability changes"
            )

        # Add one decision with a pending roll (unconfirmed)
        pending_decision = Decision(
            user_id=user_id,
            title="Pending Roll Test (Today)",
            type=DecisionType.BINARY,
            cooldown_hours=24,
            created_at=datetime.now(timezone.utc) - timedelta(days=7),
        )
        session.add(pending_decision)
        await session.commit()
        await session.refresh(pending_decision)

        binary_pending = BinaryDecision(
            decision_id=pending_decision.id,
            probability=50,
            probability_granularity=0,
            yes_text="Yes",
            no_text="No",
        )
        session.add(binary_pending)

        # Add some history and a pending roll
        for i in range(5):
            roll = Roll(
                decision_id=pending_decision.id,
                result=random.choice(["yes", "no"]),
                followed=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=6 - i),
            )
            session.add(roll)

        # The pending roll
        pending_roll = Roll(
            decision_id=pending_decision.id,
            result="yes",
            followed=None,  # Not confirmed
            created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )
        session.add(pending_roll)

        await session.commit()
        print("Created decision with pending (unconfirmed) roll")

        print("\nTest data population complete!")
        print(f"Login with: test@example.com / testpassword")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(populate_test_data())
