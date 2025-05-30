from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_active_user
from app.db import get_db_session
from app.models import Roll, User
from app.schemas import (
    DecisionCreate,
    DecisionResponse,
    DecisionUpdate,
    DecisionWithRollsResponse,
    RollConfirmation,
    RollResult,
)
from app.services import (
    check_cooldown,
    confirm_roll,
    create_decision,
    get_decision_by_id,
    get_pending_roll,
    get_user_decisions,
    roll_decision,
    update_decision,
)

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post("/", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_decision(
    decision_data: DecisionCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Create a new decision."""
    try:
        decision = await create_decision(current_user, decision_data, session)
        return decision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[DecisionWithRollsResponse])
async def get_decisions(
    current_user: User = Depends(get_current_active_user), session: AsyncSession = Depends(get_db_session)
):
    """Get all decisions for the current user."""
    decisions = await get_user_decisions(current_user, session)
    return decisions


@router.get("/{decision_id}", response_model=DecisionWithRollsResponse)
async def get_decision(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Get a specific decision."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.put("/{decision_id}", response_model=DecisionResponse)
async def update_decision_endpoint(
    decision_id: int,
    update_data: DecisionUpdate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Update a decision."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    try:
        updated_decision = await update_decision(decision, update_data, session)
        return updated_decision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{decision_id}/pending-roll", response_model=RollResult)
async def get_decision_pending_roll(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Get the pending roll for a decision, if any."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    pending_roll = await get_pending_roll(decision_id, current_user, session)
    if not pending_roll:
        raise HTTPException(status_code=404, detail="No pending roll found")

    return pending_roll


@router.post("/{decision_id}/roll", response_model=RollResult)
async def roll_decision_endpoint(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Roll a decision to get a result."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Check if there's already a pending roll
    pending_roll = await get_pending_roll(decision_id, current_user, session)
    if pending_roll:
        raise HTTPException(status_code=400, detail="You have a pending roll that must be confirmed first")

    # Check if decision is on cooldown
    is_on_cooldown, cooldown_ends_at = await check_cooldown(decision, current_user, session)
    if is_on_cooldown:
        raise HTTPException(
            status_code=400, detail=f"Decision is on cooldown. You can roll again at {cooldown_ends_at.isoformat()}"
        )

    try:
        roll = await roll_decision(decision, session)
        return roll
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{decision_id}/rolls/{roll_id}/confirm")
async def confirm_decision_roll(
    decision_id: int,
    roll_id: int,
    confirmation: RollConfirmation,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Confirm whether the user followed through on a roll."""
    # Verify the decision belongs to the user
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Get the specific roll
    from sqlmodel import select

    roll_statement = select(Roll).where(Roll.id == roll_id, Roll.decision_id == decision_id)
    roll_result = await session.exec(roll_statement)
    roll = roll_result.first()

    if not roll:
        raise HTTPException(status_code=404, detail="Roll not found")

    if roll.followed is not None:
        raise HTTPException(status_code=400, detail="Roll already confirmed")

    try:
        updated_roll = await confirm_roll(roll, confirmation.followed, session)
        return {"message": "Roll confirmed", "followed": updated_roll.followed}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{decision_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_decision(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Delete a decision."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    await session.delete(decision)
    await session.commit()
    return None


class ReorderRequest(BaseModel):
    decision_orders: list[dict[str, int]]  # [{"id": 1, "order": 0}, {"id": 2, "order": 1}]


@router.post("/reorder", response_model=List[DecisionWithRollsResponse])
async def reorder_decisions(
    reorder_data: ReorderRequest,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
):
    """Reorder decisions by updating display_order."""
    # Verify all decisions belong to the user and update their order
    for item in reorder_data.decision_orders:
        decision = await get_decision_by_id(item["id"], current_user, session)
        if not decision:
            raise HTTPException(status_code=404, detail=f"Decision {item['id']} not found")

        decision.display_order = item["order"]

    await session.commit()

    # Return updated decisions list
    decisions = await get_user_decisions(current_user, session)
    return decisions
