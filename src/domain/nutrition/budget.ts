import { z } from "zod";

const reference = z.string().trim().min(1).max(128);
const moneyCents = z.number().int().nonnegative().max(10_000_000_000);
const quantity = z.number().int().positive().max(100_000);

export const budgetLineSchema = z.object({
  id: reference,
  label: z.string().trim().min(1).max(180),
  quantity,
  unitPriceCents: moneyCents,
});

export type BudgetLine = z.infer<typeof budgetLineSchema>;

export const budgetPlanInputSchema = z.object({
  lines: z.array(budgetLineSchema).max(200),
  monthlyBudgetCents: moneyCents,
});

export type BudgetPlanInput = z.infer<typeof budgetPlanInputSchema>;

export type BudgetPlan = Readonly<{
  dailyReferenceCents: number;
  isWithinBudget: boolean;
  monthlyBudgetCents: number;
  remainingCents: number;
  totalCents: number;
  weeklyReferenceCents: number;
}>;

function assertSafeCents(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error("O total do orçamento excede o limite seguro de cálculo.");
  }

  return value;
}

/**
 * Prices and budgets are strictly integer cents. Daily and weekly references
 * intentionally use floor division so the domain never fabricates fractional
 * cent values; the remaining cents continue in the monthly balance.
 */
export function calculateBudgetPlan(input: BudgetPlanInput): BudgetPlan {
  const parsed = budgetPlanInputSchema.parse(input);
  const totalCents = assertSafeCents(
    parsed.lines.reduce(
      (current, line) => assertSafeCents(current + line.unitPriceCents * line.quantity),
      0,
    ),
  );
  const remainingCents = assertSafeCents(parsed.monthlyBudgetCents - totalCents);

  return {
    dailyReferenceCents: Math.floor(parsed.monthlyBudgetCents / 30),
    isWithinBudget: remainingCents >= 0,
    monthlyBudgetCents: parsed.monthlyBudgetCents,
    remainingCents,
    totalCents,
    weeklyReferenceCents: Math.floor(parsed.monthlyBudgetCents / 4),
  };
}
