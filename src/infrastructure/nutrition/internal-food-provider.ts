import type { Food } from "@/domain/nutrition/food";
import {
  normalizeFoodSearchText,
  resolveFoodSearchLimit,
  type FoodProvider,
  type FoodSearchOptions,
} from "@/application/nutrition/food-provider";

const curatedFoodSource = {
  attribution: "Catálogo alimentar interno do WillTreino",
  collectedAt: null,
  confidence: "ESTIMATED" as const,
  license: null,
  provider: "INTERNAL" as const,
  sourceId: null,
  url: null,
};

/**
 * A deliberately small catalog keeps the product usable before any external
 * source is approved. Nutritional values remain explicitly approximate.
 */
export const internalFoods: readonly Food[] = [
  {
    aliases: ["arroz", "arroz cozido", "rice"],
    barcode: null,
    brand: null,
    defaultServing: { amount: 4, grams: 100, label: "4 colheres de sopa", unit: "TABLESPOON" },
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
    source: curatedFoodSource,
  },
  {
    aliases: ["feijao", "feijão cozido", "carioca"],
    barcode: null,
    brand: null,
    defaultServing: { amount: 1, grams: 86, label: "1 concha média", unit: "UNIT" },
    id: "beans-cooked",
    name: "Feijão carioca cozido",
    nutritionPer100g: {
      carbohydratesGrams: 13.6,
      energyKcal: 76,
      fatGrams: 0.5,
      fiberGrams: 8.5,
      proteinGrams: 4.8,
      sodiumMilligrams: 1,
    },
    source: curatedFoodSource,
  },
  {
    aliases: ["frango", "peito de frango", "chicken"],
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
    source: curatedFoodSource,
  },
  {
    aliases: ["banana prata", "banana nanica"],
    barcode: null,
    brand: null,
    defaultServing: { amount: 1, grams: 86, label: "1 unidade média", unit: "UNIT" },
    id: "banana-fresh",
    name: "Banana fresca",
    nutritionPer100g: {
      carbohydratesGrams: 22.8,
      energyKcal: 89,
      fatGrams: 0.3,
      fiberGrams: 2.6,
      proteinGrams: 1.1,
      sodiumMilligrams: 1,
    },
    source: curatedFoodSource,
  },
  {
    aliases: ["ovo", "ovo de galinha", "egg"],
    barcode: null,
    brand: null,
    defaultServing: { amount: 1, grams: 50, label: "1 unidade grande", unit: "UNIT" },
    id: "egg-whole",
    name: "Ovo de galinha inteiro",
    nutritionPer100g: {
      carbohydratesGrams: 1.1,
      energyKcal: 143,
      fatGrams: 9.5,
      fiberGrams: null,
      proteinGrams: 12.6,
      sodiumMilligrams: 142,
    },
    source: curatedFoodSource,
  },
];

export class InternalFoodProvider implements FoodProvider {
  constructor(private readonly foods: readonly Food[] = internalFoods) {}

  async getById(id: string): Promise<Food | null> {
    const normalizedId = id.trim();
    return this.foods.find((food) => food.id === normalizedId) ?? null;
  }

  async list(): Promise<readonly Food[]> {
    return [...this.foods];
  }

  async search(query: string, options: FoodSearchOptions = {}): Promise<readonly Food[]> {
    const normalizedQuery = normalizeFoodSearchText(query);
    const limit = resolveFoodSearchLimit(options.limit);
    if (normalizedQuery.length === 0) {
      return [];
    }

    return this.foods
      .filter((food) => {
        const searchable = [food.name, food.brand, ...food.aliases]
          .filter((value): value is string => value !== null)
          .map(normalizeFoodSearchText);
        return searchable.some((value) => value.includes(normalizedQuery));
      })
      .slice(0, limit);
  }
}

export function createInternalFoodProvider(foods: readonly Food[] = internalFoods): FoodProvider {
  return new InternalFoodProvider(foods);
}
