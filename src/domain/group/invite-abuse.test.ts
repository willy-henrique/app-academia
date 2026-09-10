import { describe, expect, it } from "vitest";

import { evaluateInviteQuota, type InviteQuotaConfig } from "./invite-abuse";
import { createTrainingInvite, type TrainingInvite } from "./training-invite";

const now = new Date("2026-09-02T12:00:00.000Z");

const config: InviteQuotaConfig = {
  maxOutgoingPending: 3,
  maxPerReceiverPerWindow: 2,
  windowSeconds: 3600,
};

function outgoing(
  overrides: Partial<Parameters<typeof createTrainingInvite>[0]>,
  at: Date,
): TrainingInvite {
  return createTrainingInvite(
    {
      id: `invite-${at.getTime()}-${overrides.receiverUid ?? "joao"}`,
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
    at,
  );
}

describe("evaluateInviteQuota", () => {
  it("allows a first invite to a new receiver", () => {
    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [],
        receiverBlocksSender: false,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("ALLOWED");
  });

  it("blocks self invites and receivers who blocked the sender", () => {
    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [],
        receiverBlocksSender: false,
        receiverUid: "willy",
        senderUid: "willy",
      }),
    ).toBe("SELF_INVITE");

    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [],
        receiverBlocksSender: true,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("BLOCKED_BY_RECEIVER");
  });

  it("rejects a duplicate pending invite to the same receiver", () => {
    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [outgoing({}, now)],
        receiverBlocksSender: false,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("DUPLICATE_PENDING");
  });

  it("rejects when the sender already has too many active pending invites", () => {
    const pending = [
      outgoing({ receiverUid: "a", id: "a" }, now),
      outgoing({ receiverUid: "b", id: "b" }, now),
      outgoing({ receiverUid: "c", id: "c" }, now),
    ];

    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: pending,
        receiverBlocksSender: false,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("SENDER_LIMIT_REACHED");
  });

  it("rejects repeated invites to the same receiver inside the window even after they resolve", () => {
    const earlier = new Date(now.getTime() - 600_000);
    const declined = { ...outgoing({ id: "old" }, earlier), status: "DECLINED" as const };
    const cancelled = { ...outgoing({ id: "old-2" }, earlier), status: "CANCELLED" as const };

    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [declined, cancelled],
        receiverBlocksSender: false,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("RECEIVER_WINDOW_LIMIT_REACHED");
  });

  it("ignores invites that fell outside the window", () => {
    const old = new Date(now.getTime() - 7200_000);
    const declined = { ...outgoing({ id: "old" }, old), status: "DECLINED" as const };

    expect(
      evaluateInviteQuota({
        config,
        now,
        outgoingInvites: [declined],
        receiverBlocksSender: false,
        receiverUid: "joao",
        senderUid: "willy",
      }),
    ).toBe("ALLOWED");
  });
});
