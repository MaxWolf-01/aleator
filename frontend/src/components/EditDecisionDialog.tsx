import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DecisionWithDetails } from '@/types';
import { apiClient } from '@/lib/api';
import { X, Edit2, Save, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

interface EditDecisionDialogProps {
  decision: DecisionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditDecisionDialog({ decision, open, onOpenChange, onUpdate }: EditDecisionDialogProps) {
  const [title, setTitle] = useState('');
  const [yesText, setYesText] = useState('Yes');
  const [noText, setNoText] = useState('No');
  const [probabilityGranularity, setProbabilityGranularity] = useState("0");
  const [cooldownValue, setCooldownValue] = useState(0);
  const [cooldownUnit, setCooldownUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  // Update form when decision changes
  useEffect(() => {
    if (decision) {
      setTitle(decision.title);
      
      // Convert hours to appropriate unit
      const hours = decision.cooldown_hours || 0;
      if (hours === 0) {
        setCooldownValue(0);
        setCooldownUnit('hours');
      } else if (hours % 24 === 0) {
        setCooldownValue(hours / 24);
        setCooldownUnit('days');
      } else if (hours < 1) {
        setCooldownValue(hours * 60);
        setCooldownUnit('minutes');
      } else {
        setCooldownValue(hours);
        setCooldownUnit('hours');
      }
      
      if (decision.binary_decision) {
        setYesText(decision.binary_decision.yes_text);
        setNoText(decision.binary_decision.no_text);
        setProbabilityGranularity(decision.binary_decision.probability_granularity?.toString() || "0");
      }
    }
  }, [decision]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!decision) return;
      
      // Convert cooldown to hours
      let cooldownHours = 0;
      if (cooldownValue > 0) {
        switch (cooldownUnit) {
          case 'minutes':
            cooldownHours = cooldownValue / 60;
            break;
          case 'hours':
            cooldownHours = cooldownValue;
            break;
          case 'days':
            cooldownHours = cooldownValue * 24;
            break;
        }
      }
      
      // Update decision title and yes/no text
      await apiClient.updateDecision(decision.id, { 
        title,
        cooldown_hours: cooldownHours,
        yes_text: decision.type === 'binary' ? yesText : undefined,
        no_text: decision.type === 'binary' ? noText : undefined,
        probability_granularity: decision.type === 'binary' ? parseInt(probabilityGranularity) : undefined
      });
    },
    onSuccess: () => {
      onUpdate();
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  if (!decision || !open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="matsu-card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative z-10">
          <div className="p-6 border-b border-[oklch(0.74_0.063_80.8)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[oklch(0.71_0.097_111.7)]" />
                  Edit Decision
                </h2>
                <p className="text-sm text-[oklch(0.51_0.077_74.3)] mt-1">
                  Update your decision details
                </p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-md bg-[oklch(0.88_0.035_83.6)] hover:bg-[oklch(0.84_0.045_83.6)] border border-[oklch(0.78_0.063_80.8)] flex items-center justify-center text-[oklch(0.41_0.077_78.9)] hover:text-[oklch(0.31_0.077_78.9)] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[oklch(0.51_0.077_74.3)]">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Decision title"
                  className="border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                />
              </div>

              {decision.type === 'binary' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="yes-text" className="text-[oklch(0.51_0.077_74.3)]">Yes Answer Text</Label>
                      <Input
                        id="yes-text"
                        value={yesText}
                        onChange={(e) => setYesText(e.target.value)}
                        placeholder="Text for yes outcome"
                        className="border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="no-text" className="text-[oklch(0.51_0.077_74.3)]">No Answer Text</Label>
                      <Input
                        id="no-text"
                        value={noText}
                        onChange={(e) => setNoText(e.target.value)}
                        placeholder="Text for no outcome"
                        className="border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                      />
                    </div>
                  </div>

                  {/* Probability Granularity */}
                  <div className="space-y-2">
                    <Label className="text-[oklch(0.51_0.077_74.3)]">Probability Precision</Label>
                    <ToggleGroup 
                      type="single" 
                      value={probabilityGranularity}
                      onValueChange={(value) => value && setProbabilityGranularity(value)}
                      className="justify-start"
                    >
                      <ToggleGroupItem 
                        value="0" 
                        aria-label="Whole numbers"
                        className="data-[state=on]:bg-[oklch(0.71_0.097_111.7)] data-[state=on]:text-white"
                      >
                        1%
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="1" 
                        aria-label="One decimal"
                        className="data-[state=on]:bg-[oklch(0.71_0.097_111.7)] data-[state=on]:text-white"
                      >
                        0.1%
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="2" 
                        aria-label="Two decimals"
                        className="data-[state=on]:bg-[oklch(0.71_0.097_111.7)] data-[state=on]:text-white"
                      >
                        0.01%
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <p className="text-xs text-[oklch(0.61_0.077_74.3)]">
                      Choose how precise you want your probability adjustments to be
                    </p>
                  </div>
                </>
              )}

              {/* Cooldown Configuration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[oklch(0.51_0.077_74.3)]">
                  <Clock className="w-4 h-4" />
                  Roll Cooldown
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={cooldownValue}
                    onChange={(e) => setCooldownValue(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="flex-1 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                  />
                  <Select
                    value={cooldownUnit}
                    onValueChange={(value) => setCooldownUnit(value as 'minutes' | 'hours' | 'days')}
                  >
                    <SelectTrigger className="w-24 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.96_0.025_83.6)] border-2 border-[oklch(0.74_0.063_80.8)]">
                      <SelectItem value="minutes" className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]">
                        min
                      </SelectItem>
                      <SelectItem value="hours" className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]">
                        hrs
                      </SelectItem>
                      <SelectItem value="days" className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]">
                        days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-[oklch(0.61_0.077_74.3)]">
                  Time you must wait between rolls after confirming (0 = no cooldown)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.88_0.035_83.6)]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={updateMutation.isPending}
                  className="flex-1 matsu-button"
                >
                  {updateMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}