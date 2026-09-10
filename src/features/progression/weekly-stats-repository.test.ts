import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirebaseClientServices,
  httpsCallable,
  limit,
  orderBy,
  query,
} = vi.hoisted(() => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  httpsCallable: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import {
  listWeeklyStatsHistory,
  loadWeekPreferences,
  loadWeeklyStats,
  recordWorkoutCompletionRequest,
} from "./weekly-stats-repository";

const weeklyStats = {
  cardioSessions: 0,
  completedWorkouts: 2,
  extraWorkouts: 1,
  groupWorkouts: 1,
  plannedTarget: 3,
  plannedWorkouts: 1,
  soloWorkouts: 1,
  timeZone: "America/Sao_Paulo",
  totalReps: 100,
  totalSets: 12,
  totalVolumeKg: 2400,
  uid: "alice",
  weekKey: "2026-09-07",
  weekStartsOn: "monday" as const,
};

describe("weekly stats repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    collection.mockImplementation((...parts: string[]) => parts.join("/"));
    query.mockImplementation((path: string) => path);
    getFirebaseClientServices.mockReturnValue({ firestore: "firestore", functions: "functions" });
  });

  it("reads only the own weekly projection document", async () => {
    getDoc.mockResolvedValue({ data: () => weeklyStats, exists: () => true });

    await expect(loadWeeklyStats("alice", "2026-09-07")).resolves.toMatchObject({
      completedWorkouts: 2,
      weekKey: "2026-09-07",
    });
    expect(getDoc).toHaveBeenCalledWith("firestore/weeklyStats/alice/weeks/2026-09-07");
  });

  it("returns null for a week that has no projection yet", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    await expect(loadWeeklyStats("alice", "2026-09-14")).resolves.toBeNull();
  });

  it("reads the week configuration from the private profile", async () => {
    getDoc.mockResolvedValue({
      data: () => ({
        onboarding: { routine: { daysPerWeek: 4 } },
        preferences: { weekStartsOn: "sunday" },
        timezone: "America/Manaus",
      }),
      exists: () => true,
    });

    await expect(loadWeekPreferences("alice")).resolves.toEqual({
      plannedTarget: 4,
      timeZone: "America/Manaus",
      weekStartsOn: "sunday",
    });
  });

  it("falls back to the Brazilian default when the profile has no preference", async () => {
    getDoc.mockResolvedValue({ data: () => ({}), exists: () => true });

    await expect(loadWeekPreferences("alice")).resolves.toEqual({
      plannedTarget: 0,
      timeZone: "America/Sao_Paulo",
      weekStartsOn: "monday",
    });
  });

  it("lists a bounded page of previous weeks, newest first", async () => {
    getDocs.mockResolvedValue({
      docs: [{ data: () => weeklyStats }, { data: () => ({ broken: true }) }],
    });

    await expect(listWeeklyStatsHistory("alice", 8)).resolves.toHaveLength(1);
    expect(orderBy).toHaveBeenCalledWith("weekKey", "desc");
    expect(limit).toHaveBeenCalledWith(8);
  });

  it("delegates the completion credit to the callable", async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { credited: true, sessionId: "session-1", weekKey: "2026-09-07" },
    });
    httpsCallable.mockReturnValue(callable);

    await expect(recordWorkoutCompletionRequest("session-1")).resolves.toEqual({
      credited: true,
      sessionId: "session-1",
      weekKey: "2026-09-07",
    });
    expect(httpsCallable).toHaveBeenCalledWith("functions", "recordWorkoutCompletion");
    expect(callable).toHaveBeenCalledWith({ sessionId: "session-1" });
  });
});
