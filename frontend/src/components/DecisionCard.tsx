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
  onReorder: (decisionId: string, direction: "up" | "down") => void;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<Date | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [animatedDiceIndex, setAnimatedDiceIndex] = useState(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [decision.id, decision.cooldown_hours, decision.rolls]);

  // Dice roll animation effect
  useEffect(() => {
    if (isRolling && animationsEnabled) {
      const interval = setInterval(() => {
        setAnimatedDiceIndex((prev) => (prev + 1) % 6);
      }, 80); // Change dice face every 80ms (faster for more visual effect)

      // Stop animation after 2 seconds (longer duration)
      const timeout = setTimeout(() => {
        setIsRolling(false);
        clearInterval(interval);
      }, 2000);

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
    mutationFn: () => apiClient.rollDecision(decision.id) as Promise<Roll>,
    onSuccess: (roll: Roll) => {
      if (animationsEnabled) {
        // Don't show result immediately - wait for animation to finish
        setTimeout(() => {
          setPendingRoll(roll);
        }, 1800); // Show result just before animation ends
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

      // Update probability along with confirmation
      const probabilityChanged =
        localProbability !== decision.binary_decision?.probability;

      if (probabilityChanged && decision.type === "binary") {
        await apiClient.updateDecision(decision.id, {
          probability: localProbability,
        });
      }

      // Confirm the roll with both decision ID and roll ID
      return apiClient.confirmFollowThrough(
        decision.id,
        pendingRoll.id,
        followed,
      );
    },
    onSuccess: () => {
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
    setLocalProbability((prev) => {
      const newProb = Math.max(1, Math.min(99, prev + change));
      return newProb;
    });
    // DON'T save immediately - wait for confirmation
  };

  const handleProbabilityMouseDown = (change: number) => {
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

    // Find the probability at the time of this roll
    const rollDate = new Date(roll.created_at);
    const probHistory = decision.probability_history || [];
    const relevantHistory = probHistory
      .filter((ph) => new Date(ph.changed_at) <= rollDate)
      .sort(
        (a, b) =>
          new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime(),
      );
    const probabilityAtRoll =
      relevantHistory[0]?.probability ||
      decision.binary_decision?.probability ||
      50;

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

  return (
    <Card className="matsu-card relative overflow-hidden py-0">
      {/* Edit/Delete/Reorder buttons - absolute positioned */}
      <div className="absolute top-3 right-3 lg:top-4 lg:right-4 z-20 flex items-center gap-1">
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

      <div className="relative z-10 p-6">
        <CardHeader className="p-0 pb-3">
          <div className="pr-32 lg:pr-40">
            <CardTitle
              className={`font-semibold break-all leading-tight ${
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
          {pendingRoll && (
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

              {/* Show if probability was adjusted */}
              {localProbability !== decision.binary_decision?.probability && (
                <p className="text-xs opacity-75 mt-2">
                  Probability will update from{" "}
                  {decision.binary_decision?.probability}% to {localProbability}
                  %
                </p>
              )}
            </div>
          )}
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
                        {localProbability}%
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleProbabilityMouseDown(-1);
                    }}
                    onMouseUp={handleProbabilityMouseUp}
                    onMouseLeave={handleProbabilityMouseUp}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleProbabilityMouseDown(-1);
                    }}
                    onTouchEnd={handleProbabilityMouseUp}
                    size="sm"
                    className="probability-button text-xl font-bold touch-none select-none"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleProbabilityMouseDown(1);
                    }}
                    onMouseUp={handleProbabilityMouseUp}
                    onMouseLeave={handleProbabilityMouseUp}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handleProbabilityMouseDown(1);
                    }}
                    onTouchEnd={handleProbabilityMouseUp}
                    size="sm"
                    className="probability-button text-xl font-bold touch-none select-none"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Show if probability has been adjusted but not saved */}
              {localProbability !== decision.binary_decision?.probability && (
                <p className="text-xs text-[oklch(0.51_0.077_74.3)] text-center">
                  Probability adjusted • Will save on next confirmed dice roll
                </p>
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
                (cooldownEndsAt !== null && new Date() < cooldownEndsAt)
              }
              className={`w-full text-lg lg:text-xl py-6 lg:py-8 font-bold ${
                cooldownEndsAt && new Date() < cooldownEndsAt
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
                  {getAnimatedDiceIcon()}
                  <span className="ml-2">Rolling...</span>
                </>
              ) : (
                <>
                  <Dice1 className="w-5 h-5 mr-2" />
                  Roll the Dice
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
                </ResponsiveContainer>
              </div>

              {/* Legend & Stats */}
              <div className="flex justify-between items-center text-xs text-[oklch(0.51_0.077_74.3)]">
                <div className="flex items-center gap-3">
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
