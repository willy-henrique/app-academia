import { z } from "zod";

export const foodUnitOptions = [
  "GRAM",
  "MILLILITER",
  "UNIT",
  "TABLESPOON",
  "TEASPOON",
  "CUP",
  "SLICE",
  "SCOOP",
  "OTHER",
] as const;

export const foodSourceProviderOptions = [
  "INTERNAL",
  "OPEN_FOOD_FACTS",
  "USDA",
  "BRAZILIAN_CURATED",
] as const;

export const foodDataConfidenceOptions = ["VERIFIED", "ESTIMATED", "UNVERIFIED"] as const;

export type FoodUnit = (typeof foodUnitOptions)[number];
export type FoodSourceProvider = (typeof foodSourceProviderOptions)[number];
export type FoodDataConfidence = (typeof foodDataConfidenceOptions)[number];

const reference = z.string().trim().min(1).max(128);
const decimal = z.number().finite().nonnegative().max(100_000);

/**
 * Values are estimates for display and planning. They intentionally are not a
 * diagnosis, prescription or substitute for clinical nutrition guidance.
 */
export const foodNutritionSchema = z.object({
  carbohydratesGrams: decimal.max(100),
  energyKcal: decimal.max(1_000),
  fatGrams: decimal.max(100),
  fiberGrams: decimal.max(100).nullable().default(null),
  proteinGrams: decimal.max(100),
  sodiumMilligrams: decimal.max(20_000).nullable().default(null),
});

export type FoodNutrition = z.infer<typeof foodNutritionSchema>;

export const foodServingSchema = z.object({
  amount: z.number().finite().positive().max(10_000),
  grams: z.number().finite().positive().max(100_000).nullable().default(null),
  label: z.string().trim().min(1).max(120),
  unit: z.enum(foodUnitOptions),
});

export type FoodServing = z.infer<typeof foodServingSchema>;

export const foodSourceSchema = z.object({
  attribution: z.string().trim().min(1).max(280),
  collectedAt: z.string().datetime().nullable().default(null),
  confidence: z.enum(foodDataConfidenceOptions).default("UNVERIFIED"),
  license: z.string().trim().min(1).max(160).nullable().default(null),
  provider: z.enum(foodSourceProviderOptions),
  sourceId: reference.nullable().default(null),
  url: z.url().max(2_048).nullable().default(null),
});

export type FoodSource = z.infer<typeof foodSourceSchema>;

export const foodSchema = z.object({
  aliases: z.array(z.string().trim().min(1).max(120)).max(40).default([]),
  barcode: z.string().trim().min(8).max(32).nullable().default(null),
  brand: z.string().trim().min(1).max(120).nullable().default(null),
  createdAt: z.unknown().optional(),
  defaultServing: foodServingSchema,
  id: reference,
  name: z.string().trim().min(1).max(180),
  nutritionPer100g: foodNutritionSchema,
  source: foodSourceSchema,
  updatedAt: z.unknown().optional(),
});

export type Food = z.infer<typeof foodSchema>;

export const foodPortionSchema = z.object({
  foodId: reference,
  grams: z.number().finite().positive().max(100_000),
});

export type FoodPortion = z.infer<typeof foodPortionSchema>;

function roundNutrition(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/**
 * Produces a deterministic approximate nutrition estimate from the provider's
 * values per 100 g. Money and meal planning remain separate domains.
 */
export function estimateFoodNutrition(food: Food, grams: number): FoodNutrition {
  const safeFood = foodSchema.parse(food);
  const portion = foodPortionSchema.parse({ foodId: safeFood.id, grams });
  const multiplier = portion.grams / 100;

  return foodNutritionSchema.parse({
    carbohydratesGrams: roundNutrition(safeFood.nutritionPer100g.carbohydratesGrams * multiplier),
    energyKcal: roundNutrition(safeFood.nutritionPer100g.energyKcal * multiplier),
    fatGrams: roundNutrition(safeFood.nutritionPer100g.fatGrams * multiplier),
    fiberGrams:
      safeFood.nutritionPer100g.fiberGrams === null
        ? null
        : roundNutrition(safeFood.nutritionPer100g.fiberGrams * multiplier),
    proteinGrams: roundNutrition(safeFood.nutritionPer100g.proteinGrams * multiplier),
    sodiumMilligrams:
      safeFood.nutritionPer100g.sodiumMilligrams === null
        ? null
        : roundNutrition(safeFood.nutritionPer100g.sodiumMilligrams * multiplier),
  });
}

export function estimateDefaultServingNutrition(food: Food): FoodNutrition | null {
  const safeFood = foodSchema.parse(food);
  if (safeFood.defaultServing.grams === null) {
    return null;
  }

  return estimateFoodNutrition(safeFood, safeFood.defaultServing.grams);
}
