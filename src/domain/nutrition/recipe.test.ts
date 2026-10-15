import { describe, expect, it } from "vitest";

import { createRecipe } from "./recipe";

const chicken = {
  aliases: ["frango"],
  barcode: null,
  brand: null,
  defaultServing: { amount: 1, grams: 120, label: "1 filé médio", unit: "UNIT" as const },
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
    attribution: "Catálogo WillTreino",
    collectedAt: null,
    confidence: "ESTIMATED" as const,
    license: null,
    provider: "INTERNAL" as const,
    sourceId: null,
    url: null,
  },
};

const rice = {
  ...chicken,
  id: "rice-cooked",
  name: "Arroz cozido",
  nutritionPer100g: {
    carbohydratesGrams: 25.8,
    energyKcal: 128,
    fatGrams: 0.3,
    fiberGrams: 1.6,
    proteinGrams: 2.5,
    sodiumMilligrams: 1,
  },
};

describe("recipes", () => {
  it("snapshots ingredients and calculates approximate nutrition per serving", () => {
    const recipe = createRecipe(
      {
        id: "recipe-1",
        ingredients: [
          { food: chicken, grams: 120 },
          { food: rice, grams: 100 },
        ],
        name: "Frango com arroz",
        ownerUid: "alice",
        servings: 2,
      },
      new Date("2026-09-21T12:00:00.000Z"),
    );

    expect(recipe.ingredients).toEqual([
      expect.objectContaining({ foodId: "chicken-breast", grams: 120 }),
      expect.objectContaining({ foodId: "rice-cooked", grams: 100 }),
    ]);
    expect(recipe.estimatedNutritionPerServing).toEqual({
      carbohydratesGrams: 12.9,
      energyKcal: 163,
      fatGrams: 2.3,
      fiberGrams: null,
      proteinGrams: 19.9,
      sodiumMilligrams: 44.9,
    });
  });

  it("rejects an empty recipe and invalid portions", () => {
    expect(() =>
      createRecipe({
        id: "recipe-1",
        ingredients: [],
        name: "Vazia",
        ownerUid: "alice",
        servings: 1,
      }),
    ).toThrow();
    expect(() =>
      createRecipe({
        id: "recipe-1",
        ingredients: [{ food: chicken, grams: 0 }],
        name: "Inválida",
        ownerUid: "alice",
        servings: 1,
      }),
    ).toThrow();
  });
});
