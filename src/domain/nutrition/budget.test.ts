import { describe, expect, it } from "vitest";

import { calculateBudgetPlan } from "./budget";

describe("nutrition budget", () => {
  it("calculates a basket and references with integer cents only", () => {
    const plan = calculateBudgetPlan({
      lines: [
        { id: "rice", label: "Arroz", quantity: 2, unitPriceCents: 1299 },
        { id: "beans", label: "Feijão", quantity: 1, unitPriceCents: 899 },
      ],
      monthlyBudgetCents: 60000,
    });

    expect(plan).toEqual({
      dailyReferenceCents: 2000,
      isWithinBudget: true,
      monthlyBudgetCents: 60000,
      remainingCents: 56503,
      totalCents: 3497,
      weeklyReferenceCents: 15000,
    });
    expect(Number.isInteger(plan.totalCents)).toBe(true);
  });

  it("surfaces an over-budget basket without clamping the deficit", () => {
    const plan = calculateBudgetPlan({
      lines: [{ id: "protein", label: "Proteína", quantity: 3, unitPriceCents: 2500 }],
      monthlyBudgetCents: 5000,
    });

    expect(plan.isWithinBudget).toBe(false);
    expect(plan.remainingCents).toBe(-2500);
  });

  it("rejects fractional cents and quantities", () => {
    expect(() =>
      calculateBudgetPlan({
        lines: [{ id: "rice", label: "Arroz", quantity: 1.5, unitPriceCents: 1299.5 }],
        monthlyBudgetCents: 60000,
      }),
    ).toThrow();
  });
});
