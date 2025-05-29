import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import type { DecisionWithDetails } from '@/types';
import { apiClient } from '@/lib/api';

interface EditDecisionDialogProps {
  decision: DecisionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditDecisionDialog({ decision, open, onOpenChange, onUpdate }: EditDecisionDialogProps) {
  const [title, setTitle] = useState('');
  const [probability, setProbability] = useState(50);
  const [yesText, setYesText] = useState('Yes');
  const [noText, setNoText] = useState('No');

  // Update form when decision changes
  useEffect(() => {
    if (decision) {
      setTitle(decision.title);
      if (decision.binary_decision) {
        setProbability(decision.binary_decision.probability);
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
        probability: decision.type === 'binary' ? probability : undefined,
        yes_text: decision.type === 'binary' ? yesText : undefined,
        no_text: decision.type === 'binary' ? noText : undefined
      });
    },
    onSuccess: () => {
      onUpdate();
      onOpenChange(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!decision) return;
      await apiClient.deleteDecision(decision.id);
    },
    onSuccess: () => {
      onUpdate();
      onOpenChange(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this decision? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  if (!decision) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Decision</SheetTitle>
          <SheetDescription>
            Update your decision details and probabilities
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Decision title"
            />
          </div>

          {decision.type === 'binary' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability: {probability}%</Label>
                <Slider
                  id="probability"
                  min={1}
                  max={99}
                  value={[probability]}
                  onValueChange={([value]) => setProbability(value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yes-text">Yes Answer Text</Label>
                <Input
                  id="yes-text"
                  value={yesText}
                  onChange={(e) => setYesText(e.target.value)}
                  placeholder="Text for yes outcome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="no-text">No Answer Text</Label>
                <Input
                  id="no-text"
                  value={noText}
                  onChange={(e) => setNoText(e.target.value)}
                  placeholder="Text for no outcome"
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="w-full sm:w-auto"
          >
            Delete Decision
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}