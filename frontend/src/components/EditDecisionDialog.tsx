import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { DecisionWithDetails } from '@/types';
import { apiClient } from '@/lib/api';
import { X, Edit2, Save } from "lucide-react";

interface EditDecisionDialogProps {
  decision: DecisionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditDecisionDialog({ decision, open, onOpenChange, onUpdate }: EditDecisionDialogProps) {
  const [title, setTitle] = useState('');
  const [probability, setProbability] = useState([50]);
  const [yesText, setYesText] = useState('Yes');
  const [noText, setNoText] = useState('No');

  // Update form when decision changes
  useEffect(() => {
    if (decision) {
      setTitle(decision.title);
      if (decision.binary_decision) {
        setProbability([decision.binary_decision.probability]);
        setYesText(decision.binary_decision.yes_text);
        setNoText(decision.binary_decision.no_text);
      }
    }
  }, [decision]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!decision) return;
      
      // Update decision title, probability, and yes/no text
      await apiClient.updateDecision(decision.id, { 
        title,
        probability: decision.type === 'binary' ? probability[0] : undefined,
        yes_text: decision.type === 'binary' ? yesText : undefined,
        no_text: decision.type === 'binary' ? noText : undefined
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
                  <div className="space-y-3">
                    <Label className="flex items-center justify-between text-[oklch(0.51_0.077_74.3)]">
                      <span>Probability</span>
                      <span className="font-bold text-[oklch(0.71_0.097_111.7)]">
                        {probability[0]}%
                      </span>
                    </Label>
                    <Slider
                      value={probability}
                      onValueChange={setProbability}
                      max={99}
                      min={1}
                      step={1}
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-[oklch(0.61_0.077_74.3)]">
                      <span>1%</span>
                      <span>99%</span>
                    </div>
                  </div>

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
                </>
              )}
              
              {/* Note about probability changes */}
              {decision.type === 'binary' && (
                <div className="p-3 bg-[oklch(0.96_0.025_83.6)] rounded-lg border border-[oklch(0.74_0.063_80.8)]">
                  <p className="text-xs text-[oklch(0.51_0.077_74.3)]">
                    <strong>Note:</strong> Changing the probability here will update the default for future rolls. 
                    Temporary probability adjustments can be made in the decision card before rolling.
                  </p>
                </div>
              )}

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