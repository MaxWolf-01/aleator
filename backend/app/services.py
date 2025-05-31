import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    BinaryDecision,
    Choice,
    Decision,
    DecisionType,
    MultiChoiceDecision,
    ProbabilityHistory,
    Roll,
    RollChoiceWeight,
    User,
    WeightHistory,
)
from app.schemas import DecisionCreate, DecisionUpdate


async def create_decision(user: User, decision_data: DecisionCreate, session: AsyncSession) -> Decision:
    """Create a new decision for a user."""
    # Get max display_order for user's decisions
    from sqlmodel import func

    # Check user's decision count limit
    count_statement = select(func.count(Decision.id)).where(Decision.user_id == user.id)
    count_result = await session.exec(count_statement)
    decision_count = count_result.first() or 0

    if decision_count >= 100:
        raise ValueError("Maximum of 100 decisions allowed per user")

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

        multi_choice = MultiChoiceDecision(
            decision_id=decision.id, weight_granularity=decision_data.multi_choice_data.weight_granularity
        )
        session.add(multi_choice)

        for idx, choice_data in enumerate(decision_data.multi_choice_data.choices):
            choice = Choice(
                decision_id=decision.id,
                name=choice_data.name,
                weight=choice_data.weight,
                display_order=idx,  # Maintain creation order
            )
            session.add(choice)
            await session.flush()  # Ensure choice.id is available

            # Add initial weight history entry
            weight_history = WeightHistory(choice_id=choice.id, weight=choice_data.weight)
            session.add(weight_history)

    await session.commit()

    # Reload with relationships
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.id == decision.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision)
            .selectinload(MultiChoiceDecision.choices)
            .selectinload(Choice.weight_history),
            selectinload(Decision.rolls).selectinload(Roll.choice_weights),
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
            selectinload(Decision.multi_choice_decision)
            .selectinload(MultiChoiceDecision.choices)
            .selectinload(Choice.weight_history),
            selectinload(Decision.rolls).selectinload(Roll.choice_weights),
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
            selectinload(Decision.multi_choice_decision)
            .selectinload(MultiChoiceDecision.choices)
            .selectinload(Choice.weight_history),
            selectinload(Decision.rolls).selectinload(Roll.choice_weights),
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

    # For multi-choice decisions, update choice weights and granularity
    elif decision.type == DecisionType.MULTI_CHOICE:
        # Get current multi-choice decision
        multi_statement = select(MultiChoiceDecision).where(MultiChoiceDecision.decision_id == decision.id)
        multi_result = await session.exec(multi_statement)
        multi_choice_decision = multi_result.first()

        if multi_choice_decision:
            # Update weight granularity if provided
            if update_data.weight_granularity is not None:
                multi_choice_decision.weight_granularity = update_data.weight_granularity

        # Update choice weights if provided
        if update_data.choices is not None:
            # Validate that all choices sum to 100
            total_weight = sum(choice.weight for choice in update_data.choices)
            if abs(total_weight - 100) > 0.01:  # Allow small floating point errors
                raise ValueError(f"Choice weights must sum to 100, got {total_weight}")

            # Get current choices
            choices_statement = select(Choice).where(Choice.decision_id == decision.id).order_by(Choice.display_order)
            choices_result = await session.exec(choices_statement)
            current_choices = {choice.id: choice for choice in choices_result.all()}

            # Update weights and track history
            for choice_update in update_data.choices:
                choice_id = choice_update.id
                new_weight = choice_update.weight

                if choice_id not in current_choices:
                    raise ValueError(f"Choice with id {choice_id} not found")

                choice = current_choices[choice_id]
                if abs(choice.weight - new_weight) > 0.001:  # Only update if changed
                    choice.weight = new_weight

                    # Record weight change in history
                    weight_history = WeightHistory(choice_id=choice.id, weight=new_weight)
                    session.add(weight_history)

        # Update choice names if provided
        if update_data.multi_choice_names is not None:
            # Get current choices if not already loaded
            if update_data.choices is None:
                choices_statement = (
                    select(Choice).where(Choice.decision_id == decision.id).order_by(Choice.display_order)
                )
                choices_result = await session.exec(choices_statement)
                current_choices = {choice.id: choice for choice in choices_result.all()}

            # Update names
            for name_update in update_data.multi_choice_names:
                choice_id = name_update.id
                new_name = name_update.name

                if choice_id not in current_choices:
                    raise ValueError(f"Choice with id {choice_id} not found")

                choice = current_choices[choice_id]
                choice.name = new_name

    await session.commit()

    # Reload with relationships
    from sqlalchemy.orm import selectinload

    statement = (
        select(Decision)
        .where(Decision.id == decision.id)
        .options(
            selectinload(Decision.binary_decision),
            selectinload(Decision.multi_choice_decision)
            .selectinload(MultiChoiceDecision.choices)
            .selectinload(Choice.weight_history),
            selectinload(Decision.rolls).selectinload(Roll.choice_weights),
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


async def roll_decision(decision: Decision, session: AsyncSession, roll_request=None) -> Roll:
    """Roll a decision and create a roll record."""
    from sqlmodel import func

    from app.schemas import RollRequest

    # Check user's total roll count limit
    roll_count_statement = select(func.count(Roll.id)).join(Decision).where(Decision.user_id == decision.user_id)
    roll_count_result = await session.exec(roll_count_statement)
    roll_count = roll_count_result.first() or 0

    if roll_count >= 1_000_000:
        raise ValueError("Maximum of 1 million rolls allowed per user")

    if decision.type == DecisionType.BINARY:
        # Get binary decision data
        binary_statement = select(BinaryDecision).where(BinaryDecision.decision_id == decision.id)
        binary_result = await session.exec(binary_statement)
        binary_decision = binary_result.first()

        if not binary_decision:
            raise ValueError("Binary decision data not found")

        # Use provided probability or default to current
        probability = (
            roll_request.probability
            if roll_request and roll_request.probability is not None
            else binary_decision.probability
        )
        result = roll_binary_decision(probability)

        # Create roll record with the probability used
        roll = Roll(decision_id=decision.id, result=result, probability=probability)

    elif decision.type == DecisionType.MULTI_CHOICE:
        # Get choices ordered by display_order
        choices_statement = select(Choice).where(Choice.decision_id == decision.id).order_by(Choice.display_order)
        choices_result = await session.exec(choices_statement)
        choices = list(choices_result.all())

        if not choices:
            raise ValueError("No choices found for multi-choice decision")

        # If weights are provided in request, create a temporary list with updated weights
        if roll_request and roll_request.choices:
            # Create a map of choice id to weight from request
            weight_updates = {update.id: update.weight for update in roll_request.choices}

            # Validate we have updates for all choices
            if set(weight_updates.keys()) != {choice.id for choice in choices}:
                raise ValueError("Must provide weights for all choices")

            # Get the weight granularity to determine acceptable precision
            mc_statement = select(MultiChoiceDecision).where(MultiChoiceDecision.decision_id == decision.id)
            mc_result = await session.exec(mc_statement)
            multi_choice = mc_result.first()

            # Determine acceptable tolerance based on granularity
            tolerance = 0.001  # Default tight tolerance
            if multi_choice:
                if multi_choice.weight_granularity == 0:  # Whole numbers
                    tolerance = 0.001
                elif multi_choice.weight_granularity == 1:  # 0.1 precision
                    tolerance = 0.01
                elif multi_choice.weight_granularity == 2:  # 0.01 precision
                    tolerance = 0.001

            # Validate weights sum to 100 within tolerance
            total_weight = sum(weight_updates.values())
            if abs(total_weight - 100) > tolerance:
                raise ValueError(f"Weights must sum to 100, got {total_weight}")

            # Create temporary choice objects with updated weights for rolling
            from copy import copy

            roll_choices = []
            for choice in choices:
                temp_choice = copy(choice)
                temp_choice.weight = weight_updates[choice.id]
                roll_choices.append(temp_choice)
        else:
            roll_choices = choices

        result = roll_multi_choice_decision(roll_choices)

        # Create roll record
        roll = Roll(decision_id=decision.id, result=result)
        session.add(roll)
        await session.flush()  # Get the roll ID before creating weight records

        # Create weight records for each choice with the weights used for rolling
        for choice in roll_choices:
            from app.models import RollChoiceWeight

            weight_record = RollChoiceWeight(
                roll_id=roll.id,
                choice_id=choice.id,
                choice_name=choice.name,  # Store name directly
                weight=choice.weight,
            )
            session.add(weight_record)

    else:
        raise ValueError(f"Unknown decision type: {decision.type}")

    if decision.type == DecisionType.BINARY:
        session.add(roll)

    await session.commit()

    # Reload roll with relationships
    from sqlalchemy.orm import selectinload

    statement = select(Roll).where(Roll.id == roll.id).options(selectinload(Roll.choice_weights))
    result = await session.exec(statement)
    roll = result.first()

    return roll


async def confirm_roll(
    roll: Roll,
    followed: bool,
    session: AsyncSession,
) -> Roll:
    """Confirm whether the user followed through on a roll."""
    if roll.followed is not None:
        raise ValueError("Roll already confirmed")

    roll.followed = followed

    # Get the decision to update the actual weights/probability if user followed through
    decision_statement = select(Decision).where(Decision.id == roll.decision_id)
    decision_result = await session.exec(decision_statement)
    decision = decision_result.first()

    if not decision:
        raise ValueError("Decision not found")

    # If user followed through, update the decision's weights to match what was used
    if followed:
        if decision.type == DecisionType.BINARY and roll.probability is not None:
            # Update the binary decision's probability to match what was rolled
            binary_statement = select(BinaryDecision).where(BinaryDecision.decision_id == decision.id)
            binary_result = await session.exec(binary_statement)
            binary_decision = binary_result.first()

            if binary_decision:
                binary_decision.probability = roll.probability

        elif decision.type == DecisionType.MULTI_CHOICE:
            # Update the choices' weights to match what was rolled
            # First, get the weights from RollChoiceWeight
            weight_statement = select(RollChoiceWeight).where(RollChoiceWeight.roll_id == roll.id)
            weight_result = await session.exec(weight_statement)
            roll_weights = {rw.choice_id: rw.weight for rw in weight_result.all()}

            if roll_weights:
                # Update each choice's weight
                choices_statement = (
                    select(Choice).where(Choice.decision_id == decision.id).order_by(Choice.display_order)
                )
                choices_result = await session.exec(choices_statement)
                for choice in choices_result.all():
                    if choice.id in roll_weights:
                        choice.weight = roll_weights[choice.id]

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
