import { beforeEach, describe, expect, it, vi } from "vitest";

const { doc, getDoc, getFirebaseClientServices, serverTimestamp, setDoc } = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { createDefaultOnboardingDraft } from "@/domain/onboarding/onboarding";
import { createWorkoutInit } from "@/features/workout/workout-flow";

import { loadWorkoutSession, saveWorkoutSession, saveWorkoutSet } from "./workout-repository";

describe("workout repository", () => {
  beforeEach(() => {
    doc.mockReset();
    getDoc.mockReset();
    getFirebaseClientServices.mockReset();
    serverTimestamp.mockReset();
    setDoc.mockReset();
  });

  it("loads the active workout session from the private profile pointer", async () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      equipment: ["bodyweight", "mat"],
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };
    const { session } = createWorkoutInit("alice", draft);

    getFirebaseClientServices.mockReturnValue({ firestore: "firestore" });
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    getDoc
      .mockResolvedValueOnce({
        data: () => ({
          activeWorkoutPlanId: session.planId,
          activeWorkoutSessionId: session.id,
          birthDate: null,
          locale: "pt-BR",
          onboarding: createDefaultOnboardingDraft(),
          onboardingVersion: 1,
          preferences: {
            simplifiedMode: false,
            weekStartsOn: "monday",
          },
          timezone: "America/Sao_Paulo",
        }),
        exists: () => true,
      })
      .mockResolvedValueOnce({
        data: () => session,
        exists: () => true,
      });

    await expect(loadWorkoutSession("alice")).resolves.toMatchObject({
      id: session.id,
      ownerUid: "alice",
    });
  });

  it("persists the session and private active pointers", async () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      equipment: ["bodyweight", "mat"],
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };
    const { session } = createWorkoutInit("alice", draft);

    getFirebaseClientServices.mockReturnValue({ firestore: "firestore" });
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    serverTimestamp.mockReturnValue("server-timestamp");

    await expect(saveWorkoutSession("alice", session)).resolves.toMatchObject({
      id: session.id,
    });

    expect(setDoc).toHaveBeenCalledWith(
      `firestore/workoutSessions/${session.id}`,
      expect.objectContaining({
        id: session.id,
        ownerUid: "alice",
        planId: session.planId,
      }),
      { merge: true },
    );
    expect(setDoc).toHaveBeenCalledWith(
      "firestore/privateProfiles/alice",
      expect.objectContaining({
        activeWorkoutSessionId: session.id,
        activeWorkoutPlanId: session.planId,
      }),
      { merge: true },
    );
  });

  it("writes a set record with stable ownership", async () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      equipment: ["bodyweight", "mat"],
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };
    const { session } = createWorkoutInit("alice", draft);

    getFirebaseClientServices.mockReturnValue({ firestore: "firestore" });
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    serverTimestamp.mockReturnValue("server-timestamp");

    await saveWorkoutSet("alice", session, {
      completedAt: "2026-09-02T12:00:00.000Z",
      createdAt: "2026-09-02T12:00:00.000Z",
      exerciseId: session.exerciseQueue[0].exerciseId,
      feedback: null,
      loadKg: 40,
      notes: null,
      reps: 10,
      rir: 2,
      sessionId: session.id,
      setIndex: 1,
      uid: "alice",
    });

    expect(setDoc).toHaveBeenCalledWith(
      `firestore/workoutSessions/${session.id}/sets/${session.currentWorkoutExerciseId}-1-2026-09-02T12:00:00.000Z`,
      expect.objectContaining({
        uid: "alice",
        sessionId: session.id,
      }),
      { merge: true },
    );
  });
});
