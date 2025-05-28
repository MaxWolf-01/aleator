from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import User, Roll
from app.schemas import (
    DecisionCreate, DecisionUpdate, DecisionResponse, 
    RollResult, RollConfirmation
)
from app.auth import get_current_active_user
from app.db import get_db_session
from app.services import (
    create_decision, get_user_decisions, get_decision_by_id,
    update_decision, roll_decision, confirm_roll
)

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post("/", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED)
async def create_new_decision(
    decision_data: DecisionCreate,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Create a new decision."""
    try:
        decision = await create_decision(current_user, decision_data, session)
        return decision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[DecisionResponse])
async def get_decisions(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Get all decisions for the current user."""
    decisions = await get_user_decisions(current_user, session)
    return decisions


@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session)
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
    session: AsyncSession = Depends(get_db_session)
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


@router.post("/{decision_id}/roll", response_model=RollResult)
async def roll_decision_endpoint(
    decision_id: int,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Roll a decision to get a result."""
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    try:
        roll = await roll_decision(decision, session)
        return roll
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{decision_id}/confirm")
async def confirm_decision_roll(
    decision_id: int,
    roll_id: int,
    confirmation: RollConfirmation,
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session)
):
    """Confirm whether the user followed through on a roll."""
    # Verify the decision belongs to the user
    decision = await get_decision_by_id(decision_id, current_user, session)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    
    # Get the specific roll
    from sqlmodel import select
    roll_statement = select(Roll).where(
        Roll.id == roll_id, 
        Roll.decision_id == decision_id
    )
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