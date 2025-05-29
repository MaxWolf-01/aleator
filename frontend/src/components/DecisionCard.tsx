import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DecisionWithDetails, Roll } from "@/types";
import { apiClient } from "@/lib/api";
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
}

export function DecisionCard({ decision, onUpdate }: DecisionCardProps) {
  const [pendingRoll, setPendingRoll] = useState<Roll | null>(null);
  const [localProbability, setLocalProbability] = useState(
    decision.binary_decision?.probability || 50,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<Date | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Fetch pending roll and check cooldown on mount
  useEffect(() => {
    const fetchPendingRoll = async () => {
      try {
        const pending = await apiClient.getPendingRoll(decision.id) as Roll;
        setPendingRoll(pending);
      } catch (error) {
        // No pending roll found, which is fine
      }
    };
    
    // Calculate cooldown from last confirmed roll
    if (decision.cooldown_hours > 0 && decision.rolls && decision.rolls.length > 0) {
      // Find the most recent confirmed roll
      const confirmedRolls = decision.rolls.filter(r => r.followed !== null);
      if (confirmedRolls.length > 0) {
        const lastRoll = confirmedRolls[confirmedRolls.length - 1];
        const lastRollTime = new Date(lastRoll.created_at);
        const cooldownEnd = new Date(lastRollTime.getTime() + decision.cooldown_hours * 60 * 60 * 1000);
        
        if (cooldownEnd > new Date()) {
          setCooldownEndsAt(cooldownEnd);
        }
      }
    }
    
    fetchPendingRoll();
  }, [decision.id, decision.cooldown_hours, decision.rolls]);

  const rollMutation = useMutation<Roll, Error, void>({
    mutationFn: () => apiClient.rollDecision(decision.id) as Promise<Roll>,
    onSuccess: (roll: Roll) => {
      setPendingRoll(roll);
    },
    onError: (error) => {
      // If there's a pending roll error, try to fetch it
      if (error.message.includes("pending roll")) {
        const fetchPending = async () => {
          try {
            const pending = await apiClient.getPendingRoll(decision.id) as Roll;
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
        const match = error.message.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)/);
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
        cooldownEnd.setTime(cooldownEnd.getTime() + decision.cooldown_hours * 60 * 60 * 1000);
        setCooldownEndsAt(cooldownEnd);
      }
      
      onUpdate();
    },
  });

  const handleRoll = () => {
    rollMutation.mutate();
  };

  const handleConfirm = (followed: boolean) => {
    confirmMutation.mutate(followed);
  };

  const adjustProbability = (change: number) => {
    const newProb = Math.max(1, Math.min(99, localProbability + change));
    setLocalProbability(newProb);
    // DON'T save immediately - wait for confirmation
  };

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
  const rollsToShow = showFullHistory ? confirmedRolls : confirmedRolls.slice(-10);
  const startIndex = showFullHistory ? 0 : Math.max(0, confirmedRolls.length - 10);
  
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
      .filter(ph => new Date(ph.changed_at) <= rollDate)
      .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
    const probabilityAtRoll = relevantHistory[0]?.probability || decision.binary_decision?.probability || 50;

    // Format date intelligently
    const formatDate = () => {
      const today = new Date();
      const diff = today.getTime() - rollDate.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) return "Today";
      if (days === 1) return "Yesterday";
      if (days < 7) return `${days}d ago`;
      if (days < 30) return `${Math.floor(days / 7)}w ago`;
      if (days < 365) return rollDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return rollDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    return {
      decision: showFullHistory && rollsToShow.length > 10 ? formatDate() : `#${actualIndex + 1}`,
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
      return `in ${days} day${days > 1 ? 's' : ''}`;
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
      return `${days} day${days > 1 ? 's' : ''}`;
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
    <Card className="matsu-card relative overflow-hidden">
      <div className="relative z-10">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl font-semibold">
                  {decision.title}
                </CardTitle>
                <div className="flex items-center gap-1">
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
              </div>
              {/* Show cooldown setting if enabled */}
              {decision.cooldown_hours > 0 && (
                <div className="flex items-center gap-1 text-xs text-[oklch(0.51_0.077_74.3)]">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatCooldownHours(decision.cooldown_hours)} cooldown
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Prominent Outcome Display */}
          {pendingRoll && (
            <div
              className={`p-4 rounded-xl mb-4 text-center ${
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
                    className="bg-white/20 hover:bg-white/30 border border-current flex-1 md:flex-none min-h-[44px]"
                    disabled={confirmMutation.isPending}
                  >
                    ✓ Yes, I did
                  </Button>
                  <Button
                    onClick={() => handleConfirm(false)}
                    className="bg-white/20 hover:bg-white/30 border border-current flex-1 md:flex-none min-h-[44px]"
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

        <CardContent className="space-y-6">
          {/* Probability & Roll Section for Binary Decisions */}
          {decision.type === "binary" && !pendingRoll && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {getDiceIcon(localProbability)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl font-bold">
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
                    onClick={() => adjustProbability(-1)}
                    size="sm"
                    className="probability-button text-xl font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => adjustProbability(1)}
                    size="sm"
                    className="probability-button text-xl font-bold"
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
              disabled={rollMutation.isPending || (cooldownEndsAt !== null && new Date() < cooldownEndsAt)}
              className={`w-full text-lg py-6 font-bold ${
                cooldownEndsAt && new Date() < cooldownEndsAt
                  ? 'opacity-50 cursor-not-allowed bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.88_0.035_83.6)] text-[oklch(0.51_0.077_74.3)]'
                  : 'roll-button'
              }`}
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
            <div className="space-y-3">
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

              <div className="h-32 md:h-36">
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
                      width={25}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="oklch(0.75 0.12 140)"
                      fontSize={10}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      width={25}
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
