import secrets

import pytest

from app.models import DecisionType


def roll_binary_decision(probability: int) -> str:
    """Core logic for rolling a binary decision.
    Returns "yes" or "no" based on probability.
    Uses cryptographically secure randomness.
    """
    if not (1 <= probability <= 99):
        raise ValueError("Probability must be between 1 and 99")

    # Generate secure random number between 1-100
    random_value = secrets.randbelow(100) + 1
    return "yes" if random_value <= probability else "no"


def roll_multi_choice_decision(choices: list[dict]) -> str:
    """Core logic for rolling a multi-choice decision.
    choices: list of {"name": str, "weight": int} dicts
    Returns the name of the selected choice.
    """
    if not choices:
        raise ValueError("Must have at least one choice")

    total_weight = sum(choice["weight"] for choice in choices)
    if total_weight != 100:
        raise ValueError("Total weight must equal 100")

    # Generate secure random number between 1-100
    random_value = secrets.randbelow(100) + 1

    # Find which choice this maps to
    cumulative_weight = 0
    for choice in choices:
        cumulative_weight += choice["weight"]
        if random_value <= cumulative_weight:
            return choice["name"]

    # Fallback (should never reach here if weights sum to 100)
    return choices[-1]["name"]


class TestBinaryDecisionLogic:
    def test_binary_decision_valid_probabilities(self):
        # Test edge cases
        result = roll_binary_decision(1)
        assert result in ["yes", "no"]

        result = roll_binary_decision(99)
        assert result in ["yes", "no"]

        result = roll_binary_decision(50)
        assert result in ["yes", "no"]

    def test_binary_decision_invalid_probabilities(self):
        with pytest.raises(ValueError, match="Probability must be between 1 and 99"):
            roll_binary_decision(0)

        with pytest.raises(ValueError, match="Probability must be between 1 and 99"):
            roll_binary_decision(100)

        with pytest.raises(ValueError, match="Probability must be between 1 and 99"):
            roll_binary_decision(-1)

        with pytest.raises(ValueError, match="Probability must be between 1 and 99"):
            roll_binary_decision(101)

    def test_binary_decision_distribution(self):
        """Test that the distribution is roughly correct over many rolls."""
        probability = 30
        yes_count = 0
        total_rolls = 1000

        for _ in range(total_rolls):
            result = roll_binary_decision(probability)
            if result == "yes":
                yes_count += 1

        actual_percentage = (yes_count / total_rolls) * 100

        # Allow for reasonable variance (±10%)
        assert 20 <= actual_percentage <= 40


class TestMultiChoiceDecisionLogic:
    def test_multi_choice_valid_choices(self):
        choices = [
            {"name": "Pizza", "weight": 40},
            {"name": "Salad", "weight": 30},
            {"name": "Sandwich", "weight": 30},
        ]

        result = roll_multi_choice_decision(choices)
        assert result in ["Pizza", "Salad", "Sandwich"]

    def test_multi_choice_single_choice(self):
        choices = [{"name": "Only Option", "weight": 100}]

        # Should always return the only option
        for _ in range(10):
            result = roll_multi_choice_decision(choices)
            assert result == "Only Option"

    def test_multi_choice_invalid_weights(self):
        # Weights don't sum to 100
        choices = [
            {"name": "Pizza", "weight": 40},
            {"name": "Salad", "weight": 30},
        ]

        with pytest.raises(ValueError, match="Total weight must equal 100"):
            roll_multi_choice_decision(choices)

    def test_multi_choice_empty_choices(self):
        with pytest.raises(ValueError, match="Must have at least one choice"):
            roll_multi_choice_decision([])

    def test_multi_choice_distribution(self):
        """Test that the distribution is roughly correct over many rolls."""
        choices = [
            {"name": "High", "weight": 60},
            {"name": "Low", "weight": 40},
        ]

        high_count = 0
        total_rolls = 1000

        for _ in range(total_rolls):
            result = roll_multi_choice_decision(choices)
            if result == "High":
                high_count += 1

        actual_percentage = (high_count / total_rolls) * 100

        # Allow for reasonable variance (±10%)
        assert 50 <= actual_percentage <= 70
