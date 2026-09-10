import { describe, expect, it } from "vitest";

import { recordGroupParticipantSet } from "./group-participant-set";

describe("recordGroupParticipantSet", () => {
  it("creates an individual, idempotency-ready set event", () => {
    const set = recordGroupParticipantSet(
      {
        eventId: "set-event-1",
        exerciseId: "goblet-squat",
        groupSessionId: "group-1",
        loadKg: 24,
        reps: 10,
        rir: 2,
        setIndex: 1,
        uid: "alice",
      },
      new Date("2026-09-03T12:00:00.000Z"),
    );

    expect(set).toMatchObject({
      eventId: "set-event-1",
      groupSessionId: "group-1",
      id: "set-event-1",
      uid: "alice",
    });
    expect(set.completedAt).toBe("2026-09-03T12:00:00.000Z");
  });

  it("rejects malformed event identifiers instead of creating ambiguous records", () => {
    expect(() =>
      recordGroupParticipantSet({
        eventId: " ",
        exerciseId: "goblet-squat",
        groupSessionId: "group-1",
        loadKg: 24,
        reps: 10,
        setIndex: 1,
        uid: "alice",
      }),
    ).toThrow();
  });
});
