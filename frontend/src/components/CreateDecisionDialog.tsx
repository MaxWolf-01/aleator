import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';
import type { CreateBinaryDecisionForm } from '@/types';
import { X, Dice1, Plus } from 'lucide-react';

interface CreateDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const binaryDecisionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  probability: z.number().min(1).max(99),
  yes_text: z.string().min(1, 'Yes text is required').max(50, 'Text too long'),
  no_text: z.string().min(1, 'No text is required').max(50, 'Text too long'),
});

export function CreateDecisionDialog({ open, onOpenChange, onSuccess }: CreateDecisionDialogProps) {
  const [probability, setProbability] = useState([67]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBinaryDecisionForm>({
    resolver: zodResolver(binaryDecisionSchema),
    defaultValues: {
      probability: 67,
      yes_text: 'Yes',
      no_text: 'No',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBinaryDecisionForm) =>
      apiClient.createDecision({
        title: data.title,
        type: 'binary',
        binary_decision: {
          probability: probability[0],
          yes_text: data.yes_text,
          no_text: data.no_text,
        },
      }),
    onSuccess: () => {
      reset();
      setProbability([67]);
      onSuccess();
    },
  });

  const onSubmit = (data: CreateBinaryDecisionForm) => {
    createMutation.mutate({
      ...data,
      probability: probability[0],
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dice1 className="w-5 h-5 text-primary" />
                New Decision
              </CardTitle>
              <CardDescription>
                Create a new probability-based decision
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Decision Type Selection */}
            <div className="space-y-3">
              <Label>Decision Type</Label>
              <div className="flex gap-2">
                <Badge variant="default" className="cursor-pointer">
                  Yes/No Decision
                </Badge>
                <Badge variant="outline" className="cursor-not-allowed opacity-50">
                  Multi-choice (Coming Soon)
                </Badge>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Decision Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Have dessert tonight"
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Probability Slider */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span>Probability</span>
                <span className="font-bold text-primary">{probability[0]}%</span>
              </Label>
              <Slider
                value={probability}
                onValueChange={setProbability}
                max={99}
                min={1}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1% - Rarely</span>
                <span>99% - Almost always</span>
              </div>
            </div>

            {/* Yes/No Text Customization */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yes_text">Yes Option *</Label>
                <Input
                  id="yes_text"
                  placeholder="Yes"
                  {...register('yes_text')}
                  className={errors.yes_text ? 'border-red-500' : ''}
                />
                {errors.yes_text && (
                  <p className="text-sm text-red-600">{errors.yes_text.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="no_text">No Option *</Label>
                <Input
                  id="no_text"
                  placeholder="No"
                  {...register('no_text')}
                  className={errors.no_text ? 'border-red-500' : ''}
                />
                {errors.no_text && (
                  <p className="text-sm text-red-600">{errors.no_text.message}</p>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-forest-50 rounded-lg border border-forest-200">
              <Label className="text-sm font-medium text-forest-800 block mb-2">
                Preview
              </Label>
              <div className="text-sm text-forest-700">
                <p className="font-medium">Decision: Your title here...</p>
                <p>
                  {probability[0]}% chance of "Yes" → {100 - probability[0]}% chance of "No"
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Decision
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}