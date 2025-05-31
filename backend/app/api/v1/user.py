from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth import get_current_active_user
from app.db import get_db_session
from app.models import BinaryDecision, Choice, Decision, MultiChoiceDecision, Roll, RollChoiceWeight, User

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/export")
async def export_user_data(
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Export all user data in JSON format."""
    # Get all decisions with their related data
    decisions_stmt = select(Decision).where(Decision.user_id == current_user.id).order_by(Decision.display_order)
    decisions_result = await session.exec(decisions_stmt)
    decisions = decisions_result.all()
    
    export_data = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "decisions": []
    }
    
    for decision in decisions:
        # Get rolls for this decision
        rolls_stmt = select(Roll).where(Roll.decision_id == decision.id).order_by(Roll.created_at.desc())
        rolls_result = await session.exec(rolls_stmt)
        rolls = rolls_result.all()
        
        decision_data = {
            "id": decision.id,
            "title": decision.title,
            "type": decision.type,
            "cooldown_hours": decision.cooldown_hours,
            "display_order": decision.display_order,
            "created_at": decision.created_at.isoformat() if decision.created_at else None,
            "updated_at": decision.updated_at.isoformat() if decision.updated_at else None,
        }
        
        # Add type-specific data
        if decision.type == "binary":
            # Get binary decision data
            binary_stmt = select(BinaryDecision).where(BinaryDecision.decision_id == decision.id)
            binary_result = await session.exec(binary_stmt)
            binary_data = binary_result.first()
            
            if binary_data:
                decision_data["binary_data"] = {
                    "probability": float(binary_data.probability),
                    "probability_granularity": binary_data.probability_granularity,
                    "yes_text": binary_data.yes_text,
                    "no_text": binary_data.no_text,
                }
        else:  # multi_choice
            # Get choices
            choices_stmt = select(Choice).where(
                Choice.decision_id == decision.id
            ).order_by(Choice.id)
            choices_result = await session.exec(choices_stmt)
            choices = choices_result.all()
            
            # Get multi-choice decision data
            multi_stmt = select(MultiChoiceDecision).where(MultiChoiceDecision.decision_id == decision.id)
            multi_result = await session.exec(multi_stmt)
            multi_data = multi_result.first()
            
            decision_data["multi_choice_data"] = {
                "weight_granularity": multi_data.weight_granularity if multi_data else 0,
                "choices": [
                    {
                        "id": choice.id,
                        "name": choice.name,
                        "weight": choice.weight,
                    }
                    for choice in choices
                ]
            }
        
        # Add rolls data
        rolls_data = []
        for roll in rolls:
            roll_data = {
                "id": roll.id,
                "rolled_at": roll.created_at.isoformat() if roll.created_at else None,
                "result": roll.result,
                "followed": roll.followed,
            }
            
            if decision.type == "binary":
                roll_data["probability_at_roll"] = float(roll.probability) if roll.probability else None
            else:
                # Get choice weights for this roll
                weights_stmt = select(RollChoiceWeight).where(RollChoiceWeight.roll_id == roll.id)
                weights_result = await session.exec(weights_stmt)
                weights = weights_result.all()
                
                roll_data["choice_weights_at_roll"] = [
                    {
                        "choice_name": w.choice_name,
                        "weight": float(w.weight)
                    }
                    for w in weights
                ]
            
            rolls_data.append(roll_data)
        
        decision_data["rolls"] = rolls_data
        
        # Calculate statistics
        total_rolls = len(rolls)
        confirmed_rolls = [r for r in rolls if r.followed is not None]
        followed_rolls = [r for r in confirmed_rolls if r.followed]
        
        decision_data["statistics"] = {
            "total_rolls": total_rolls,
            "confirmed_rolls": len(confirmed_rolls),
            "followed_rolls": len(followed_rolls),
            "follow_through_rate": len(followed_rolls) / len(confirmed_rolls) if confirmed_rolls else None,
        }
        
        export_data["decisions"].append(decision_data)
    
    return export_data