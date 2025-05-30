import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import select, col
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    BinaryDecision,
    Choice,
    Decision,
    DecisionType,
    MultiChoiceDecision,
    ProbabilityHistory,
    Roll,
    User,
)
from app.schemas import DecisionCreate, DecisionUpdate


async def create_decision(user: User, decision_data: DecisionCreate, session: AsyncSession) -> Decision:
    """Create a new decision for a user."""
    # Get max display_order for user's decisions
    from sqlmodel import func

    max_order_statement = select(func.max(Decision.display_order)).where(Decision.user_id == user.id)
    max_order_result = await session.exec(max_order_statement)
    max_order = max_order_result.first() or 0

    # Create the base decision
    decision = Decision(
        user_id=user.id,
        title=decision_data.title,
        type=decision_data.type,
        cooldown_hours=decision_data.cooldown_hours,
        display_order=max_order + 1,
    )
    session.add(decision)
    await session.commit()
    await session.refresh(decision)

    # Create type-specific data
    if decision_data.type == DecisionType.BINARY:
        if not decision_data.binary_data:
            raise ValueError("Binary decision data is required")

        binary_decision = BinaryDecision(
            decision_id=decision.id,
            probability=decision_data.binary_data.probability,
            probability_granularity=decision_data.binary_data.probability_granularity,
            yes_text=decision_data.binary_data.yes_text,
            no_text=decision_data.binary_data.no_text,
        )
        session.add(binary_decision)

        # Add initial probability history entry
        prob_history = ProbabilityHistory(decision_id=decision.id, probability=decision_data.binary_data.probability)
        session.add(prob_history)

    elif decision_data.type == DecisionType.MULTI_CHOICE:
        if not decision_data.multi_choice_data:
            raise ValueError("Multi-choice decision data is required")

        # Validate weights sum to 100
        total_weight = sum(choice.weight for choice in decision_data.multi_choice_data.choices)
        if total_weight != 100:
            raise ValueError("Choice weights must sum to 100")

        multi_choice = MultiChoiceDecision(decision_id=decision.id)
        session.add(multi_choice)

        for choice_data in decision_data.multi_choice_data.choices:
            choice = Choice(decision_id=decision.id, name=choice_data.name, weight=choice_data.weight)
            session.add(choice)

    await session.commit()

    # Reload with relationships
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.id == decision.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision).selectinload(MultiChoiceDecision.choices),
            selectinload(Decision.rolls),
            selectinload(Decision.probability_history),
        )
    )
    result = await session.exec(statement)
    return result.one()


async def get_user_decisions(user: User, session: AsyncSession) -> list[Decision]:
    """Get all decisions for a user."""
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.user_id == user.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision).selectinload(MultiChoiceDecision.choices),
            selectinload(Decision.rolls),
            selectinload(Decision.probability_history),
        )
        .order_by(col(Decision.display_order).asc(), col(Decision.created_at).desc())
    )
    result = await session.exec(statement)
    return list(result.all())


async def get_decision_by_id(decision_id: int, user: User, session: AsyncSession) -> Optional[Decision]:
    """Get a specific decision by ID, ensuring it belongs to the user."""
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.id == decision_id, Decision.user_id == user.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision).selectinload(MultiChoiceDecision.choices),
            selectinload(Decision.rolls),
            selectinload(Decision.probability_history),
        )
    )
    result = await session.exec(statement)
    return result.first()


async def update_decision(decision: Decision, update_data: DecisionUpdate, session: AsyncSession) -> Decision:
    """Update a decision."""
    if update_data.title is not None:
        decision.title = update_data.title

    if update_data.cooldown_hours is not None:
        decision.cooldown_hours = update_data.cooldown_hours

    if update_data.display_order is not None:
        decision.display_order = update_data.display_order

    # For binary decisions, update probability and text
    if decision.type == DecisionType.BINARY:
        # Get current binary decision
        binary_statement = select(BinaryDecision).where(BinaryDecision.decision_id == decision.id)
        binary_result = await session.exec(binary_statement)
        binary_decision = binary_result.first()

        if binary_decision:
            # Update probability if provided
            if update_data.probability is not None and binary_decision.probability != update_data.probability:
                binary_decision.probability = update_data.probability

                # Record probability change in history
                prob_history = ProbabilityHistory(decision_id=decision.id, probability=update_data.probability)
                session.add(prob_history)

            # Update probability granularity if provided
            if update_data.probability_granularity is not None:
                binary_decision.probability_granularity = update_data.probability_granularity

            # Update yes/no text if provided
            if update_data.yes_text is not None:
                binary_decision.yes_text = update_data.yes_text
            if update_data.no_text is not None:
                binary_decision.no_text = update_data.no_text

    await session.commit()

    # Reload with relationships
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.id == decision.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision).selectinload(MultiChoiceDecision.choices),
            selectinload(Decision.rolls),
            selectinload(Decision.probability_history),
        )
    )
    result = await session.exec(statement)
    return result.one()


