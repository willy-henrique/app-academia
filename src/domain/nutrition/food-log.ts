import { z } from "zod";

import {
  estimateFoodNutrition,
  foodDataConfidenceOptions,
  foodNutritionSchema,
  foodSourceProviderOptions,
  foodSchema,
  type Food,
} from "./food";

export const foodLogMealOptions = ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"] as const;

export type FoodLogMeal = (typeof foodLogMealOptions)[number];

const reference = z.string().trim().min(1).max(128);

export const foodLogFoodSnapshotSchema = z.object({
  confidence: z.enum(foodDataConfidenceOptions),
  foodId: reference,
  foodName: z.string().trim().min(1).max(180),
  servingLabel: z.string().trim().min(1).max(120),
  sourceProvider: z.enum(foodSourceProviderOptions),
});

export type FoodLogFoodSnapshot = z.infer<typeof foodLogFoodSnapshotSchema>;

export const foodLogEntrySchema = z.object({
  consumedAt: z.string().datetime(),
  createdAt: z.unknown().optional(),
  food: foodLogFoodSnapshotSchema,
  id: reference,
  meal: z.enum(foodLogMealOptions).default("OTHER"),
  notes: z.string().trim().max(500).nullable().default(null),
  nutrition: foodNutritionSchema,
  ownerUid: reference,
  portionGrams: z.number().finite().positive().max(100_000),
  updatedAt: z.unknown().optional(),
});

export type FoodLogEntry = z.infer<typeof foodLogEntrySchema>;

export type CreateFoodLogEntryInput = Readonly<{
  consumedAt?: Date;
  food: Food;
  id: string;
  meal?: FoodLogMeal;
  notes?: string | null;
  ownerUid: string;
  portionGrams?: number;
}>;

/**
 * Captures an immutable nutritional snapshot at the time the person logs food.
 * This is bookkeeping only: it does not prescribe a meal or validate health.
 */
export function createFoodLogEntry(
  input: CreateFoodLogEntryInput,
  now: Date = new Date(),
): FoodLogEntry {
  const food = foodSchema.parse(input.food);
  const portionGrams = input.portionGrams ?? food.defaultServing.grams;

  if (portionGrams === null) {
    throw new Error("Informe a quantidade em gramas para registrar esta porção.");
  }

  return foodLogEntrySchema.parse({
    consumedAt: (input.consumedAt ?? now).toISOString(),
    createdAt: now.toISOString(),
    food: {
      confidence: food.source.confidence,
      foodId: food.id,
      foodName: food.name,
      servingLabel: food.defaultServing.label,
      sourceProvider: food.source.provider,
    },
    id: input.id,
    meal: input.meal ?? "OTHER",
    notes: input.notes ?? null,
    nutrition: estimateFoodNutrition(food, portionGrams),
    ownerUid: input.ownerUid,
    portionGrams,
    updatedAt: now.toISOString(),
  });
}
