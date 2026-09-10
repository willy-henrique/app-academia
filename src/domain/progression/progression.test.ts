import { describe, expect, it } from "vitest";

import {
  buildVolumeSeries,
  computeSetVolume,
  computeTotalVolume,
  detectPersonalRecord,
  findLastResult,
  isNewPersonalRecord,
  suggestProgression,
  type ExerciseSetResult,
} from "./progression";

function set(overrides: Partial<ExerciseSetResult> = {}): ExerciseSetResult {
  return {
    completedAt: "2026-09-01T12:00:00.000Z",
    exerciseId: "bench-press",
    loadKg: 60,
    reps: 10,
    rir: 2,
    sessionId: "session-1",
    setIndex: 1,
    uid: "alice",
    ...overrides,
  };
}

const target = { repsMax: 12, repsMin: 8, rirTarget: 2 };

describe("progression engine", () => {
  it("computes volume deterministically and ignores incomplete data", () => {
    expect(computeSetVolume({ loadKg: 62.5, reps: 8 })).toBe(500);
    expect(computeSetVolume({ loadKg: 0, reps: 10 })).toBe(0);
    expect(computeSetVolume({ loadKg: 60, reps: 0 })).toBe(0);
    expect(computeSetVolume({ loadKg: Number.NaN, reps: 10 })).toBe(0);
    expect(computeTotalVolume([set(), set({ loadKg: 0 })])).toBe(600);
  });

  it("finds the last result of an exercise by completion time", () => {
    const last = findLastResult(
      [
        set({ completedAt: "2026-09-01T12:00:00.000Z", loadKg: 60 }),
        set({ completedAt: "2026-09-08T12:00:00.000Z", loadKg: 65 }),
        set({ completedAt: "2026-09-04T12:00:00.000Z", exerciseId: "squat", loadKg: 90 }),
      ],
      "bench-press",
    );

    expect(last?.loadKg).toBe(65);
  });

  it("detects the personal record by load, then reps, then the earliest date", () => {
    const record = detectPersonalRecord(
      [
        set({ loadKg: 60, reps: 10 }),
        set({ completedAt: "2026-09-08T12:00:00.000Z", loadKg: 70, reps: 6, sessionId: "s2" }),
        set({ completedAt: "2026-09-15T12:00:00.000Z", loadKg: 70, reps: 8, sessionId: "s3" }),
        set({ completedAt: "2026-09-22T12:00:00.000Z", loadKg: 70, reps: 8, sessionId: "s4" }),
      ],
      "bench-press",
    );

    expect(record).toEqual({
      achievedAt: "2026-09-15T12:00:00.000Z",
      exerciseId: "bench-press",
      loadKg: 70,
      reps: 8,
      sessionId: "s3",
      volumeKg: 560,
    });
  });

  it("recognises a new record only when it actually beats the history", () => {
    const history = [set({ loadKg: 70, reps: 8 })];

    expect(isNewPersonalRecord(history, set({ loadKg: 72.5, reps: 6 }))).toBe(true);
    expect(isNewPersonalRecord(history, set({ loadKg: 70, reps: 9 }))).toBe(true);
    expect(isNewPersonalRecord(history, set({ loadKg: 70, reps: 8 }))).toBe(false);
    expect(isNewPersonalRecord(history, set({ loadKg: 65, reps: 12 }))).toBe(false);
    expect(isNewPersonalRecord([], set())).toBe(true);
    expect(isNewPersonalRecord([], set({ loadKg: 0 }))).toBe(false);
  });

  it("never applies a load by itself: every suggestion needs confirmation", () => {
    const suggestion = suggestProgression(set({ reps: 12, rir: 3 }), target);

    expect(suggestion).toEqual({
      action: "INCREASE_LOAD",
      needsConfirmation: true,
      reason: "Você fechou o topo da faixa de repetições com folga.",
      suggestedLoadKg: 62.5,
      suggestedReps: 8,
    });
  });

  it("adds a repetition before adding load inside the range", () => {
    expect(suggestProgression(set({ reps: 9, rir: 4 }), target)).toMatchObject({
      action: "ADD_REP",
      suggestedLoadKg: 60,
      suggestedReps: 10,
    });
  });

  it("holds the load when the effort matches the target", () => {
    expect(suggestProgression(set({ reps: 10, rir: 2 }), target)).toMatchObject({
      action: "HOLD",
      suggestedLoadKg: 60,
      suggestedReps: 10,
    });
  });

  it("reduces the load when the set failed the range under too much effort", () => {
    expect(suggestProgression(set({ reps: 6, rir: 0 }), target)).toMatchObject({
      action: "REDUCE_LOAD",
      suggestedLoadKg: 57.5,
      suggestedReps: 8,
    });
  });

  it("has nothing to suggest without a usable last result", () => {
    expect(suggestProgression(null, target)).toBeNull();
    expect(suggestProgression(set({ loadKg: 0 }), target)).toBeNull();
  });

  it("builds a volume series per session, oldest first", () => {
    expect(
      buildVolumeSeries([
        set({ completedAt: "2026-09-08T12:00:00.000Z", loadKg: 65, sessionId: "s2" }),
        set({ completedAt: "2026-09-01T12:00:00.000Z", sessionId: "s1" }),
        set({ completedAt: "2026-09-01T12:10:00.000Z", loadKg: 60, reps: 8, sessionId: "s1" }),
      ]),
    ).toEqual([
      { label: "2026-09-01", volumeKg: 1080 },
      { label: "2026-09-08", volumeKg: 650 },
    ]);
  });
});
