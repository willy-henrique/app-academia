import { describe, expect, it } from "vitest";

import type { Food } from "./food";
import { createFoodLogEntry, foodLogEntrySchema } from "./food-log";

const food: Food = {
  aliases: ["frango"],
  barcode: null,
  brand: null,
  defaultServing: { amount: 1, grams: 120, label: "1 filé médio", unit: "UNIT" },
  id: "chicken-breast-grilled",
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
    attribution: "Catálogo alimentar interno do WillTreino",
    collectedAt: null,
    confidence: "ESTIMATED",
    license: null,
    provider: "INTERNAL",
    sourceId: null,
    url: null,
  },
};

describe("food log entry", () => {
  it("captures a private snapshot with deterministic nutrition", () => {
    const entry = createFoodLogEntry(
      {
        food,
        id: "log-1",
        meal: "LUNCH",
        notes: "Depois do treino",
        ownerUid: "alice",
      },
      new Date("2026-09-09T12:00:00.000Z"),
    );

    expect(entry).toMatchObject({
      consumedAt: "2026-09-09T12:00:00.000Z",
      food: {
        confidence: "ESTIMATED",
        foodId: "chicken-breast-grilled",
        foodName: "Peito de frango grelhado",
        sourceProvider: "INTERNAL",
      },
      meal: "LUNCH",
      nutrition: { energyKcal: 198, proteinGrams: 37.2 },
      ownerUid: "alice",
      portionGrams: 120,
    });
  });

  it("requires an explicit mass when the catalogue has no known serving mass", () => {
    const noMassFood: Food = {
      ...food,
      defaultServing: { amount: 1, grams: null, label: "1 porção", unit: "UNIT" },
    };

    expect(() => createFoodLogEntry({ food: noMassFood, id: "log-2", ownerUid: "alice" })).toThrow(
      /quantidade em gramas/,
    );
  });

  it("rejects an invalid snapshot instead of accepting malformed historical data", () => {
    expect(() =>
      foodLogEntrySchema.parse({
        consumedAt: "not-a-date",
        food: {},
        id: "log-3",
        nutrition: {},
        ownerUid: "alice",
        portionGrams: 0,
      }),
    ).toThrow();
  });
});
