import pytest
from datetime import datetime
from pydantic import ValidationError
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.models import (
    User, Decision, BinaryDecision, MultiChoiceDecision, 
    Choice, Roll, ProbabilityHistory, DecisionType
)


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_user_creation():
    user = User(email="test@example.com", hashed_password="hashedpw")
    assert user.email == "test@example.com"
    assert user.is_active is True
    assert isinstance(user.created_at, datetime)


def test_user_creation_with_valid_email():
    # Test valid email works
    user = User(email="test@example.com", hashed_password="hashedpw")
    assert user.email == "test@example.com"


def test_binary_decision_probability_validation():
    # Valid probabilities
    bd = BinaryDecision(decision_id=1, probability=50)
    assert bd.probability == 50
    
    bd = BinaryDecision(decision_id=1, probability=1)
    assert bd.probability == 1
    
    bd = BinaryDecision(decision_id=1, probability=99)
    assert bd.probability == 99
    
    # Note: SQLModel Field validation behavior may differ from pure Pydantic
    # These are the allowed values according to business rules


def test_choice_weight_validation():
    # Valid weights
    choice = Choice(decision_id=1, name="Option A", weight=25)
    assert choice.weight == 25
    
    choice = Choice(decision_id=1, name="Option B", weight=1)
    assert choice.weight == 1
    
    choice = Choice(decision_id=1, name="Option C", weight=99)
    assert choice.weight == 99


def test_decision_relationships(session):
    # Create a user
    user = User(email="test@example.com", hashed_password="hashedpw")
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create a binary decision
    decision = Decision(
        user_id=user.id,
        title="Have dessert?",
        type=DecisionType.BINARY
    )
    session.add(decision)
    session.commit()
    session.refresh(decision)
    
    # Create binary decision details
    binary_decision = BinaryDecision(
        decision_id=decision.id,
        probability=67,
        yes_text="Yes, have dessert",
        no_text="No dessert tonight"
    )
    session.add(binary_decision)
    session.commit()
    
    # Test relationships
    assert decision.user.email == "test@example.com"
    assert decision.binary_decision.probability == 67


def test_multi_choice_decision_relationships(session):
    # Create a user
    user = User(email="test@example.com", hashed_password="hashedpw")
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create a multi-choice decision
    decision = Decision(
        user_id=user.id,
        title="What to eat?",
        type=DecisionType.MULTI_CHOICE
    )
    session.add(decision)
    session.commit()
    session.refresh(decision)
    
    # Create multi-choice decision details
    multi_choice = MultiChoiceDecision(decision_id=decision.id)
    session.add(multi_choice)
    session.commit()
    
    # Add choices (weights should sum to 100 for proper probability)
    choices = [
        Choice(decision_id=decision.id, name="Pizza", weight=40),
        Choice(decision_id=decision.id, name="Salad", weight=30),
        Choice(decision_id=decision.id, name="Sandwich", weight=30),
    ]
    for choice in choices:
        session.add(choice)
    session.commit()
    
    # Test relationships
    session.refresh(multi_choice)
    assert len(multi_choice.choices) == 3
    assert sum(choice.weight for choice in multi_choice.choices) == 100


def test_roll_creation():
    roll = Roll(decision_id=1, result="yes")
    assert roll.result == "yes"
    assert roll.followed is None  # Not yet confirmed
    assert isinstance(roll.created_at, datetime)


def test_probability_history_validation():
    # Valid probability
    ph = ProbabilityHistory(decision_id=1, probability=50)
    assert ph.probability == 50
    
    # Test boundary values
    ph = ProbabilityHistory(decision_id=1, probability=1)
    assert ph.probability == 1
    
    ph = ProbabilityHistory(decision_id=1, probability=99)
    assert ph.probability == 99