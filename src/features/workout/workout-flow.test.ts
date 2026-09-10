import { describe, expect, it } from "vitest";

import { createDefaultOnboardingDraft } from "@/domain/onboarding/onboarding";

import {
  buildWorkoutGeneratorInput,
  createWorkoutInit,
  finishStrengthSession,
} from "./workout-flow";

describe("workout flow", () => {
  it("builds generator input from onboarding draft", () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      cardioPreference: "recommended" as const,
      equipment: ["bodyweight", "mat"],
      experience: "iniciante" as const,
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };

    const input = buildWorkoutGeneratorInput("alice", draft);

    expect(input.ownerUid).toBe("alice");
    expect(input.availableMinutes).toBe(30);
    expect(input.cardioStatus).toBe("recommended");
    expect(input.availableEquipment).toEqual(["bodyweight", "mat"]);
  });

  it("creates a started workout session from onboarding state", () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      equipment: ["bodyweight", "mat"],
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };

    const init = createWorkoutInit("alice", draft);

    expect(init.plan.ownerUid).toBe("alice");
    expect(init.session.status).toBe("ACTIVE");
    expect(init.session.planId).toBe(init.plan.id);
  });

  it("finishes strength work while resolving cardio status", () => {
    const draft = {
      ...createDefaultOnboardingDraft(),
      equipment: ["bodyweight", "mat"],
      goal: "saude" as const,
      routine: {
        daysPerWeek: 3,
        sessionMinutes: 30,
      },
    };

    const init = createWorkoutInit("alice", draft);
    const finished = finishStrengthSession(init.session, "SKIPPED");

    expect(finished.status).toBe("COMPLETED");
    expect(finished.optionalCardioStatus).toBe("SKIPPED");
    expect(finished.optionalCardioSkippedAt).toBeTruthy();
  });
});