def roll_binary_decision(probability: float) -> str:
    """Roll a binary decision using cryptographically secure randomness."""
    if not (0.01 <= probability <= 99.99):
        raise ValueError("Probability must be between 0.01 and 99.99")

    # Generate random value with same precision as probability
    # Use 10000 for up to 2 decimal places
    random_value = secrets.randbelow(10000) / 100.0
    return "yes" if random_value < probability else "no"


def roll_multi_choice_decision(choices: list[Choice]) -> str:
    """Roll a multi-choice decision using cryptographically secure randomness."""
    if not choices:
        raise ValueError("Must have at least one choice")

    total_weight = sum(choice.weight for choice in choices)
    if total_weight != 100:
        raise ValueError("Total weight must equal 100")

    random_value = secrets.randbelow(100) + 1

    cumulative_weight = 0
    for choice in choices:
        cumulative_weight += choice.weight
        if random_value <= cumulative_weight:
            return choice.name

    # Fallback (should never reach here if weights sum to 100)
    return choices[-1].name


async def roll_decision(decision: Decision, session: AsyncSession) -> Roll:
    """Roll a decision and create a roll record."""
    if decision.type == DecisionType.BINARY:
        # Get binary decision data
        binary_statement = select(BinaryDecision).where(BinaryDecision.decision_id == decision.id)
        binary_result = await session.exec(binary_statement)
        binary_decision = binary_result.first()

        if not binary_decision:
            raise ValueError("Binary decision data not found")

        result = roll_binary_decision(binary_decision.probability)

    elif decision.type == DecisionType.MULTI_CHOICE:
        # Get choices
        choices_statement = select(Choice).where(Choice.decision_id == decision.id)
        choices_result = await session.exec(choices_statement)
        choices = list(choices_result.all())

        if not choices:
            raise ValueError("No choices found for multi-choice decision")

        result = roll_multi_choice_decision(choices)

    else:
        raise ValueError(f"Unknown decision type: {decision.type}")

    # Create roll record
    roll = Roll(decision_id=decision.id, result=result)
    session.add(roll)
    await session.commit()
    await session.refresh(roll)

    return roll


async def confirm_roll(roll: Roll, followed: bool, session: AsyncSession) -> Roll:
    """Confirm whether the user followed through on a roll."""
    roll.followed = followed
    await session.commit()
    await session.refresh(roll)
    return roll


async def get_pending_roll(decision_id: int, user: User, session: AsyncSession) -> Optional[Roll]:
    """Get the most recent pending roll for a decision, if any exists."""
    statement = (
        select(Roll)
        .join(Decision)
        .where(Roll.decision_id == decision_id, Decision.user_id == user.id, col(Roll.followed).is_(None))
        .order_by(col(Roll.created_at).desc())
    )
    result = await session.exec(statement)
    return result.first()


async def get_last_confirmed_roll(decision_id: int, user: User, session: AsyncSession) -> Optional[Roll]:
    """Get the most recent confirmed roll for a decision."""
    statement = (
        select(Roll)
        .join(Decision)
        .where(Roll.decision_id == decision_id, Decision.user_id == user.id, col(Roll.followed).is_not(None))
        .order_by(col(Roll.created_at).desc())
    )
    result = await session.exec(statement)
    return result.first()


async def check_cooldown(decision: Decision, user: User, session: AsyncSession) -> tuple[bool, Optional[datetime]]:
    """Check if a decision is on cooldown. Returns (is_on_cooldown, cooldown_ends_at)."""
    if decision.cooldown_hours == 0:
        return False, None

    # Get the last confirmed roll
    if decision.id is None:
        return False, None
    last_roll = await get_last_confirmed_roll(decision.id, user, session)
    if not last_roll:
        # No previous rolls, not on cooldown
        return False, None

    # Calculate when cooldown ends
    cooldown_ends_at = last_roll.created_at + timedelta(hours=decision.cooldown_hours)

    # Check if we're still in cooldown
    now = datetime.now(timezone.utc)
    if now < cooldown_ends_at:
        return True, cooldown_ends_at

    return False, None
