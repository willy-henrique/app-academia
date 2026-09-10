import { beforeEach, describe, expect, it, vi } from "vitest";

const { doc, getFirebaseClientServices, serverTimestamp, setDoc } = vi.hoisted(() => ({
  doc: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc,
  serverTimestamp,
  setDoc,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { recordGroupParticipantSet } from "@/domain/group/group-participant-set";

import { saveGroupParticipantSet } from "./group-workout-repository";

describe("group workout repository", () => {
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
    doc.mockReset();
    getFirebaseClientServices.mockReset();
    serverTimestamp.mockReset();
    setDoc.mockReset();
    doc.mockImplementation((...parts: string[]) => parts.join("/"));
    serverTimestamp.mockReturnValue("server-timestamp");
  });

  it("writes an immutable event in the authenticated participant path", async () => {
    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: { uid: "alice" } },
      firestore: "firestore",
    });

    await saveGroupParticipantSet(set);

    expect(setDoc).toHaveBeenCalledWith(
      "firestore/groupSessions/group-1/participants/alice/sets/set-event-1",
      expect.objectContaining({
        eventId: "set-event-1",
        groupSessionId: "group-1",
        id: "set-event-1",
        uid: "alice",
      }),
    );
    expect(setDoc.mock.calls[0]).toHaveLength(2);
  });

  it("rejects unauthenticated writes and a mismatched participant", async () => {
    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: null },
      firestore: "firestore",
    });
    await expect(saveGroupParticipantSet(set)).rejects.toThrow("entrar na conta");

    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: { uid: "bob" } },
      firestore: "firestore",
    });
    await expect(saveGroupParticipantSet(set)).rejects.toThrow("próprias séries");
    expect(setDoc).not.toHaveBeenCalled();
  });
});
