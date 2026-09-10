import { describe, expect, it } from "vitest";

import { estimateDefaultServingNutrition, estimateFoodNutrition, foodSchema } from "./food";

const chicken = {
  aliases: ["frango", "peito de frango"],
  barcode: null,
  brand: null,
  defaultServing: {
    amount: 1,
    grams: 120,
    label: "1 filé médio",
    unit: "UNIT",
  },
  id: "chicken-breast",
  name: "Peito de frango grelhado",
  nutritionPer100g: {
    carbohydratesGrams: 0,
    energyKcal: 165,
    fatGrams: 3.6,
    fiberGrams: null,
    proteinGrams: 31,
    sodiumMilligrams: 74,
  },
  source: {
    attribution: "Base alimentar curada WillTreino",
    collectedAt: "2026-09-09T12:00:00.000Z",
    confidence: "ESTIMATED",
    license: null,
    provider: "BRAZILIAN_CURATED",
    sourceId: "frango-001",
    url: null,
  },
};

describe("food domain", () => {
  it("models an approximate food with serving, macros and provenance", () => {
    const food = foodSchema.parse(chicken);

    expect(food.defaultServing.unit).toBe("UNIT");
    expect(food.source.provider).toBe("BRAZILIAN_CURATED");
    expect(food.source.confidence).toBe("ESTIMATED");
  });

  it("estimates a requested mass deterministically from nutrition per 100 g", () => {
    const nutrition = estimateFoodNutrition(foodSchema.parse(chicken), 150);

    expect(nutrition).toEqual({
      carbohydratesGrams: 0,
      energyKcal: 247.5,
      fatGrams: 5.4,
      fiberGrams: null,
      proteinGrams: 46.5,
      sodiumMilligrams: 111,
    });
  });

  it("returns the default serving estimate only when its mass is known", () => {
    expect(estimateDefaultServingNutrition(foodSchema.parse(chicken))).toMatchObject({
      energyKcal: 198,
      proteinGrams: 37.2,
    });

    const unknownServingMass = foodSchema.parse({
      ...chicken,
      defaultServing: { amount: 1, grams: null, label: "1 unidade", unit: "UNIT" },
    });
    expect(estimateDefaultServingNutrition(unknownServingMass)).toBeNull();
  });

  it("rejects invalid macros, quantities and untraceable sources", () => {
    expect(() =>
      foodSchema.parse({
        ...chicken,
        nutritionPer100g: { ...chicken.nutritionPer100g, proteinGrams: -1 },
      }),
    ).toThrow();
    expect(() => estimateFoodNutrition(foodSchema.parse(chicken), 0)).toThrow();
    expect(() =>
      foodSchema.parse({
        ...chicken,
        source: { ...chicken.source, attribution: "" },
      }),
    ).toThrow();
  });
});
