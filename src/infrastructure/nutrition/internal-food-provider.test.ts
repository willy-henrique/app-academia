import { describe, expect, it } from "vitest";

import {
  createInternalFoodProvider,
  InternalFoodProvider,
  internalFoods,
} from "./internal-food-provider";

describe("internal food provider", () => {
  it("exposes a local curated fallback without external credentials", async () => {
    const provider = new InternalFoodProvider();

    const foods = await provider.list();

    expect(foods).toHaveLength(internalFoods.length);
    expect(foods.every((food) => food.source.provider === "INTERNAL")).toBe(true);
    expect(foods.every((food) => food.source.confidence === "ESTIMATED")).toBe(true);
  });

  it("finds food by id and normalized Portuguese aliases", async () => {
    const provider = createInternalFoodProvider();

    await expect(provider.getById(" chicken-breast-grilled ")).resolves.toMatchObject({
      name: "Peito de frango grelhado",
    });
    await expect(provider.search("FEIJAO")).resolves.toMatchObject([{ id: "beans-cooked" }]);
    await expect(provider.search("ovo", { limit: 1 })).resolves.toMatchObject([
      { id: "egg-whole" },
    ]);
  });

  it("keeps empty searches bounded and rejects unsafe limits", async () => {
    const provider = createInternalFoodProvider();

    await expect(provider.search("   ")).resolves.toEqual([]);
    await expect(provider.search("arroz", { limit: 0 })).rejects.toThrow(/entre 1 e 50/);
  });
});
