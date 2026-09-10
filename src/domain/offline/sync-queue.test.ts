import { describe, expect, it } from "vitest";

import {
  enqueuePendingEvent,
  markPendingEventAttempt,
  mergeEventsForDisplay,
  reconcilePendingEvents,
  removePendingEvent,
  resolveSyncStatus,
  type PendingEvent,
} from "./sync-queue";

function event(overrides: Partial<PendingEvent> = {}): PendingEvent {
  return {
    attempts: 0,
    eventId: "set-1",
    kind: "WORKOUT_SET",
    payload: { loadKg: 60, reps: 10 },
    queuedAt: "2026-09-09T12:00:00.000Z",
    ...overrides,
  };
}

describe("offline sync queue", () => {
  it("never duplicates the same event id", () => {
    const queue = enqueuePendingEvent(enqueuePendingEvent([], event()), event({ payload: {} }));

    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({});
  });

  it("keeps the attempt count of an event that is re-queued", () => {
    const queue = markPendingEventAttempt(enqueuePendingEvent([], event()), "set-1");
    const requeued = enqueuePendingEvent(queue, event());

    expect(requeued[0].attempts).toBe(1);
  });

  it("reports the sync status for the UI", () => {
    expect(resolveSyncStatus([])).toEqual({ pendingCount: 0, state: "SYNCED" });
    expect(resolveSyncStatus([event()])).toEqual({ pendingCount: 1, state: "PENDING" });
  });

  it("drops from the queue only what the server already has", () => {
    const queue = [event(), event({ eventId: "set-2" }), event({ eventId: "set-3" })];

    const { confirmed, pending } = reconcilePendingEvents(queue, [
      { eventId: "set-1" },
      { eventId: "set-3" },
    ]);

    expect(confirmed.map((item) => item.eventId)).toEqual(["set-1", "set-3"]);
    expect(pending.map((item) => item.eventId)).toEqual(["set-2"]);
  });

  it("removes a single confirmed event", () => {
    expect(removePendingEvent([event(), event({ eventId: "set-2" })], "set-1")).toHaveLength(1);
  });

  it("lets the server win when the same event exists on both sides", () => {
    const merged = mergeEventsForDisplay(
      [{ eventId: "set-1", loadKg: 62.5 }],
      [
        { eventId: "set-1", loadKg: 60 },
        { eventId: "set-2", loadKg: 60 },
      ],
    );

    expect(merged).toEqual([
      { eventId: "set-1", loadKg: 62.5 },
      { eventId: "set-2", loadKg: 60 },
    ]);
  });

  it("keeps a stable order so the list does not jump while syncing", () => {
    const merged = mergeEventsForDisplay(
      [{ eventId: "set-3" }],
      [{ eventId: "set-2" }, { eventId: "set-1" }],
    );

    expect(merged.map((item) => item.eventId)).toEqual(["set-1", "set-2", "set-3"]);
  });
});
