import { describe, expect, it } from "vitest";

import { evaluateGroupRest } from "./group-rest-engine";

describe("evaluateGroupRest", () => {
  it("counts a partner's set and station change as recovery instead of adding another full rest", () => {
    const state = evaluateGroupRest({
      equipmentTransitionSeconds: 15,
      estimatedSetDurationSeconds: 40,
      now: "2026-09-03T20:00:00.000Z",
      participantCount: 2,
      participantLastSetCompletedAt: {
        joao: "2026-09-03T19:58:00.000Z",
        willy: "2026-09-03T20:00:00.000Z",
      },
      participantUid: "willy",
      stationMode: "ROTATION_SHARED_STATION",
      targetRestSeconds: 90,
      weightChangeSeconds: 0,
    });

    expect(state.elapsedRecoverySeconds).toBe(0);
    expect(state.remainingRestSeconds).toBe(90);
    expect(state.estimatedInterveningRecoverySeconds).toBe(55);
    expect(state.estimatedRemainingRestAtNextTurnSeconds).toBe(35);
  });

  it("marks a three-person rotation ready when the other two turns already absorb the target", () => {
    const state = evaluateGroupRest({
      equipmentTransitionSeconds: 15,
      estimatedSetDurationSeconds: 40,
      now: "2026-09-03T20:00:00.000Z",
      participantCount: 3,
      participantLastSetCompletedAt: {
        joao: "2026-09-03T19:58:00.000Z",
        pedro: "2026-09-03T19:57:00.000Z",
        willy: "2026-09-03T20:00:00.000Z",
      },
      participantUid: "willy",
      stationMode: "ROTATION_SHARED_STATION",
      targetRestSeconds: 90,
      weightChangeSeconds: 0,
    });

    expect(state.estimatedInterveningRecoverySeconds).toBe(110);
    expect(state.estimatedRemainingRestAtNextTurnSeconds).toBe(0);
    expect(state.remainingRestSeconds).toBe(90);
  });

  it("uses elapsed timestamp recovery as the source of truth even after the app was backgrounded", () => {
    const state = evaluateGroupRest({
      equipmentTransitionSeconds: 15,
      estimatedSetDurationSeconds: 40,
      now: "2026-09-03T20:00:55.000Z",
      participantCount: 2,
      participantLastSetCompletedAt: {
        joao: "2026-09-03T19:58:00.000Z",
        willy: "2026-09-03T20:00:00.000Z",
      },
      participantUid: "willy",
      stationMode: "ROTATION_SHARED_STATION",
      targetRestSeconds: 90,
      weightChangeSeconds: 0,
    });

    expect(state.elapsedRecoverySeconds).toBe(55);
    expect(state.remainingRestSeconds).toBe(35);
    expect(state.restExpectedEndAt).toBe("2026-09-03T20:01:30.000Z");
    expect(state.status).toBe("RESTING");
  });

  it("does not invent waiting time for parallel or independent stations", () => {
    const state = evaluateGroupRest({
      equipmentTransitionSeconds: 15,
      estimatedSetDurationSeconds: 40,
      now: "2026-09-03T20:00:00.000Z",
      participantCount: 3,
      participantLastSetCompletedAt: {
        joao: "2026-09-03T19:58:00.000Z",
        pedro: "2026-09-03T19:57:00.000Z",
        willy: "2026-09-03T20:00:00.000Z",
      },
      participantUid: "willy",
      stationMode: "PARALLEL_SAME_EXERCISE",
      targetRestSeconds: 90,
      weightChangeSeconds: 0,
    });

    expect(state.estimatedInterveningRecoverySeconds).toBe(0);
    expect(state.estimatedRemainingRestAtNextTurnSeconds).toBe(90);
  });
});
