from datetime import datetime
from enum import IntEnum
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.models import DecisionType


# Enums
class GranularityLevel(IntEnum):
    WHOLE = 0  # 1%
    TENTH = 1  # 0.1%
    HUNDREDTH = 2  # 0.01%


# Auth schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)


class GuestUserConvert(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GuestTokenResponse(BaseModel):
    guest_token: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    is_active: bool
    is_guest: bool


# Decision schemas
class BinaryDecisionCreate(BaseModel):
    probability: float = Field(ge=0.01, le=99.99)
    probability_granularity: GranularityLevel = Field(default=GranularityLevel.WHOLE)
    yes_text: str = Field(max_length=100, default="Yes")
    no_text: str = Field(max_length=100, default="No")


class ChoiceCreate(BaseModel):
    name: str = Field(max_length=100)
    weight: float = Field(ge=0.01, le=99.99)


class MultiChoiceDecisionCreate(BaseModel):
    choices: list[ChoiceCreate] = Field(min_length=2)
    weight_granularity: GranularityLevel = Field(default=GranularityLevel.WHOLE)


class DecisionCreate(BaseModel):
    title: str = Field(max_length=200)
    type: DecisionType
    cooldown_hours: float = Field(default=0, ge=0)
    binary_data: BinaryDecisionCreate | None = None
    multi_choice_data: MultiChoiceDecisionCreate | None = None


class ChoiceUpdate(BaseModel):
    id: int
    weight: float = Field(ge=0.01, le=99.99)


class ChoiceNameUpdate(BaseModel):
    id: int
    name: str = Field(max_length=100)


class DecisionUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    cooldown_hours: float | None = Field(None, ge=0)
    probability: float | None = Field(None, ge=0.01, le=99.99)  # For binary decisions
    probability_granularity: GranularityLevel | None = None  # For binary decisions
    yes_text: str | None = Field(None, max_length=100)  # For binary decisions
    no_text: str | None = Field(None, max_length=100)  # For binary decisions
    display_order: int | None = None  # For reordering
    choices: list[ChoiceUpdate] | None = None  # For multi-choice decisions
    weight_granularity: GranularityLevel | None = None  # For multi-choice decisions
    multi_choice_names: list[ChoiceNameUpdate] | None = None  # For updating choice names


class BinaryDecisionResponse(BaseModel):
    probability: float
    probability_granularity: GranularityLevel
    yes_text: str
    no_text: str


class ProbabilityHistoryResponse(BaseModel):
    id: int
    decision_id: int
    probability: float
    changed_at: datetime


class WeightHistoryResponse(BaseModel):
    id: int
    choice_id: int
    weight: float
    changed_at: datetime


class ChoiceResponse(BaseModel):
    id: int
    name: str
    weight: float
    display_order: int = 0
    weight_history: list[WeightHistoryResponse] = []


class MultiChoiceDecisionResponse(BaseModel):
    choices: list[ChoiceResponse]
    weight_granularity: GranularityLevel


class DecisionResponse(BaseModel):
    id: int
    title: str
    type: DecisionType
    cooldown_hours: float
    display_order: int
    created_at: datetime
    updated_at: datetime
    binary_decision: BinaryDecisionResponse | None = None
    multi_choice_decision: MultiChoiceDecisionResponse | None = None


class RollChoiceWeightResponse(BaseModel):
    choice_id: int
    choice_name: str
    weight: float


class RollResponse(BaseModel):
    id: int
    decision_id: int
    result: str
    followed: bool | None
    probability: float | None  # For binary decisions
    choice_weights: list[RollChoiceWeightResponse] = []  # For multi-choice decisions
    created_at: datetime


class RollResult(BaseModel):
    id: int
    result: str
    created_at: datetime


class RollRequest(BaseModel):
    """Request body for rolling a decision with current weights/probability"""

    probability: float | None = Field(None, ge=0.01, le=99.99)  # For binary decisions
    choices: list[ChoiceUpdate] | None = None  # For multi-choice decisions


class RollConfirmation(BaseModel):
    followed: bool


class DecisionWithRollsResponse(BaseModel):
    id: int
    title: str
    type: DecisionType
    cooldown_hours: float
    display_order: int
    created_at: datetime
    updated_at: datetime
    binary_decision: BinaryDecisionResponse | None = None
    multi_choice_decision: MultiChoiceDecisionResponse | None = None
    rolls: list[RollResponse] = []
    probability_history: list[ProbabilityHistoryResponse] = []
