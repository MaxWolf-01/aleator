from datetime import datetime, timezone
from enum import StrEnum
from typing import Optional

from pydantic import EmailStr
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship, SQLModel


class DecisionType(StrEnum):
    BINARY = "binary"
    MULTI_CHOICE = "multi_choice"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: EmailStr = Field(unique=True, index=True)
    hashed_password: str
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    is_active: bool = Field(default=True)
    is_guest: bool = Field(default=False)
    guest_token: str | None = Field(default=None, unique=True, index=True)

    decisions: list["Decision"] = Relationship(back_populates="user", cascade_delete=True)


class Decision(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    type: DecisionType
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, onupdate=lambda: datetime.now(timezone.utc)),
    )

    user: User = Relationship(back_populates="decisions")
    binary_decision: Optional["BinaryDecision"] = Relationship(back_populates="decision", cascade_delete=True)
    multi_choice_decision: Optional["MultiChoiceDecision"] = Relationship(
        back_populates="decision", cascade_delete=True
    )
    rolls: list["Roll"] = Relationship(back_populates="decision", cascade_delete=True)
    probability_history: list["ProbabilityHistory"] = Relationship(back_populates="decision", cascade_delete=True)


class BinaryDecision(SQLModel, table=True):
    decision_id: int = Field(foreign_key="decision.id", primary_key=True)
    probability: int = Field(ge=1, le=99)
    yes_text: str = Field(max_length=100, default="Yes")
    no_text: str = Field(max_length=100, default="No")

    decision: Decision = Relationship(back_populates="binary_decision")


class MultiChoiceDecision(SQLModel, table=True):
    decision_id: int = Field(foreign_key="decision.id", primary_key=True)

    decision: Decision = Relationship(back_populates="multi_choice_decision")
    choices: list["Choice"] = Relationship(back_populates="multi_choice_decision", cascade_delete=True)


class Choice(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    decision_id: int = Field(foreign_key="multichoicedecision.decision_id")
    name: str = Field(max_length=100)
    weight: int = Field(ge=1, le=99)  # Weight as percentage, all weights for a decision should sum to 100

    multi_choice_decision: MultiChoiceDecision = Relationship(back_populates="choices")


class Roll(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    decision_id: int = Field(foreign_key="decision.id")
    result: str  # For binary: "yes"/"no", for multi: choice name
    followed: bool | None = Field(default=None)  # None means not yet confirmed
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    decision: Decision = Relationship(back_populates="rolls")


class ProbabilityHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    decision_id: int = Field(foreign_key="decision.id")
    probability: int = Field(ge=1, le=99)
    changed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    decision: Decision = Relationship(back_populates="probability_history")
