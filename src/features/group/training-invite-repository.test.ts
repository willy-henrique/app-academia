import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  collection,
  getFirebaseClientServices,
  httpsCallable,
  limitQuery,
  onSnapshot,
  orderBy,
  query,
  where,
} = vi.hoisted(() => ({
  collection: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  httpsCallable: vi.fn(),
  limitQuery: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  collection,
  limit: limitQuery,
  onSnapshot,
  orderBy,
  query,
  where,
}));

vi.mock("firebase/functions", () => ({ httpsCallable }));

vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import { createTrainingInvite } from "@/domain/group/training-invite";

import {
  respondToTrainingInviteRequest,
  sendTrainingInviteRequest,
  subscribeToIncomingTrainingInvites,
} from "./training-invite-repository";

const now = new Date("2026-09-02T12:00:00.000Z");

function buildInvite(overrides: Partial<Parameters<typeof createTrainingInvite>[0]> = {}) {
  return createTrainingInvite(
    {
      id: overrides.id ?? "invite-1",
      receiverDisplayName: "João",
      receiverPublicUserId: "WT-AAAA-BBBB",
      receiverUid: "joao",
      senderDisplayName: "Willy",
      senderPublicUserId: "WT-7FK3-Q9LP",
      senderUid: "willy",
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
      ...overrides,
    },
    now,
  );
}

describe("training invite repository", () => {
  beforeEach(() => {
    collection.mockReset();
    getFirebaseClientServices.mockReset();
    httpsCallable.mockReset();
    limitQuery.mockReset();
    onSnapshot.mockReset();
    orderBy.mockReset();
    query.mockReset();
    where.mockReset();
    getFirebaseClientServices.mockReturnValue({ firestore: "firestore", functions: "functions" });
  });

  it("sends an invite through the callable and validates the response", async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { expiresAt: now.toISOString(), inviteId: "invite-9", status: "PENDING" },
    });
    httpsCallable.mockReturnValue(callable);

    await expect(
      sendTrainingInviteRequest({
        receiverPublicUserId: "WT-AAAA-BBBB",
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      }),
    ).resolves.toMatchObject({ inviteId: "invite-9", status: "PENDING" });

    expect(httpsCallable).toHaveBeenCalledWith("functions", "sendTrainingInvite");
    expect(callable).toHaveBeenCalledWith({
      receiverPublicUserId: "WT-AAAA-BBBB",
      workoutPlanId: "plan-1",
      workoutPlanVersionId: "version-1",
    });
  });

  it("rejects sending without any receiver identifier", async () => {
    await expect(
      sendTrainingInviteRequest({
        workoutPlanId: "plan-1",
        workoutPlanVersionId: "version-1",
      } as never),
    ).rejects.toThrow(/WillTreino ID/i);
  });

  it("responds to an invite with the requested action", async () => {
    const callable = vi.fn().mockResolvedValue({
      data: { groupSessionId: "group-1", inviteId: "invite-1", status: "ACCEPTED" },
    });
    httpsCallable.mockReturnValue(callable);

    await expect(respondToTrainingInviteRequest("invite-1", "ACCEPT")).resolves.toEqual({
      groupSessionId: "group-1",
      inviteId: "invite-1",
      status: "ACCEPTED",
    });
    expect(callable).toHaveBeenCalledWith({ action: "ACCEPT", inviteId: "invite-1" });
  });

  it("streams only still-pending invites and returns the unsubscribe handle", () => {
    const unsubscribe = vi.fn();
    onSnapshot.mockImplementation((_query, onNext) => {
      onNext({
        docs: [
          { data: () => buildInvite({ id: "fresh", ttlSeconds: 3600 }) },
          { data: () => buildInvite({ id: "stale", ttlSeconds: 1 }) },
          { data: () => ({ not: "an invite" }) },
        ],
      });
      return unsubscribe;
    });

    const received: string[][] = [];
    const handle = subscribeToIncomingTrainingInvites(
      "joao",
      (invites) => {
        received.push(invites.map((invite) => invite.id));
      },
      { now: () => new Date("2026-09-02T12:30:00.000Z") },
    );

    expect(where).toHaveBeenCalledWith("receiverUid", "==", "joao");
    expect(where).toHaveBeenCalledWith("status", "==", "PENDING");
    expect(received).toEqual([["fresh"]]);
    expect(handle).toBe(unsubscribe);
  });
});
