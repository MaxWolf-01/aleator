import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { DecisionWithDetails, Roll } from '@/types';
import { apiClient } from '@/lib/api';
import { Dice1, Dice2, Sparkles, Check, X, Clock } from 'lucide-react';

interface DecisionCardProps {
  decision: DecisionWithDetails;
  onUpdate: () => void;
}

export function DecisionCard({ decision, onUpdate }: DecisionCardProps) {
  const [pendingRoll, setPendingRoll] = useState<Roll | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [probability, setProbability] = useState([
    decision.binary_decision?.probability || 50
  ]);

  const rollMutation = useMutation<Roll, Error, void>({
    mutationFn: () => apiClient.rollDecision(decision.id) as Promise<Roll>,
    onSuccess: (roll: Roll) => {
      setPendingRoll(roll);
      setIsRolling(false);
    },
    onError: () => {
      setIsRolling(false);
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
    setIsRolling(true);
    // Add dramatic pause for rolling animation
    setTimeout(() => {
      rollMutation.mutate();
    }, 1500);
  };

  const handleConfirm = (followed: boolean) => {
    confirmMutation.mutate(followed);
  };

  const handleProbabilityChange = (newValue: number[]) => {
    setProbability(newValue);
    updateProbabilityMutation.mutate(newValue[0]);
  };

  const getResultDisplay = () => {
    if (!pendingRoll) return null;
    
    const isYes = pendingRoll.result === 'yes';
    const yesText = decision.binary_decision?.yes_text || 'Yes';
    const noText = decision.binary_decision?.no_text || 'No';
    
    return (
      <div className={`p-4 rounded-lg text-center font-medium border transition-all ${
        isYes 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100 shadow-lg' 
          : 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100 shadow-lg'
      }`}>
        <div className="text-2xl mb-2">
          {isYes ? '🎉' : '🌙'}
        </div>
        <div className="font-bold text-lg">
          {isYes ? yesText : noText}
        </div>
        <p className="text-sm mt-1 opacity-80">
          {isYes ? 'Go for it!' : 'Maybe next time'}
        </p>
      </div>
    );
  };

  const getRollingDisplay = () => (
    <div className="p-4 rounded-lg text-center bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
      <div className="flex justify-center mb-3">
        <div className="animate-bounce">
          <Dice2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      </div>
      <p className="font-medium text-purple-700">Rolling the dice...</p>
      <div className="flex justify-center mt-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="hover:shadow-ghibli-lg transition-all duration-300 border-forest-100 hover:border-forest-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Dice1 className="w-5 h-5 text-primary" />
              {decision.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {decision.binary_decision?.yes_text && decision.binary_decision?.no_text 
                ? `${decision.binary_decision.yes_text} or ${decision.binary_decision.no_text}`
                : 'Binary decision'
              }
            </CardDescription>
          </div>
          <Badge variant="secondary" className="ml-2">
            {decision.type === 'binary' ? 'Yes/No' : 'Multi-choice'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Rolling Animation or Result */}
        {isRolling && getRollingDisplay()}
        {pendingRoll && !isRolling && getResultDisplay()}
        
        {/* Follow-through Confirmation */}
        {pendingRoll && !isRolling && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Did you follow through?</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConfirm(true)}
                disabled={confirmMutation.isPending}
                className="flex-1 border-forest-200 hover:bg-forest-50"
              >
                <Check className="w-4 h-4 mr-2" />
                Yes, I did
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConfirm(false)}
                disabled={confirmMutation.isPending}
                className="flex-1 border-honey-200 hover:bg-honey-50"
              >
                <X className="w-4 h-4 mr-2" />
                No, I didn't
              </Button>
            </div>
          </div>
        )}
        
        {/* Probability Slider - only show when not rolling or pending */}
        {!isRolling && !pendingRoll && decision.type === 'binary' && (
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span>Probability</span>
              <span className="font-bold text-primary">{probability[0]}%</span>
            </Label>
            <Slider
              value={probability}
              onValueChange={handleProbabilityChange}
              max={99}
              min={1}
              step={1}
              className="cursor-pointer"
              disabled={updateProbabilityMutation.isPending}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Rarely</span>
              <span>Usually</span>
            </div>
          </div>
        )}

        {/* Roll Button */}
        {!pendingRoll && (
          <Button 
            onClick={handleRoll}
            disabled={isRolling || rollMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isRolling ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Rolling...
              </div>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Roll the Dice
              </>
            )}
          </Button>
        )}

        {/* Pending Roll Indicator */}
        {pendingRoll && !isRolling && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Waiting for follow-through confirmation
          </div>
        )}
      </CardContent>
    </Card>
  );
}