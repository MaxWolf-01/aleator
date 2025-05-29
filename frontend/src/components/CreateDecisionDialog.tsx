import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api";
import type { CreateBinaryDecisionForm } from "@/types";
import { X, Dice1, Plus } from "lucide-react";

interface CreateDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const binaryDecisionSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  probability: z.number().min(1).max(99),
  yes_text: z.string().min(1, "Yes text is required").max(50, "Text too long"),
  no_text: z.string().min(1, "No text is required").max(50, "Text too long"),
});

export function CreateDecisionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDecisionDialogProps) {
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
      yes_text: "Yes",
      no_text: "No",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBinaryDecisionForm) =>
      apiClient.createDecision({
        title: data.title,
        type: "binary",
        binary_data: {
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
      <div className="matsu-card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative z-10">
          <div className="p-6 border-b border-[oklch(0.74_0.063_80.8)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <Dice1 className="w-5 h-5 text-[oklch(0.71_0.097_111.7)]" />
                  New Decision
                </h2>
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[oklch(0.51_0.077_74.3)]">Type</Label>
                <div className="flex gap-2">
                  <Badge className="badge-active cursor-pointer">
                    Yes/No Decision
                  </Badge>
                  <Badge
                    variant="outline"
                    className="cursor-not-allowed opacity-50 border-[oklch(0.74_0.063_80.8)] text-[oklch(0.51_0.077_74.3)]"
                  >
                    Multi-choice (Coming Soon)
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-[oklch(0.51_0.077_74.3)]">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Eat meat today?"
                  {...register("title")}
                  className={`border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)] ${
                    errors.title ? "border-[oklch(0.75_0.12_20)]" : ""
                  }`}
                />
                {errors.title && (
                  <p className="text-sm text-[oklch(0.75_0.12_20)]">{errors.title.message}</p>
                )}
              </div>

              {/* Probability Slider */}
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

              {/* Yes/No Text Customization */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yes_text" className="text-[oklch(0.51_0.077_74.3)]">Yes Option *</Label>
                  <Input
                    id="yes_text"
                    placeholder="Yes"
                    {...register("yes_text")}
                    className={`border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)] ${
                      errors.yes_text ? "border-[oklch(0.75_0.12_20)]" : ""
                    }`}
                  />
                  {errors.yes_text && (
                    <p className="text-sm text-[oklch(0.75_0.12_20)]">
                      {errors.yes_text.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="no_text" className="text-[oklch(0.51_0.077_74.3)]">No Option *</Label>
                  <Input
                    id="no_text"
                    placeholder="No"
                    {...register("no_text")}
                    className={`border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)] ${
                      errors.no_text ? "border-[oklch(0.75_0.12_20)]" : ""
                    }`}
                  />
                  {errors.no_text && (
                    <p className="text-sm text-[oklch(0.75_0.12_20)]">
                      {errors.no_text.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.88_0.035_83.6)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 matsu-button"
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
          </div>
        </div>
      </div>
    </div>
  );
}