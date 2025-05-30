#!/usr/bin/env python3
"""Test creating a decision with decimal probability."""

import asyncio
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_password_hash
from app.models import BinaryDecision, Decision, DecisionType, ProbabilityHistory, User
from app.settings import get_settings


async def test_decimal_probability():
    """Test creating decisions with different probability granularities."""
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    
    async with AsyncSession(engine) as session:
        # Create test user
        user = User(
            email="decimal_test@example.com",
            hashed_password=get_password_hash("testpass123"),
            created_at=datetime.now(timezone.utc),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
        # Test decisions with different granularities
        test_cases = [
            {
                "title": "Whole number probability (67%)",
                "probability": 67.0,
                "granularity": 0,
            },
            {
                "title": "One decimal probability (33.7%)",
                "probability": 33.7,
                "granularity": 1,
            },
            {
                "title": "Two decimal probability (12.34%)",
                "probability": 12.34,
                "granularity": 2,
            },
        ]
        
        for test_case in test_cases:
            # Create decision
            decision = Decision(
                user_id=user.id,
                title=test_case["title"],
                type=DecisionType.BINARY,
                cooldown_hours=0,
                created_at=datetime.now(timezone.utc),
            )
            session.add(decision)
            await session.commit()
            await session.refresh(decision)
            
            # Create binary decision with specific granularity
            binary = BinaryDecision(
                decision_id=decision.id,
                probability=test_case["probability"],
                probability_granularity=test_case["granularity"],
                yes_text="Yes",
                no_text="No",
            )
            session.add(binary)
            
            # Add probability history
            prob_history = ProbabilityHistory(
                decision_id=decision.id,
                probability=test_case["probability"],
                changed_at=datetime.now(timezone.utc),
            )
            session.add(prob_history)
            
            await session.commit()
            print(f"✓ Created: {test_case['title']} - probability={test_case['probability']}, granularity={test_case['granularity']}")
    
    await engine.dispose()
    print("\nDecimal probability test complete!")


if __name__ == "__main__":
    asyncio.run(test_decimal_probability())