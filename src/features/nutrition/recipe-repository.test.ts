import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  collection,
  doc,
  getDocs,
  getFirebaseClientServices,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
}));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import { createRecipe } from "@/domain/nutrition/recipe";

import { listRecipes, saveRecipe } from "./recipe-repository";

const food = {
  aliases: [],
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

function recipe(ownerUid = "alice") {
  return createRecipe({
    id: "recipe-1",
    ingredients: [{ food, grams: 120 }],
    name: "Frango grelhado",
    ownerUid,
    servings: 1,
  });
}

describe("recipe repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockImplementation((_firestore: string, ...parts: string[]) => parts.join("/"));
    doc.mockImplementation((path: string, id: string) => `${path}/${id}`);
    query.mockImplementation((path: string) => path);
    serverTimestamp.mockReturnValue("server-time");
    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: { uid: "alice" } },
      firestore: "firestore",
    });
  });

  it("writes a recipe only into the current user's collection", async () => {
    await expect(saveRecipe(recipe())).resolves.toMatchObject({ ownerUid: "alice" });
    expect(setDoc).toHaveBeenCalledWith(
      "recipes/alice/items/recipe-1",
      expect.objectContaining({ createdAt: "server-time", updatedAt: "server-time" }),
    );
  });

  it("refuses a recipe belonging to another user", async () => {
    await expect(saveRecipe(recipe("bob"))).rejects.toThrow("próprias receitas");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("returns only valid recipes from a bounded private query", async () => {
    const savedRecipe = recipe();
    getDocs.mockResolvedValue({
      docs: [{ data: () => savedRecipe }, { data: () => ({ invalid: true }) }],
    });

    await expect(listRecipes("alice", 8)).resolves.toEqual([savedRecipe]);
    expect(orderBy).toHaveBeenCalledWith("updatedAt", "desc");
    expect(limit).toHaveBeenCalledWith(8);
  });
});
