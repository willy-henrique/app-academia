import { describe, expect, it } from "vitest";

import {
  blocksStrengthCompletion,
  completeCardioSession,
  createCardioPrescription,
  createCardioSession,
  isCardioPending,
  rescheduleCardioSession,
  skipCardioSession,
  startCardioSession,
} from "./cardio";

const now = new Date("2026-09-09T12:00:00.000Z");

function session(requirement: Parameters<typeof createCardioPrescription>[0] = "OPTIONAL") {
  return createCardioSession(
    {
      id: "cardio-1",
      ownerUid: "alice",
      prescription: createCardioPrescription(requirement),
    },
    now,
  );
}

describe("cardio domain", () => {
  it("models the three requirement levels with their own defaults", () => {
    expect(createCardioPrescription("OPTIONAL").targetSeconds).toBe(600);
    expect(createCardioPrescription("RECOMMENDED").targetSeconds).toBe(900);
    expect(createCardioPrescription("PROGRAM_REQUIRED").targetSeconds).toBe(1200);
  });

  it("keeps a new cardio pending and unstarted", () => {
    const cardio = session();
    expect(cardio.status).toBe("PLANNED");
    expect(cardio.startedAt).toBeNull();
    expect(isCardioPending(cardio)).toBe(true);
  });

  it("never blocks the strength session from finishing", () => {
    expect(blocksStrengthCompletion()).toBe(false);
  });

  it("records duration and distance when completed", () => {
    const completed = completeCardioSession(
      startCardioSession(session(), now),
      { distanceMeters: 2400, durationSeconds: 900.4 },
      new Date("2026-09-09T12:15:00.000Z"),
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.durationSeconds).toBe(900);
    expect(completed.distanceMeters).toBe(2400);
    expect(completed.completedAt).toBe("2026-09-09T12:15:00.000Z");
    expect(isCardioPending(completed)).toBe(false);
  });

  it("keeps completion idempotent", () => {
    const completed = completeCardioSession(session(), { durationSeconds: 600 }, now);
    const again = completeCardioSession(
      completed,
      { durationSeconds: 60 },
      new Date("2026-09-09T13:00:00.000Z"),
    );

    expect(again).toEqual(completed);
  });

  it("requires an explicit reason to skip, including a required cardio", () => {
    const required = session("PROGRAM_REQUIRED");
    expect(() => skipCardioSession(required, "   ", now)).toThrow(/motivo/);

    const skipped = skipCardioSession(required, "Dor no joelho hoje", now);
    expect(skipped.status).toBe("SKIPPED");
    expect(skipped.skipReason).toBe("Dor no joelho hoje");
    expect(skipped.skippedAt).toBe(now.toISOString());
    expect(skipped.completedAt).toBeNull();
  });

  it("moves a pending cardio without marking it as done", () => {
    const rescheduled = rescheduleCardioSession(
      session("RECOMMENDED"),
      new Date("2026-09-10T18:00:00.000Z"),
      now,
    );

    expect(rescheduled.status).toBe("RESCHEDULED");
    expect(rescheduled.rescheduledFor).toBe("2026-09-10T18:00:00.000Z");
    expect(rescheduled.completedAt).toBeNull();
    expect(isCardioPending(rescheduled)).toBe(true);
  });

  it("refuses to reschedule to the past and to move a closed cardio", () => {
    expect(() =>
      rescheduleCardioSession(session(), new Date("2026-09-09T11:00:00.000Z"), now),
    ).toThrow(/futuro/);

    const skipped = skipCardioSession(session(), "Sem tempo", now);
    expect(rescheduleCardioSession(skipped, new Date("2026-09-10T18:00:00.000Z"), now)).toEqual(
      skipped,
    );
  });

  it("keeps a standalone cardio independent from any workout session", () => {
    const standalone = session();
    expect(standalone.source).toBe("STANDALONE");
    expect(standalone.workoutSessionId).toBeNull();

    const attached = createCardioSession(
      {
        id: "cardio-2",
        ownerUid: "alice",
        prescription: createCardioPrescription("RECOMMENDED"),
        source: "WORKOUT",
        workoutSessionId: "session-1",
      },
      now,
    );
    expect(attached.source).toBe("WORKOUT");
    expect(attached.workoutSessionId).toBe("session-1");
  });
});
