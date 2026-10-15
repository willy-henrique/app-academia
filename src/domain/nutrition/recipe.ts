import { z } from "zod";

import {
  estimateFoodNutrition,
  foodDataConfidenceOptions,
  foodSourceProviderOptions,
  foodSchema,
  type Food,
} from "./food";

const reference = z.string().trim().min(1).max(128);
const recipeDecimal = z.number().finite().nonnegative().max(100_000);

export const recipeIngredientSchema = z.object({
  confidence: z.enum(foodDataConfidenceOptions),
  foodId: reference,
  foodName: z.string().trim().min(1).max(180),
  grams: z.number().finite().positive().max(100_000),
  sourceProvider: z.enum(foodSourceProviderOptions),
});

export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

export const recipeNutritionSchema = z.object({
  carbohydratesGrams: recipeDecimal,
  energyKcal: recipeDecimal,
  fatGrams: recipeDecimal,
  fiberGrams: recipeDecimal.nullable().default(null),
  proteinGrams: recipeDecimal,
  sodiumMilligrams: recipeDecimal.nullable().default(null),
});

export type RecipeNutrition = z.infer<typeof recipeNutritionSchema>;

export const recipeSchema = z.object({
  createdAt: z.unknown().optional(),
  estimatedNutritionPerServing: recipeNutritionSchema,
  id: reference,
  ingredients: z.array(recipeIngredientSchema).min(1).max(40),
  name: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(500).nullable().default(null),
  ownerUid: reference,
  servings: z.number().int().positive().max(100),
  updatedAt: z.unknown().optional(),
});

export type Recipe = z.infer<typeof recipeSchema>;

export type CreateRecipeInput = Readonly<{
  id: string;
  ingredients: readonly Readonly<{ food: Food; grams: number }>[];
  name: string;
  notes?: string | null;
  ownerUid: string;
  servings: number;
}>;

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/**
 * Builds a private recipe snapshot. It is an approximate arithmetic helper,
 * not a recommendation or a replacement for a registered nutritionist.
 */
export function createRecipe(input: CreateRecipeInput, now: Date = new Date()): Recipe {
  const servings = z.number().int().positive().max(100).parse(input.servings);
  const ingredients = input.ingredients.map(({ food: rawFood, grams }) => {
    const food = foodSchema.parse(rawFood);
    const portion = z.number().finite().positive().max(100_000).parse(grams);

    return {
      ingredient: {
        confidence: food.source.confidence,
        foodId: food.id,
        foodName: food.name,
        grams: portion,
        sourceProvider: food.source.provider,
      },
      nutrition: estimateFoodNutrition(food, portion),
    };
  });

  const totals = ingredients.reduce(
    (current, { nutrition }) => ({
      carbohydratesGrams: current.carbohydratesGrams + nutrition.carbohydratesGrams,
      energyKcal: current.energyKcal + nutrition.energyKcal,
      fatGrams: current.fatGrams + nutrition.fatGrams,
      fiberGrams:
        current.fiberGrams === null || nutrition.fiberGrams === null
          ? null
          : current.fiberGrams + nutrition.fiberGrams,
      proteinGrams: current.proteinGrams + nutrition.proteinGrams,
      sodiumMilligrams:
        current.sodiumMilligrams === null || nutrition.sodiumMilligrams === null
          ? null
          : current.sodiumMilligrams + nutrition.sodiumMilligrams,
    }),
    {
      carbohydratesGrams: 0,
      energyKcal: 0,
      fatGrams: 0,
      fiberGrams: 0 as number | null,
      proteinGrams: 0,
      sodiumMilligrams: 0 as number | null,
    },
  );

  return recipeSchema.parse({
    createdAt: now.toISOString(),
    estimatedNutritionPerServing: {
      carbohydratesGrams: round(totals.carbohydratesGrams / servings),
      energyKcal: round(totals.energyKcal / servings),
      fatGrams: round(totals.fatGrams / servings),
      fiberGrams: totals.fiberGrams === null ? null : round(totals.fiberGrams / servings),
      proteinGrams: round(totals.proteinGrams / servings),
      sodiumMilligrams:
        totals.sodiumMilligrams === null ? null : round(totals.sodiumMilligrams / servings),
    },
    id: input.id,
    ingredients: ingredients.map(({ ingredient }) => ingredient),
    name: input.name,
    notes: input.notes ?? null,
    ownerUid: input.ownerUid,
    servings,
    updatedAt: now.toISOString(),
  });
}
