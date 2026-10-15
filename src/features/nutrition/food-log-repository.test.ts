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

import { createFoodLogEntry } from "@/domain/nutrition/food-log";

import { createFoodLogEntryRequest, listFoodLogEntries } from "./food-log-repository";

const food = {
  aliases: [],
  barcode: null,
  brand: null,
  defaultServing: { amount: 1, grams: 120, label: "1 filé médio", unit: "UNIT" as const },
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
    confidence: "ESTIMATED" as const,
    license: null,
    provider: "INTERNAL" as const,
    sourceId: null,
    url: null,
  },
};

describe("food log repository", () => {
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

  it("writes a validated entry only under the signed-in owner's path", async () => {
    const entry = createFoodLogEntry({ food, id: "food-log-1", ownerUid: "alice" });

    await expect(createFoodLogEntryRequest(entry)).resolves.toEqual(entry);

    expect(setDoc).toHaveBeenCalledWith(
      "foodLogs/alice/entries/food-log-1",
      expect.objectContaining({
        createdAt: "server-time",
        ownerUid: "alice",
        updatedAt: "server-time",
      }),
    );
  });

  it("does not allow a client to write a food entry for somebody else", async () => {
    const entry = createFoodLogEntry({ food, id: "food-log-1", ownerUid: "bob" });

    await expect(createFoodLogEntryRequest(entry)).rejects.toThrow("própria alimentação");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("queries a bounded private history and ignores malformed entries", async () => {
    const entry = createFoodLogEntry({ food, id: "food-log-1", ownerUid: "alice" });
    getDocs.mockResolvedValue({
      docs: [{ data: () => entry }, { data: () => ({ invalid: true }) }],
    });

    await expect(listFoodLogEntries("alice", 8)).resolves.toEqual([entry]);
    expect(orderBy).toHaveBeenCalledWith("consumedAt", "desc");
    expect(limit).toHaveBeenCalledWith(8);
  });

  it("never queries another person's private history", async () => {
    await expect(listFoodLogEntries("bob")).rejects.toThrow("próprio diário alimentar");
    expect(getDocs).not.toHaveBeenCalled();
  });
});
