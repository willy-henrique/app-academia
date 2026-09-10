import type { Food } from "@/domain/nutrition/food";

export type FoodSearchOptions = Readonly<{
  limit?: number;
}>;

export interface FoodProvider {
  getById(id: string): Promise<Food | null>;
  list(): Promise<readonly Food[]>;
  search(query: string, options?: FoodSearchOptions): Promise<readonly Food[]>;
}

export function normalizeFoodSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

export function resolveFoodSearchLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return 20;
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("O limite de alimentos deve estar entre 1 e 50.");
  }

  return limit;
}
