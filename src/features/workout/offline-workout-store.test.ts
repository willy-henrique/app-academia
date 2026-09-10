// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { buildWorkoutSetDocumentId, saveWorkoutSession, saveWorkoutSet, workoutSetExists } =
  vi.hoisted(() => ({
    buildWorkoutSetDocumentId: vi.fn(),
    saveWorkoutSession: vi.fn(),
    saveWorkoutSet: vi.fn(),
    workoutSetExists: vi.fn(),
  }));

vi.mock("./workout-repository", () => ({
  buildWorkoutSetDocumentId,
  saveWorkoutSession,
  saveWorkoutSet,
  workoutSetExists,
}));

import { createDefaultOnboardingDraft } from "@/domain/onboarding/onboarding";
import type { WorkoutSet } from "@/domain/workout/session";

import {
  clearActiveWorkoutSession,
  flushPendingWorkoutSets,
  getWorkoutSyncStatus,
  loadActiveWorkoutSession,
  persistActiveWorkoutSession,
  reconcileWorkoutQueue,
  saveWorkoutSetWithOfflineFallback,
} from "./offline-workout-store";
import { createWorkoutInit } from "./workout-flow";

const draft = {
  ...createDefaultOnboardingDraft(),
  routine: { daysPerWeek: 3, sessionMinutes: 30 },
};
const { session } = createWorkoutInit("alice", draft);

const set: WorkoutSet = {
  completedAt: "2026-09-09T12:00:00.000Z",
  createdAt: "2026-09-09T12:00:00.000Z",
  exerciseId: "bench-press",
  feedback: null,
  loadKg: 60,
  notes: null,
  reps: 10,
  rir: 2,
  sessionId: session.id,
  setIndex: 1,
  uid: "alice",
};

const offlineError = Object.assign(new Error("offline"), { code: "unavailable" });

describe("offline workout store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    buildWorkoutSetDocumentId.mockReturnValue("bench-press-1-2026-09-09T12:00:00.000Z");
    saveWorkoutSession.mockResolvedValue(session);
  });

  it("keeps the active session on the device", () => {
    persistActiveWorkoutSession(session);
    expect(loadActiveWorkoutSession()?.id).toBe(session.id);

    clearActiveWorkoutSession();
    expect(loadActiveWorkoutSession()).toBeNull();
  });

  it("queues a set when the network fails and reports the pending count", async () => {
    saveWorkoutSet.mockRejectedValueOnce(offlineError);

    await expect(saveWorkoutSetWithOfflineFallback("alice", session, set)).resolves.toEqual({
      pendingCount: 1,
      state: "PENDING",
      status: "QUEUED",
    });
    expect(getWorkoutSyncStatus()).toEqual({ pendingCount: 1, state: "PENDING" });
  });

  it("never queues the same set twice", async () => {
    saveWorkoutSet.mockRejectedValue(offlineError);

    await saveWorkoutSetWithOfflineFallback("alice", session, set);
    await saveWorkoutSetWithOfflineFallback("alice", session, set);

    expect(getWorkoutSyncStatus().pendingCount).toBe(1);
  });

  it("does not rewrite a set the server already confirmed", async () => {
    saveWorkoutSet.mockRejectedValueOnce(offlineError);
    await saveWorkoutSetWithOfflineFallback("alice", session, set);

    saveWorkoutSet.mockClear();
    workoutSetExists.mockResolvedValue(true);

    await expect(flushPendingWorkoutSets()).resolves.toEqual({
      pendingCount: 0,
      state: "SYNCED",
      syncedCount: 1,
    });
    expect(saveWorkoutSet).not.toHaveBeenCalled();
  });

  it("sends the queued set once the connection returns", async () => {
    saveWorkoutSet.mockRejectedValueOnce(offlineError);
    await saveWorkoutSetWithOfflineFallback("alice", session, set);

    workoutSetExists.mockResolvedValue(false);
    saveWorkoutSet.mockResolvedValue(undefined);

    await expect(flushPendingWorkoutSets()).resolves.toMatchObject({
      pendingCount: 0,
      syncedCount: 1,
    });
    expect(saveWorkoutSet).toHaveBeenLastCalledWith("alice", session, set);
  });

  it("keeps the set queued while the connection is still failing", async () => {
    saveWorkoutSet.mockRejectedValue(offlineError);
    await saveWorkoutSetWithOfflineFallback("alice", session, set);

    workoutSetExists.mockRejectedValue(offlineError);

    await expect(flushPendingWorkoutSets()).resolves.toMatchObject({
      pendingCount: 1,
      syncedCount: 0,
    });
  });

  it("reconciles the queue against what the server already has", async () => {
    saveWorkoutSet.mockRejectedValueOnce(offlineError);
    await saveWorkoutSetWithOfflineFallback("alice", session, set);

    expect(reconcileWorkoutQueue(["bench-press-1-2026-09-09T12:00:00.000Z"])).toEqual({
      pendingCount: 0,
      state: "SYNCED",
    });
  });
});
