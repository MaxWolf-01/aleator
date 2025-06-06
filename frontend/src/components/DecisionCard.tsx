import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DecisionWithDetails, Roll } from "@/types";
import { apiClient } from "@/lib/api";
import { usePreferences } from "@/contexts/PreferencesContext";
import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  Dices,
  Plus,
  Minus,
  BarChart3,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  History,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  LineChart,
} from "recharts";
import { EditDecisionDialog } from "./EditDecisionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DecisionCardProps {
  decision: DecisionWithDetails;
  onUpdate: () => void;
  onReorder: (decisionId: number, direction: "up" | "down") => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function DecisionCard({
  decision,
  onUpdate,
  onReorder,
  canMoveUp,
  canMoveDown,
}: DecisionCardProps) {
  const { animationsEnabled } = usePreferences();
  const [pendingRoll, setPendingRoll] = useState<Roll | null>(null);
  const [localProbability, setLocalProbability] = useState(
    decision.binary_decision?.probability || 50,
  );
  const [localChoiceWeights, setLocalChoiceWeights] = useState<
    Record<number, number>
  >(() => {
    const weights: Record<number, number> = {};
    if (decision.multi_choice_decision) {
      decision.multi_choice_decision.choices.forEach((choice) => {
        weights[choice.id] = choice.weight;
      });
    }
    return weights;
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<Date | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [animatedDiceIndex, setAnimatedDiceIndex] = useState(0);
  const [currentAnimationDuration, setCurrentAnimationDuration] = useState(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update local weights only when decision ID changes or on mount
  useEffect(() => {
    if (decision.multi_choice_decision) {
      const weights: Record<number, number> = {};
      decision.multi_choice_decision.choices.forEach((choice) => {
        weights[choice.id] = choice.weight;
      });
      setLocalChoiceWeights(weights);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id]); // Only depend on decision ID, not the whole object

  // Check for pending roll in existing rolls data and calculate cooldown
  useEffect(() => {
    // Check if there's a pending roll in the existing rolls data
    // There should only ever be one pending roll per decision
    if (decision.rolls && decision.rolls.length > 0) {
      const pendingRollFromData = decision.rolls.find(
        (r) => r.followed === null,
      );
      if (pendingRollFromData) {
        setPendingRoll(pendingRollFromData);
        
        // Update local state to match the pending roll's captured values
        if (decision.type === "binary" && pendingRollFromData.probability !== undefined) {
          setLocalProbability(pendingRollFromData.probability);
        } else if (decision.type === "multi_choice" && pendingRollFromData.choice_weights) {
          const newWeights: Record<number, number> = {};
          pendingRollFromData.choice_weights.forEach((cw) => {
            newWeights[cw.choice_id] = cw.weight;
          });
          setLocalChoiceWeights(newWeights);
        }
      }
    }

    // Calculate cooldown from last confirmed roll
    if (
      decision.cooldown_hours > 0 &&
      decision.rolls &&
      decision.rolls.length > 0
    ) {
      // Find the most recent confirmed roll
      const confirmedRolls = decision.rolls.filter((r) => r.followed !== null);
      if (confirmedRolls.length > 0) {
        const lastRoll = confirmedRolls[confirmedRolls.length - 1];
        const lastRollTime = new Date(lastRoll.created_at);
        const cooldownEnd = new Date(
          lastRollTime.getTime() + decision.cooldown_hours * 60 * 60 * 1000,
        );

        if (cooldownEnd > new Date()) {
          setCooldownEndsAt(cooldownEnd);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id, decision.cooldown_hours, decision.rolls]);

  // Dice roll animation effect
  useEffect(() => {
    if (isRolling && animationsEnabled) {
      // Random duration between 800ms (snappy) and 1800ms (not too long)
      const animationDuration = 800 + Math.random() * 1000;
      setCurrentAnimationDuration(animationDuration);
      
      const interval = setInterval(() => {
        setAnimatedDiceIndex((prev) => (prev + 1) % 6);
      }, 80); // Change dice face every 80ms (faster for more visual effect)

      // Stop animation after random duration
      const timeout = setTimeout(() => {
        setIsRolling(false);
        clearInterval(interval);
      }, animationDuration);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else if (isRolling && !animationsEnabled) {
      // No animation - immediately stop rolling
      setIsRolling(false);
    }
  }, [isRolling, animationsEnabled]);

  const rollMutation = useMutation<Roll, Error, void>({
    mutationFn: () => {
      // Prepare roll data with current weights/probability
      const rollData: {
        probability?: number;
        choices?: Array<{ id: number; weight: number }>;
      } = {};

      if (decision.type === "binary") {
        const probabilityChanged =
          Math.abs(
            localProbability - (decision.binary_decision?.probability || 50),
          ) > 0.001;
        if (probabilityChanged) {
          rollData.probability = localProbability;
        }
      } else if (
        decision.type === "multi_choice" &&
        decision.multi_choice_decision
      ) {
        // Check if any weights were changed
        const weightsChanged = decision.multi_choice_decision.choices.some(
          (choice) => localChoiceWeights[choice.id] !== choice.weight,
        );
        if (weightsChanged) {
          // Ensure weights sum to exactly 100
          const choices = decision.multi_choice_decision.choices.map(
            (choice) => ({
              id: choice.id,
              weight: localChoiceWeights[choice.id] || choice.weight,
            }),
          );

          // Verify sum is 100
          const sum = choices.reduce((acc, c) => acc + c.weight, 0);
          if (Math.abs(sum - 100) > 0.001) {
            // Adjust the largest weight to make it exactly 100
            const sorted = [...choices].sort((a, b) => b.weight - a.weight);
            sorted[0].weight += 100 - sum;
          }

          rollData.choices = choices;
        }
      }

      return apiClient.rollDecision(
        decision.id,
        Object.keys(rollData).length > 0 ? rollData : undefined,
      ) as Promise<Roll>;
    },
    onSuccess: (roll: Roll) => {
      if (animationsEnabled) {
        // Don't show result immediately - wait for animation to finish
        // Show result about 200ms before animation ends for better feel
        setTimeout(() => {
          setPendingRoll(roll);
        }, Math.max(100, currentAnimationDuration - 200));
      } else {
        // No animation - show result immediately
        setPendingRoll(roll);
        setIsRolling(false);
      }
    },
    onError: (error) => {
      setIsRolling(false); // Stop animation on error
      // If there's a pending roll error, try to fetch it
      if (error.message.includes("pending roll")) {
        const fetchPending = async () => {
          try {
            const pending = (await apiClient.getPendingRoll(
              decision.id,
            )) as Roll;
            setPendingRoll(pending);
          } catch {
            // Ignore if we can't fetch it
          }
        };
        fetchPending();
      }
      // Check if error is about cooldown
      else if (error.message.includes("cooldown")) {
        // Extract the ISO date from the error message
        const match = error.message.match(
          /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/,
        );
        if (match) {
          setCooldownEndsAt(new Date(match[1]));
        }
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (followed: boolean) => {
      if (!pendingRoll) throw new Error("No pending roll");

      // Simply confirm the roll - weights were already captured at roll time
      return apiClient.confirmFollowThrough(
        decision.id,
        pendingRoll.id,
        followed,
      );
    },
    onSuccess: (_, followed) => {
      // If user followed through, update local state to match what was saved
      if (followed && pendingRoll) {
        if (
          decision.type === "binary" &&
          pendingRoll.probability !== undefined
        ) {
          setLocalProbability(pendingRoll.probability);
        } else if (
          decision.type === "multi_choice" &&
          pendingRoll.choice_weights
        ) {
          const newWeights: Record<number, number> = {};
          pendingRoll.choice_weights.forEach((cw) => {
            newWeights[cw.choice_id] = cw.weight;
          });
          setLocalChoiceWeights(newWeights);
        }
      }

      setPendingRoll(null);

      // Set cooldown immediately if decision has cooldown_hours configured
      if (decision.cooldown_hours > 0) {
        const cooldownEnd = new Date();
        cooldownEnd.setTime(
          cooldownEnd.getTime() + decision.cooldown_hours * 60 * 60 * 1000,
        );
        setCooldownEndsAt(cooldownEnd);
      }

      onUpdate();
    },
  });

  const handleRoll = () => {
    if (animationsEnabled) {
      setIsRolling(true);
    }
    rollMutation.mutate();
  };

  const handleConfirm = (followed: boolean) => {
    confirmMutation.mutate(followed);
  };

  const adjustProbability = (change: number) => {
    const granularity = decision.binary_decision?.probability_granularity || 0;
    const step = granularity === 0 ? 1 : granularity === 1 ? 0.1 : 0.01;
    const min = granularity === 0 ? 1 : 0.01;
    const max = granularity === 0 ? 99 : 99.99;

    setLocalProbability((prev) => {
      const newProb = Math.max(min, Math.min(max, prev + change * step));
      // Round to appropriate decimal places
      return Math.round(newProb / step) * step;
    });
    // DON'T save immediately - wait for confirmation
  };

  const adjustChoiceWeight = (choiceId: number, change: number) => {
    if (!decision.multi_choice_decision) return;

    setLocalChoiceWeights((prevWeights) => {
      const granularity =
        decision.multi_choice_decision!.weight_granularity || 0;
      const step = granularity === 0 ? 1 : granularity === 1 ? 0.1 : 0.01;
      const minWeight = granularity === 0 ? 1 : granularity === 1 ? 0.1 : 0.01;
      const maxWeight =
        granularity === 0 ? 99 : granularity === 1 ? 99.9 : 99.99;

      const newWeights = { ...prevWeights };
      const currentWeight =
        newWeights[choiceId] ||
        decision.multi_choice_decision!.choices.find((c) => c.id === choiceId)
          ?.weight ||
        0;

      // Simply adjust the weight within bounds
      const newWeight = Math.max(
        minWeight,
        Math.min(maxWeight, currentWeight + change * step),
      );

      // Round to appropriate precision
      newWeights[choiceId] = Math.round(newWeight / step) * step;

      return newWeights;
    });
  };

  const handleProbabilityMouseDown = (change: number, event?: React.PointerEvent) => {
    // Prevent default to avoid any double-triggering
    if (event) {
      event.preventDefault();
    }

    // Clear any existing timers first
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
    }

    // Initial adjustment
    adjustProbability(change);

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      // After 700ms, start rapid adjustments
      longPressIntervalRef.current = setInterval(() => {
        adjustProbability(change);
      }, 125); // Adjust every 125ms for smooth rapid change
    }, 700);
  };

  const handleProbabilityMouseUp = () => {
    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
  };

  const handleChoiceWeightMouseDown = (choiceId: number, change: number, event?: React.PointerEvent) => {
    // Prevent default to avoid any double-triggering
    if (event) {
      event.preventDefault();
    }

    // Clear any existing timers first
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
    }

    // Initial adjustment
    adjustChoiceWeight(choiceId, change);

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      // After 700ms, start rapid adjustments
      longPressIntervalRef.current = setInterval(() => {
        adjustChoiceWeight(choiceId, change);
      }, 125); // Adjust every 125ms for smooth rapid change
    }, 700);
  };

  const handleChoiceWeightMouseUp = () => {
    // Clear timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressIntervalRef.current) {
      clearInterval(longPressIntervalRef.current);
      longPressIntervalRef.current = null;
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (longPressIntervalRef.current)
        clearInterval(longPressIntervalRef.current);
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.deleteDecision(decision.id);
    },
    onSuccess: () => {
      onUpdate();
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const getDiceIcon = (probability: number) => {
    const iconClass = "w-8 h-8";
    if (probability <= 16) return <Dice1 className={iconClass} />;
    if (probability <= 33) return <Dice2 className={iconClass} />;
    if (probability <= 50) return <Dice3 className={iconClass} />;
    if (probability <= 66) return <Dice4 className={iconClass} />;
    if (probability <= 83) return <Dice5 className={iconClass} />;
    return <Dice6 className={iconClass} />;
  };

  const getAnimatedDiceIcon = () => {
    const iconClass = "w-8 h-8";
    const diceIcons = [
      <Dice1 className={iconClass} />,
      <Dice2 className={iconClass} />,
      <Dice3 className={iconClass} />,
      <Dice4 className={iconClass} />,
      <Dice5 className={iconClass} />,
      <Dice6 className={iconClass} />,
    ];
    return diceIcons[animatedDiceIndex];
  };

  // Calculate stats - only count confirmed rolls (where followed is not null)
  const confirmedRolls =
    decision.rolls?.filter((r) => r.followed !== null) || [];
  const totalRolls = confirmedRolls.length;
  const followedCount = confirmedRolls.filter(
    (r) => r.followed === true,
  ).length;
  const followThroughRate =
    totalRolls > 0 ? Math.round((followedCount / totalRolls) * 100) : 0;

  // Calculate if multi-choice weights are valid
  const multiChoiceWeightTotal =
    decision.type === "multi_choice" && decision.multi_choice_decision
      ? decision.multi_choice_decision.choices.reduce((sum, choice) => {
          const weight =
            localChoiceWeights[choice.id] !== undefined
              ? localChoiceWeights[choice.id]
              : choice.weight;
          return sum + weight;
        }, 0)
      : 100;
  const multiChoiceWeightsValid = Math.abs(multiChoiceWeightTotal - 100) < 0.01;

  // Generate chart data from confirmed rolls only
  const rollsToShow = showFullHistory
    ? confirmedRolls
    : confirmedRolls.slice(-10);
  const startIndex = showFullHistory
    ? 0
    : Math.max(0, confirmedRolls.length - 10);

  const chartData = rollsToShow.map((roll, index) => {
    const actualIndex = startIndex + index;
    const allRollsUpToThis = decision.rolls!.slice(
      0,
      decision.rolls!.indexOf(roll) + 1,
    );
    const confirmedUpToThis = allRollsUpToThis.filter(
      (r) => r.followed !== null,
    );
    const followedUpToThis = confirmedUpToThis.filter(
      (r) => r.followed === true,
    ).length;
    const followThroughRateAtPoint =
      confirmedUpToThis.length > 0
        ? Math.round((followedUpToThis / confirmedUpToThis.length) * 100)
        : 0;

    // Use the probability from the roll itself (new model)
    const probabilityAtRoll =
      roll.probability || decision.binary_decision?.probability || 50;

    const rollDate = new Date(roll.created_at);

    // Format date intelligently
    const formatDate = () => {
      const today = new Date();
      const diff = today.getTime() - rollDate.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      if (days < 30) return `${Math.floor(days / 7)}w ago`;
      if (days < 365)
        return rollDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      return rollDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    };

    // For multi-choice decisions, we need to track weight history
    if (decision.type === "multi_choice") {
      const choiceData: Record<string, number | string> = {
        decision:
          showFullHistory && rollsToShow.length > 10
            ? formatDate()
            : `#${actualIndex + 1}`,
        followThrough: followThroughRateAtPoint,
      };

      // Add weight data for each choice from the roll's captured weights
      if (roll.choice_weights && roll.choice_weights.length > 0) {
        // Use weights from the roll itself
        roll.choice_weights.forEach((cw) => {
          choiceData[`weight_${cw.choice_name}`] = cw.weight;
        });
      } else {
        // Fallback for old data without captured weights
        decision.multi_choice_decision?.choices.forEach((choice) => {
          choiceData[`weight_${choice.name}`] = choice.weight;
        });
      }

      return choiceData;
    }

    return {
      decision:
        showFullHistory && rollsToShow.length > 10
          ? formatDate()
          : `#${actualIndex + 1}`,
      probability: probabilityAtRoll,
      followThrough: followThroughRateAtPoint,
    };
  });

  // Helper function to format cooldown time
  const formatCooldownTime = (endsAt: Date) => {
    const now = new Date();
    const diff = endsAt.getTime() - now.getTime();

    if (diff <= 0) return "now";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  // Format cooldown hours for display
  const formatCooldownHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    } else if (hours === 24) {
      return "Daily";
    } else if (hours === 168) {
      return "Weekly";
    } else if (hours % 24 === 0) {
      const days = hours / 24;
      return `${days} day${days > 1 ? "s" : ""}`;
    } else {
      return `${hours}h`;
    }
  };

  // Check for cooldown on mount
  useEffect(() => {
    if (cooldownEndsAt && new Date() > cooldownEndsAt) {
      setCooldownEndsAt(null);
    }
  }, [cooldownEndsAt]);

  // Get the result display for multi-choice
  const getMultiChoiceResultDisplay = () => {
    if (!pendingRoll || decision.type !== "multi_choice") return null;

    // Find the choice that was selected (not used currently but might be useful later)
    // const selectedChoice = decision.multi_choice_decision?.choices.find(
    //   c => c.name === pendingRoll.result
    // );

    return (
      <div className="p-4 rounded-xl text-center result-choice">
        <div className="flex items-center justify-center gap-3 mb-1">
          <span className="text-2xl font-bold">{pendingRoll.result}</span>
        </div>
        <p className="text-sm opacity-90">Alea iacta est 🎲</p>

        {/* Follow-through Tracking */}
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium">Did you follow this decision?</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => handleConfirm(true)}
              className="flex-1 md:flex-none min-h-[44px] font-medium border-2 bg-[oklch(0.95_0.02_220)] hover:bg-[oklch(0.98_0.01_220)] border-[oklch(0.67_0.08_220)] text-[oklch(0.25_0.05_220)]"
              disabled={confirmMutation.isPending}
            >
              ✓ Yes, I did
            </Button>
            <Button
              onClick={() => handleConfirm(false)}
              className="flex-1 md:flex-none min-h-[44px] font-medium border-2 bg-[oklch(0.25_0.05_220)]/8 hover:bg-[oklch(0.25_0.05_220)]/15 border-[oklch(0.67_0.08_220)] text-[oklch(0.25_0.05_220)]"
              disabled={confirmMutation.isPending}
            >
              ✗ No, I didn't
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="matsu-card relative overflow-hidden py-0">
      {/* Edit/Delete/Reorder buttons - absolute positioned */}
      <div className="absolute bottom-3 right-3 lg:bottom-4 lg:right-4 z-20 flex items-center gap-1">
        {/* Reorder buttons */}
        <button
          onClick={() => onReorder(decision.id, "up")}
          disabled={!canMoveUp}
          className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onReorder(decision.id, "down")}
          disabled={!canMoveDown}
          className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-5 bg-[oklch(0.78_0.063_80.8)] mx-0.5" />
        <button
          onClick={() => setEditDialogOpen(true)}
          className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all"
          title="Edit decision"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleteMutation.isPending}
          className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.94_0.08_20)] border border-[oklch(0.78_0.063_80.8)] hover:border-[oklch(0.75_0.12_20)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.75_0.12_20)] transition-all disabled:opacity-50"
          title="Delete decision"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative z-10 p-6 pb-16">
        <CardHeader className="p-0 pb-3">
          <div>
            <CardTitle
              className={`font-semibold break-words leading-tight ${
                decision.title.length > 50
                  ? "text-base md:text-lg"
                  : decision.title.length > 35
                    ? "text-lg md:text-xl"
                    : "text-xl md:text-2xl"
              }`}
            >
              {decision.title}
            </CardTitle>
            {/* Show cooldown setting if enabled */}
            {decision.cooldown_hours > 0 && (
              <div className="flex items-center gap-1 text-xs text-[oklch(0.51_0.077_74.3)] mt-1">
                <Clock className="w-3 h-3" />
                <span>
                  {formatCooldownHours(decision.cooldown_hours)} cooldown
                </span>
              </div>
            )}
          </div>

          {/* Prominent Outcome Display */}
          {pendingRoll &&
            (decision.type === "binary" ? (
              <div
                className={`p-4 rounded-xl text-center ${
                  pendingRoll.result === "yes" ? "result-yes" : "result-no"
                }`}
              >
                <div className="flex items-center justify-center gap-3 mb-1">
                  {pendingRoll.result === "yes" ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                  <span className="text-2xl font-bold">
                    {pendingRoll.result === "yes"
                      ? decision.binary_decision?.yes_text || "Yes"
                      : decision.binary_decision?.no_text || "No"}
                  </span>
                </div>
                <p className="text-sm opacity-90">Alea iacta est 🎲</p>

                {/* Follow-through Tracking */}
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium">
                    Did you follow this decision?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={() => handleConfirm(true)}
                      className={`flex-1 md:flex-none min-h-[44px] font-medium border-2 ${
                        pendingRoll.result === "yes"
                          ? "bg-[oklch(0.95_0.02_140)] hover:bg-[oklch(0.98_0.01_140)] border-[oklch(0.65_0.08_140)] text-[oklch(0.35_0.05_140)]"
                          : "bg-[oklch(0.96_0.02_25)] hover:bg-[oklch(0.98_0.01_25)] border-[oklch(0.70_0.06_25)] text-[oklch(0.40_0.05_25)]"
                      }`}
                      disabled={confirmMutation.isPending}
                    >
                      ✓ Yes, I did
                    </Button>
                    <Button
                      onClick={() => handleConfirm(false)}
                      className={`flex-1 md:flex-none min-h-[44px] font-medium border-2 ${
                        pendingRoll.result === "yes"
                          ? "bg-[oklch(0.35_0.05_140)]/8 hover:bg-[oklch(0.35_0.05_140)]/15 border-[oklch(0.65_0.06_140)] text-[oklch(0.35_0.05_140)]"
                          : "bg-[oklch(0.35_0.05_25)]/8 hover:bg-[oklch(0.35_0.05_25)]/15 border-[oklch(0.70_0.06_25)] text-[oklch(0.45_0.05_25)]"
                      }`}
                      disabled={confirmMutation.isPending}
                    >
                      ✗ No, I didn't
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              getMultiChoiceResultDisplay()
            ))}
        </CardHeader>

        <CardContent className="space-y-5 px-0">
          {/* Probability & Roll Section for Binary Decisions */}
          {decision.type === "binary" && !pendingRoll && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {isRolling && animationsEnabled
                    ? getAnimatedDiceIcon()
                    : getDiceIcon(localProbability)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl lg:text-4xl font-bold">
                        {localProbability.toFixed(
                          decision.binary_decision?.probability_granularity ||
                            0,
                        )}
                        %
                      </span>
                    </div>
                    <span className="text-xs text-[oklch(0.51_0.077_74.3)]">
                      probability
                    </span>
                  </div>
                </div>

                {/* Probability adjustment buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onPointerDown={(e) => {
                      handleProbabilityMouseDown(-1, e);
                    }}
                    onPointerUp={handleProbabilityMouseUp}
                    onPointerLeave={handleProbabilityMouseUp}
                    onPointerCancel={handleProbabilityMouseUp}
                    size="sm"
                    className="probability-button text-xl font-bold touch-none select-none"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    onPointerDown={(e) => {
                      handleProbabilityMouseDown(1, e);
                    }}
                    onPointerUp={handleProbabilityMouseUp}
                    onPointerLeave={handleProbabilityMouseUp}
                    onPointerCancel={handleProbabilityMouseUp}
                    size="sm"
                    className="probability-button text-xl font-bold touch-none select-none"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Show if probability has been adjusted but not saved */}
              {Math.abs(
                localProbability -
                  (decision.binary_decision?.probability || 50),
              ) > 0.001 && (
                <p className="text-xs text-[oklch(0.51_0.077_74.3)] text-center">
                  Probability adjusted • Will save on next confirmed roll
                </p>
              )}
            </div>
          )}

          {/* Choice Section for Multi-choice Decisions */}
          {decision.type === "multi_choice" &&
            !pendingRoll &&
            decision.multi_choice_decision && (
              <div className="space-y-4">
                {/* Individual Option Probabilities */}
                <div className="space-y-3">
                  {[...decision.multi_choice_decision.choices]
                    .sort(
                      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
                    )
                    .map((choice) => {
                      const currentWeight =
                        localChoiceWeights[choice.id] || choice.weight;
                      return (
                        <div
                          key={choice.id}
                          className="flex items-center justify-between gap-3 p-3 bg-[oklch(0.89_0.04_83.6)] rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {isRolling && animationsEnabled
                              ? getAnimatedDiceIcon()
                              : getDiceIcon(currentWeight)}
                            <span className="font-medium">{choice.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold min-w-[3rem] text-right">
                              {typeof currentWeight === "number"
                                ? currentWeight.toFixed(
                                    decision.multi_choice_decision
                                      ?.weight_granularity || 0,
                                  )
                                : currentWeight}
                              %
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                onPointerDown={(e) => {
                                  handleChoiceWeightMouseDown(choice.id, -1, e);
                                }}
                                onPointerUp={handleChoiceWeightMouseUp}
                                onPointerLeave={handleChoiceWeightMouseUp}
                                onPointerCancel={handleChoiceWeightMouseUp}
                                size="sm"
                                className="probability-button text-lg font-bold w-8 h-8 p-0 touch-none select-none"
                              >
                                −
                              </Button>
                              <Button
                                onPointerDown={(e) => {
                                  handleChoiceWeightMouseDown(choice.id, 1, e);
                                }}
                                onPointerUp={handleChoiceWeightMouseUp}
                                onPointerLeave={handleChoiceWeightMouseUp}
                                onPointerCancel={handleChoiceWeightMouseUp}
                                size="sm"
                                className="probability-button text-lg font-bold w-8 h-8 p-0 touch-none select-none"
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Show total and warning if not 100% */}
                {!multiChoiceWeightsValid && (
                  <div className="text-sm text-[oklch(0.75_0.12_20)] bg-[oklch(0.75_0.12_20)]/10 px-3 py-2 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span>
                        Total:{" "}
                        {multiChoiceWeightTotal.toFixed(
                          decision.multi_choice_decision.weight_granularity ||
                            0,
                        )}
                        %
                      </span>
                      <span className="font-medium">Must equal 100%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Roll Button with Cooldown */}
          {!pendingRoll && (
            <Button
              onClick={handleRoll}
              disabled={
                rollMutation.isPending ||
                isRolling ||
                (cooldownEndsAt !== null && new Date() < cooldownEndsAt) ||
                (decision.type === "multi_choice" && !multiChoiceWeightsValid)
              }
              className={`w-full text-lg lg:text-xl py-6 lg:py-8 font-bold ${
                (cooldownEndsAt && new Date() < cooldownEndsAt) ||
                (decision.type === "multi_choice" && !multiChoiceWeightsValid)
                  ? "opacity-50 cursor-not-allowed bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.88_0.035_83.6)] text-[oklch(0.51_0.077_74.3)]"
                  : "roll-button"
              } ${isRolling ? "animate-pulse" : ""}`}
            >
              {cooldownEndsAt && new Date() < cooldownEndsAt ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    <span>On Cooldown</span>
                  </div>
                  <span className="text-xs opacity-75">
                    Available {formatCooldownTime(cooldownEndsAt)}
                  </span>
                </div>
              ) : isRolling && animationsEnabled ? (
                <>
                  <Dices className="size-8 mr-2 animate-spin" />
                  <span className="ml-2">Rolling...</span>
                </>
              ) : decision.type === "multi_choice" &&
                !multiChoiceWeightsValid ? (
                <>
                  <Dices className="size-8 mr-2" />
                  <span>Adjust Weights to 100%</span>
                </>
              ) : (
                <>
                  <Dices className="size-8 mr-2" />
                  {decision.type === "binary"
                    ? "Roll the Dice"
                    : "Pick Random Choice"}
                </>
              )}
            </Button>
          )}

          {/* Integrated Charts - only show if there's data */}
          {chartData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BarChart3 className="w-4 h-4" />
                  <span>Progress & Follow-through</span>
                </div>
                {confirmedRolls.length > 10 && (
                  <Button
                    onClick={() => setShowFullHistory(!showFullHistory)}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                  >
                    <History className="w-3 h-3 mr-1" />
                    {showFullHistory ? "Recent" : "All"}
                  </Button>
                )}
              </div>

              <div className="h-32 md:h-36 lg:h-40">
                <ResponsiveContainer width="100%" height="100%">
                  {decision.type === "binary" ? (
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.74 0.063 80.8)"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="decision"
                        stroke="oklch(0.51 0.077 74.3)"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="oklch(0.71 0.097 111.7)"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        width={30}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="oklch(0.75 0.12 140)"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        width={30}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.92 0.042 83.6)",
                          border: "2px solid oklch(0.74 0.063 80.8)",
                          borderRadius: "0.625rem",
                          fontSize: "12px",
                        }}
                        formatter={(value: number | string, name: string) => [
                          `${value}%`,
                          name === "probability"
                            ? "Target %"
                            : "Follow-through %",
                        ]}
                      />

                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="followThrough"
                        fill="oklch(0.75 0.12 140)"
                        fillOpacity={0.2}
                        stroke="oklch(0.75 0.12 140)"
                        strokeWidth={2}
                      />

                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="probability"
                        stroke="oklch(0.71 0.097 111.7)"
                        strokeWidth={3}
                        dot={{
                          fill: "oklch(0.71 0.097 111.7)",
                          strokeWidth: 2,
                          r: 3,
                        }}
                      />
                    </ComposedChart>
                  ) : (
                    // Chart for multi-choice decisions
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.74 0.063 80.8)"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="decision"
                        stroke="oklch(0.51 0.077 74.3)"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="oklch(0.51 0.077 74.3)"
                        fontSize={10}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 100]}
                        width={30}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.92 0.042 83.6)",
                          border: "2px solid oklch(0.74 0.063 80.8)",
                          borderRadius: "0.625rem",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          const granularity =
                            decision.multi_choice_decision
                              ?.weight_granularity || 0;
                          return [
                            `${(value as number).toFixed(granularity)}%`,
                            name,
                          ];
                        }}
                      />

                      {/* Create a line for each choice */}
                      {[...(decision.multi_choice_decision?.choices || [])]
                        .sort(
                          (a, b) =>
                            (a.display_order ?? 0) - (b.display_order ?? 0),
                        )
                        .map((choice, index) => {
                          const colors = [
                            "oklch(0.71 0.097 111.7)",
                            "oklch(0.75 0.12 140)",
                            "oklch(0.75 0.12 20)",
                            "oklch(0.75 0.12 260)",
                            "oklch(0.75 0.12 300)",
                          ];
                          return (
                            <Line
                              key={choice.id}
                              type="monotone"
                              dataKey={`weight_${choice.name}`}
                              name={choice.name}
                              stroke={colors[index % colors.length]}
                              strokeWidth={2}
                              dot={{
                                fill: colors[index % colors.length],
                                strokeWidth: 1,
                                r: 2,
                              }}
                            />
                          );
                        })}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Legend & Stats */}
              <div className="flex justify-between items-center text-xs text-[oklch(0.51_0.077_74.3)]">
                <div className="flex items-center gap-3 flex-wrap">
                  {decision.type === "binary" ? (
                    <>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: "oklch(0.71 0.097 111.7)" }}
                        ></div>
                        <span>Target</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: "oklch(0.75 0.12 140)" }}
                        ></div>
                        <span>Follow-through</span>
                      </div>
                    </>
                  ) : (
                    [...(decision.multi_choice_decision?.choices || [])]
                      .sort(
                        (a, b) =>
                          (a.display_order ?? 0) - (b.display_order ?? 0),
                      )
                      .slice(0, 3)
                      .map((choice, index) => {
                        const colors = [
                          "oklch(0.71 0.097 111.7)",
                          "oklch(0.75 0.12 140)",
                          "oklch(0.75 0.12 20)",
                        ];
                        return (
                          <div
                            key={choice.id}
                            className="flex items-center gap-1"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: colors[index] }}
                            ></div>
                            <span>{choice.name}</span>
                          </div>
                        );
                      })
                  )}
                </div>
                <div className="text-right">
                  <span>
                    {totalRolls} decisions • {followThroughRate}% followed
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>

      <EditDecisionDialog
        decision={decision}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={onUpdate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{decision.title}" and all its
              history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[oklch(0.75_0.12_20)] hover:bg-[oklch(0.65_0.12_20)] text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
