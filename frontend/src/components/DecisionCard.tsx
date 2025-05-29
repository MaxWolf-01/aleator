import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DecisionWithDetails, Roll } from '@/types';
import { apiClient } from '@/lib/api';
import { 
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, 
  Plus, Minus, BarChart3, Edit2, Trash2, 
  CheckCircle, XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Area } from 'recharts';

interface DecisionCardProps {
  decision: DecisionWithDetails;
  onUpdate: () => void;
}

export function DecisionCard({ decision, onUpdate }: DecisionCardProps) {
  const [pendingRoll, setPendingRoll] = useState<Roll | null>(null);
  const [localProbability, setLocalProbability] = useState(
    decision.binary_decision?.probability || 50
  );

  const rollMutation = useMutation<Roll, Error, void>({
    mutationFn: () => apiClient.rollDecision(decision.id) as Promise<Roll>,
    onSuccess: (roll: Roll) => {
      setPendingRoll(roll);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (followed: boolean) => 
      apiClient.confirmFollowThrough(pendingRoll!.id, followed),
    onSuccess: () => {
      setPendingRoll(null);
      onUpdate();
    },
  });

  const updateProbabilityMutation = useMutation({
    mutationFn: (newProbability: number) =>
      apiClient.updateDecision(decision.id, { probability: newProbability }),
    onSuccess: () => {
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
    updateProbabilityMutation.mutate(newProb);
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

  // Mock history data for now - will be replaced with real data
  const mockHistory = [
    { decision: "#1", probability: 80, compliance: 85 },
    { decision: "#2", probability: 75, compliance: 87 },
    { decision: "#3", probability: 70, compliance: 91 },
    { decision: "#4", probability: localProbability, compliance: 89 },
  ];

  // Calculate stats
  const totalRolls = decision.rolls?.length || 0;
  const followedCount = decision.rolls?.filter(r => r.followed).length || 0;
  const complianceRate = totalRolls > 0 ? Math.round((followedCount / totalRolls) * 100) : 0;

  return (
    <Card className="matsu-card relative overflow-hidden">
      <div className="relative z-10">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-xl">{decision.title}</CardTitle>
                <div className="flex items-center gap-1">
                  <button
                    className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all"
                    title="Edit decision"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.94_0.08_20)] border border-[oklch(0.78_0.063_80.8)] hover:border-[oklch(0.75_0.12_20)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.75_0.12_20)] transition-all"
                    title="Delete decision"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-[oklch(0.51_0.077_74.3)] mb-3">
                {decision.binary_decision?.yes_text && decision.binary_decision?.no_text 
                  ? `${decision.binary_decision.yes_text} or ${decision.binary_decision.no_text}`
                  : 'Make a mindful choice'
                }
              </p>
            </div>
            <div className="ml-2">
              <Badge className="matsu-badge px-2 py-1">
                {decision.type === 'binary' ? 'Yes/No' : 'Choice'}
              </Badge>
            </div>
          </div>

          {/* Prominent Outcome Display */}
          {pendingRoll && (
            <div className={`p-4 rounded-xl mb-4 text-center ${
              pendingRoll.result === 'yes' 
                ? 'result-yes' 
                : 'result-no'
            }`}>
              <div className="flex items-center justify-center gap-3 mb-1">
                {pendingRoll.result === 'yes' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
                <span className="text-2xl font-bold">
                  {pendingRoll.result === 'yes' 
                    ? decision.binary_decision?.yes_text || 'Yes'
                    : decision.binary_decision?.no_text || 'No'
                  }
                </span>
              </div>
              <p className="text-sm opacity-90">
                {pendingRoll.result === 'yes' 
                  ? "The dice have spoken ✨" 
                  : "Save it for another time 🌙"
                }
              </p>

              {/* Compliance Tracking */}
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium">Did you follow this decision?</p>
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
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Probability & Roll Section for Binary Decisions */}
          {decision.type === 'binary' && !pendingRoll && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {getDiceIcon(localProbability)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl md:text-3xl font-bold">{localProbability}%</span>
                    </div>
                    <span className="text-xs text-[oklch(0.51_0.077_74.3)]">probability</span>
                  </div>
                </div>
                
                {/* Probability adjustment buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => adjustProbability(-1)}
                    size="sm"
                    className="probability-button text-xl font-bold"
                    disabled={updateProbabilityMutation.isPending}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => adjustProbability(1)}
                    size="sm"
                    className="probability-button text-xl font-bold"
                    disabled={updateProbabilityMutation.isPending}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Roll Button */}
          {!pendingRoll && (
            <Button 
              onClick={handleRoll}
              disabled={rollMutation.isPending}
              className="w-full roll-button text-lg py-6 font-bold"
            >
              <Dice1 className="w-5 h-5 mr-2" />
              Roll the Dice
            </Button>
          )}

          {/* Integrated Charts */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="w-4 h-4" />
              <span>Progress & Compliance</span>
            </div>
            
            <div className="h-32 md:h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.74 0.063 80.8)" opacity={0.3} />
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
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'oklch(0.92 0.042 83.6)',
                      border: '2px solid oklch(0.74 0.063 80.8)',
                      borderRadius: '0.625rem',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: any) => [
                      `${value}%`, 
                      name === 'probability' ? 'Target %' : 'Compliance %'
                    ]}
                  />
                  
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="compliance"
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
                    dot={{ fill: 'oklch(0.71 0.097 111.7)', strokeWidth: 2, r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend & Stats */}
            <div className="flex justify-between items-center text-xs text-[oklch(0.51_0.077_74.3)]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'oklch(0.71 0.097 111.7)' }}></div>
                  <span>Target</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'oklch(0.75 0.12 140)' }}></div>
                  <span>Follow-through</span>
                </div>
              </div>
              <div className="text-right">
                <span>{totalRolls} decisions • {complianceRate}% followed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}