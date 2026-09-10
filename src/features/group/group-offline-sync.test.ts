// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { doc, getDoc, getFirebaseClientServices, saveGroupParticipantSet } = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  saveGroupParticipantSet: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc,
  getDoc,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

vi.mock("./group-workout-repository", () => ({
  saveGroupParticipantSet,
}));

import { recordGroupParticipantSet } from "@/domain/group/group-participant-set";

import {
  enqueuePendingGroupParticipantSetSync,
  flushPendingGroupParticipantSetSyncs,
  getPendingGroupParticipantSetSyncCount,
  getPendingGroupParticipantSetSyncs,
  reconcileGroupParticipantSetQueue,
  saveGroupParticipantSetWithOfflineFallback,
  subscribeToGroupConnectionState,
} from "./group-offline-sync";

describe("group offline sync", () => {
  const set = recordGroupParticipantSet(
    {
      eventId: "set-event-1",
      exerciseId: "goblet-squat",
      groupSessionId: "group-1",
      loadKg: 24,
      reps: 10,
      setIndex: 1,
      uid: "alice",
    },
    new Date("2026-09-03T12:00:00.000Z"),
  );

  beforeEach(() => {
    window.localStorage.clear();
    doc.mockReset();
    getDoc.mockReset();
    getFirebaseClientServices.mockReset();
    saveGroupParticipantSet.mockReset();
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    getFirebaseClientServices.mockReturnValue({
      firestore: "firestore",
    });
  });

  it("queues a recoverable failure and flushes it after reconnect", async () => {
    saveGroupParticipantSet.mockRejectedValue(
      Object.assign(new Error("offline"), { code: "unavailable" }),
    );

    const queued = await saveGroupParticipantSetWithOfflineFallback(set);
    expect(queued).toMatchObject({ pendingCount: 1, status: "QUEUED" });
    expect(getPendingGroupParticipantSetSyncCount()).toBe(1);

    getDoc.mockResolvedValue({ exists: () => false });
    saveGroupParticipantSet.mockResolvedValue(undefined);

    const flushed = await flushPendingGroupParticipantSetSyncs();
    expect(flushed).toMatchObject({ pendingCount: 0, syncedCount: 1 });
    expect(saveGroupParticipantSet).toHaveBeenCalledWith(set);
  });

  it("deduplicates the same event id in the pending queue", () => {
    enqueuePendingGroupParticipantSetSync(set, new Date("2026-09-03T12:01:00.000Z"));
    enqueuePendingGroupParticipantSetSync(set, new Date("2026-09-03T12:02:00.000Z"));

    const pending = getPendingGroupParticipantSetSyncCount();
    expect(pending).toBe(1);
  });

  it("drops a queued event when the document already exists on reconnect", async () => {
    enqueuePendingGroupParticipantSetSync(set);
    getDoc.mockResolvedValue({ exists: () => true });

    const flushed = await flushPendingGroupParticipantSetSyncs();

    expect(flushed).toMatchObject({ pendingCount: 0, syncedCount: 1 });
    expect(saveGroupParticipantSet).not.toHaveBeenCalled();
  });

  it("reports connection transitions for reconnect handling", () => {
    const states: string[] = [];
    const unsubscribe = subscribeToGroupConnectionState((state) => {
      states.push(state);
    });

    expect(states[0]).toBe("ONLINE");

    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));

    expect(states).toContain("OFFLINE");
    expect(states).toContain("RECONNECTING");

    unsubscribe();
  });
  it("drops from the queue only what the group session already registered", () => {
    enqueuePendingGroupParticipantSetSync(set);
    enqueuePendingGroupParticipantSetSync({ ...set, eventId: "set-event-2" });

    expect(reconcileGroupParticipantSetQueue(["group-1:alice:set-event-1"])).toBe(1);
    expect(getPendingGroupParticipantSetSyncs().map((sync) => sync.set.eventId)).toEqual([
      "set-event-2",
    ]);
  });
});
