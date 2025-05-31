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
import type { DecisionType } from "@/types";
import { X, Dice1, Plus, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface CreateDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Choice {
  name: string;
  weight: number;
}

const baseDecisionSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
});

const binaryFieldsSchema = z.object({
  probability: z.number().min(1).max(99),
  probability_granularity: z.number().min(0).max(2),
  yes_text: z.string().min(1, "Yes text is required").max(50, "Text too long"),
  no_text: z.string().min(1, "No text is required").max(50, "Text too long"),
});

type FormData = z.infer<typeof baseDecisionSchema> &
  Partial<z.infer<typeof binaryFieldsSchema>>;

export function CreateDecisionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDecisionDialogProps) {
  const [decisionType, setDecisionType] = useState<DecisionType>("binary");
  const [probability, setProbability] = useState([67]);
  const [probabilityGranularity, setProbabilityGranularity] = useState("0");
  const [weightGranularity, setWeightGranularity] = useState("0");
  const [cooldownValue, setCooldownValue] = useState(0);
  const [cooldownUnit, setCooldownUnit] = useState<
    "minutes" | "hours" | "days"
  >("hours");
  const [choices, setChoices] = useState<Choice[]>([
    { name: "Option 1", weight: 40 },
    { name: "Option 2", weight: 35 },
    { name: "Option 3", weight: 25 },
  ]);
  const [choiceInputValues, setChoiceInputValues] = useState<
    Record<number, string>
  >({
    0: "40",
    1: "35",
    2: "25",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(
      decisionType === "binary"
        ? baseDecisionSchema.merge(binaryFieldsSchema)
        : baseDecisionSchema,
    ),
    defaultValues: {
      probability: 67,
      probability_granularity: 0,
      yes_text: "Yes",
      no_text: "No",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      // Convert cooldown to hours
      let cooldownHours = 0;
      if (cooldownValue > 0) {
        switch (cooldownUnit) {
          case "minutes":
            cooldownHours = cooldownValue / 60;
            break;
          case "hours":
            cooldownHours = cooldownValue;
            break;
          case "days":
            cooldownHours = cooldownValue * 24;
            break;
        }
      }

      if (decisionType === "binary") {
        return apiClient.createDecision({
          title: data.title,
          type: "binary",
          cooldown_hours: cooldownHours,
          binary_data: {
            probability: probability[0],
            probability_granularity: parseInt(probabilityGranularity),
            yes_text: data.yes_text!,
            no_text: data.no_text!,
          },
        });
      } else {
        return apiClient.createDecision({
          title: data.title,
          type: "multi_choice",
          cooldown_hours: cooldownHours,
          multi_choice_data: {
            choices: choices.map((c) => ({ name: c.name, weight: c.weight })),
            weight_granularity: parseInt(weightGranularity),
          },
        });
      }
    },
    onSuccess: () => {
      reset();
      setProbability([67]);
      setProbabilityGranularity("0");
      setWeightGranularity("0");
      setCooldownValue(0);
      setCooldownUnit("hours");
      setChoices([
        { name: "Option 1", weight: 40 },
        { name: "Option 2", weight: 35 },
        { name: "Option 3", weight: 25 },
      ]);
      setChoiceInputValues({
        0: "40",
        1: "35",
        2: "25",
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Failed to create decision:", error);
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const addChoice = () => {
    const newChoices = [...choices];
    const newWeight = 10; // Default weight for new choices
    newChoices.push({
      name: `Option ${choices.length + 1}`,
      weight: newWeight,
    });
    setChoices(newChoices);
    setChoiceInputValues((prev) => ({
      ...prev,
      [newChoices.length - 1]: newWeight.toFixed(parseInt(weightGranularity)),
    }));
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) return;

    const newChoices = choices.filter((_, i) => i !== index);
    setChoices(newChoices);

    // Update input values, removing the deleted index and shifting others down
    const newInputValues: Record<number, string> = {};
    let oldIndex = 0;
    for (let i = 0; i < choices.length; i++) {
      if (i !== index) {
        newInputValues[oldIndex] =
          choiceInputValues[i] ||
          choices[i].weight.toFixed(parseInt(weightGranularity));
        oldIndex++;
      }
    }
    setChoiceInputValues(newInputValues);
  };

  const updateChoiceName = (index: number, name: string) => {
    const newChoices = [...choices];
    newChoices[index].name = name;
    setChoices(newChoices);
  };

  const updateChoiceWeight = (index: number, newWeight: number) => {
    const newChoices = [...choices];
    newChoices[index].weight = newWeight;
    setChoices(newChoices);
  };

  const isValidMultiChoice = () => {
    return (
      choices.length >= 2 &&
      choices.every((c) => c.name.trim().length > 0) &&
      choices.every((c) => c.weight >= 0.01) &&
      choices.reduce((sum, c) => sum + c.weight, 0) === 100
    );
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
              {createMutation.isError && (
                <div className="p-3 rounded-lg bg-[oklch(0.54_0.19_29.2)]/10 text-[oklch(0.54_0.19_29.2)] border border-[oklch(0.54_0.19_29.2)]/20 text-sm">
                  {createMutation.error?.message?.includes("should be greater than or equal to 0.01")
                    ? "All weights must be at least 0.01%. Please adjust your weights."
                    : "Failed to create decision. Please try again."}
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[oklch(0.51_0.077_74.3)]">Type</Label>
                <div className="flex gap-2">
                  <Badge
                    className={
                      decisionType === "binary"
                        ? "badge-active cursor-pointer"
                        : "cursor-pointer bg-[oklch(0.88_0.035_83.6)] text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.84_0.045_83.6)]"
                    }
                    onClick={() => setDecisionType("binary")}
                  >
                    Yes/No Decision
                  </Badge>
                  <Badge
                    className={
                      decisionType === "multi_choice"
                        ? "badge-active cursor-pointer"
                        : "cursor-pointer bg-[oklch(0.88_0.035_83.6)] text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.84_0.045_83.6)]"
                    }
                    onClick={() => setDecisionType("multi_choice")}
                  >
                    Multi-choice
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-[oklch(0.51_0.077_74.3)]"
                >
                  Title *
                </Label>
                <Input
                  id="title"
                  placeholder={
                    decisionType === "binary"
                      ? "e.g., Eat meat today?"
                      : "e.g., What to eat for lunch?"
                  }
                  {...register("title")}
                  className={`border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)] ${
                    errors.title ? "border-[oklch(0.75_0.12_20)]" : ""
                  }`}
                />
                {errors.title && (
                  <p className="text-sm text-[oklch(0.75_0.12_20)]">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {decisionType === "binary" ? (
                <>
                  {/* Binary Decision Fields */}
                  <div className="space-y-3">
                    <Label className="flex items-center justify-between text-[oklch(0.51_0.077_74.3)]">
                      <span>Probability</span>
                      <span className="font-bold text-[oklch(0.71_0.097_111.7)]">
                        {probability[0].toFixed(
                          parseInt(probabilityGranularity),
                        )}
                        %
                      </span>
                    </Label>
                    <Slider
                      value={probability}
                      onValueChange={setProbability}
                      max={probabilityGranularity === "0" ? 99 : 99.99}
                      min={probabilityGranularity === "0" ? 1 : 0.01}
                      step={
                        probabilityGranularity === "0"
                          ? 1
                          : probabilityGranularity === "1"
                            ? 0.1
                            : 0.01
                      }
                      className="cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-[oklch(0.61_0.077_74.3)]">
                      <span>
                        {probabilityGranularity === "0" ? "1%" : "0.01%"}
                      </span>
                      <span>
                        {probabilityGranularity === "0" ? "99%" : "99.99%"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[oklch(0.51_0.077_74.3)]">
                      Precision
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={probabilityGranularity}
                      onValueChange={(value) =>
                        value && setProbabilityGranularity(value)
                      }
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
                      You can change this later.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="yes_text"
                        className="text-[oklch(0.51_0.077_74.3)]"
                      >
                        Yes Option *
                      </Label>
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
                      <Label
                        htmlFor="no_text"
                        className="text-[oklch(0.51_0.077_74.3)]"
                      >
                        No Option *
                      </Label>
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
                </>
              ) : (
                <>
                  {/* Multi-choice Decision Fields */}
                  <div className="space-y-3">
                    <Label className="text-[oklch(0.51_0.077_74.3)]">
                      Choice Options
                    </Label>
                    <div className="space-y-2">
                      {choices.map((choice, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={choice.name}
                            onChange={(e) =>
                              updateChoiceName(index, e.target.value)
                            }
                            className="flex-1 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              min="0.01"
                              max="100"
                              value={choiceInputValues[index] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow typing numbers and decimals
                                if (/^\d*\.?\d*$/.test(value) || value === "") {
                                  setChoiceInputValues((prev) => ({
                                    ...prev,
                                    [index]: value,
                                  }));

                                  // Update the actual weight only if it's a valid number
                                  const numValue = parseFloat(value);
                                  if (
                                    !isNaN(numValue) &&
                                    numValue >= 0.01 &&
                                    numValue <= 100
                                  ) {
                                    updateChoiceWeight(index, numValue);
                                  } else if (
                                    value === "" ||
                                    value === "0" ||
                                    value === "0."
                                  ) {
                                    // Allow typing intermediate values but set weight to minimum
                                    updateChoiceWeight(index, 0.01);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // On blur, just format the value without redistribution
                                const value = parseFloat(e.target.value) || 0;
                                const step =
                                  weightGranularity === "0"
                                    ? 1
                                    : weightGranularity === "1"
                                      ? 0.1
                                      : 0.01;
                                const rounded = Math.round(value / step) * step;
                                const maxWeight = 100; // Allow any value up to 100
                                // Enforce minimum weight of 0.01
                                const minWeight = 0.01;
                                const clamped = Math.max(
                                  minWeight,
                                  Math.min(maxWeight, rounded),
                                );

                                // Update weight and format display
                                updateChoiceWeight(index, clamped);
                                setChoiceInputValues((prev) => ({
                                  ...prev,
                                  [index]: clamped.toFixed(
                                    parseInt(weightGranularity),
                                  ),
                                }));
                              }}
                              className="w-20 text-center border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                            />
                            <span className="text-sm text-[oklch(0.51_0.077_74.3)]">
                              %
                            </span>
                          </div>
                          {choices.length > 2 && (
                            <Button
                              type="button"
                              onClick={() => removeChoice(index)}
                              size="sm"
                              variant="outline"
                              className="px-2 border-2 border-[oklch(0.74_0.063_80.8)] hover:bg-[oklch(0.94_0.08_20)] hover:border-[oklch(0.75_0.12_20)] hover:text-[oklch(0.75_0.12_20)]"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <Button
                          type="button"
                          onClick={addChoice}
                          size="sm"
                          variant="outline"
                          className="text-sm border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] text-[oklch(0.41_0.077_78.9)] hover:bg-[oklch(0.88_0.035_83.6)]"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Option
                        </Button>
                      </div>
                    </div>
                    {(() => {
                      const total = choices.reduce(
                        (sum, c) => sum + c.weight,
                        0,
                      );
                      const hasEmptyNames = choices.some(
                        (c) => c.name.trim().length === 0,
                      );
                      const hasZeroWeights = choices.some(
                        (c) => c.weight < 0.01,
                      );
                      return (
                        <>
                          {total !== 100 && (
                            <p className="text-xs text-[oklch(0.61_0.077_74.3)]">
                              Current total:{" "}
                              {total.toFixed(parseInt(weightGranularity))}%
                              (must equal 100%)
                            </p>
                          )}
                          {hasEmptyNames && (
                            <p className="text-xs text-[oklch(0.75_0.12_20)]">
                              All options must have names
                            </p>
                          )}
                          {hasZeroWeights && (
                            <p className="text-xs text-[oklch(0.75_0.12_20)]">
                              All weights must be at least 0.01%
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[oklch(0.51_0.077_74.3)]">
                      Precision
                    </Label>
                    <ToggleGroup
                      type="single"
                      value={weightGranularity}
                      onValueChange={(value) => {
                        if (value) {
                          setWeightGranularity(value);
                          // Update input values to match new precision
                          const newInputValues: Record<number, string> = {};
                          choices.forEach((choice, index) => {
                            newInputValues[index] = choice.weight.toFixed(
                              parseInt(value),
                            );
                          });
                          setChoiceInputValues(newInputValues);
                        }
                      }}
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
                  </div>
                </>
              )}

              {/* Cooldown Configuration */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[oklch(0.51_0.077_74.3)]">
                  <Clock className="w-4 h-4" />
                  Cooldown
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={cooldownValue}
                    onChange={(e) =>
                      setCooldownValue(
                        Math.max(
                          0,
                          Math.min(100, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                    placeholder="0"
                    className="flex-1 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]"
                  />
                  <Select
                    value={cooldownUnit}
                    onValueChange={(value) =>
                      setCooldownUnit(value as "minutes" | "hours" | "days")
                    }
                  >
                    <SelectTrigger className="w-24 border-2 border-[oklch(0.74_0.063_80.8)] bg-[oklch(0.96_0.025_83.6)] focus:border-[oklch(0.71_0.097_111.7)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[oklch(0.96_0.025_83.6)] border-2 border-[oklch(0.74_0.063_80.8)]">
                      <SelectItem
                        value="minutes"
                        className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]"
                      >
                        min
                      </SelectItem>
                      <SelectItem
                        value="hours"
                        className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]"
                      >
                        hrs
                      </SelectItem>
                      <SelectItem
                        value="days"
                        className="cursor-pointer hover:bg-[oklch(0.88_0.035_83.6)]"
                      >
                        days
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-[oklch(0.61_0.077_74.3)]">
                  Time you must wait between rolls after confirming (0 = no
                  cooldown)
                </p>
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
                  disabled={
                    createMutation.isPending ||
                    (decisionType === "multi_choice" && !isValidMultiChoice())
                  }
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
