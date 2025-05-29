from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import DecisionType


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
    probability: int = Field(ge=1, le=99)
    yes_text: str = Field(max_length=100, default="Yes")
    no_text: str = Field(max_length=100, default="No")


class ChoiceCreate(BaseModel):
    name: str = Field(max_length=100)
    weight: int = Field(ge=1, le=99)


class MultiChoiceDecisionCreate(BaseModel):
    choices: list[ChoiceCreate] = Field(min_length=2)


class DecisionCreate(BaseModel):
    title: str = Field(max_length=200)
    type: DecisionType
    binary_data: BinaryDecisionCreate | None = None
    multi_choice_data: MultiChoiceDecisionCreate | None = None


class DecisionUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    probability: int | None = Field(None, ge=1, le=99)  # For binary decisions


class BinaryDecisionResponse(BaseModel):
    probability: int
    yes_text: str
    no_text: str


class ChoiceResponse(BaseModel):
    id: int
    name: str
    weight: int


class MultiChoiceDecisionResponse(BaseModel):
    choices: list[ChoiceResponse]


class DecisionResponse(BaseModel):
    id: int
    title: str
    type: DecisionType
    created_at: datetime
    updated_at: datetime
    binary_decision: BinaryDecisionResponse | None = None
    multi_choice_decision: MultiChoiceDecisionResponse | None = None


class RollResponse(BaseModel):
    id: int
    decision_id: int
    result: str
    followed: bool | None
    created_at: datetime


class RollResult(BaseModel):
    id: int
    result: str
    created_at: datetime


class RollConfirmation(BaseModel):
    followed: bool


class DecisionWithRollsResponse(BaseModel):
    id: int
    title: str
    type: DecisionType
    created_at: datetime
    updated_at: datetime
    binary_decision: BinaryDecisionResponse | None = None
    multi_choice_decision: MultiChoiceDecisionResponse | None = None
    rolls: list[RollResponse] = []
