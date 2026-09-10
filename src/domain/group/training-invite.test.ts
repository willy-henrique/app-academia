import { describe, expect, it } from "vitest";

import {
  acceptTrainingInvite,
  cancelTrainingInvite,
  createTrainingInvite,
  declineTrainingInvite,
  expireTrainingInvite,
  isTrainingInviteExpired,
  resolveTrainingInviteStatus,
  type TrainingInviteCreateInput,
} from "./training-invite";

const baseInput: TrainingInviteCreateInput = {
  id: "invite-1",
  receiverAvatar: null,
  receiverDisplayName: "João",
  receiverPublicUserId: "WT-AAAA-BBBB",
  receiverUid: "joao",
  senderAvatar: null,
  senderDisplayName: "Willy",
  senderPublicUserId: "WT-7FK3-Q9LP",
  senderUid: "willy",
  workoutPlanId: "plan-1",
  workoutPlanVersionId: "version-1",
};

const now = new Date("2026-09-02T12:00:00.000Z");

describe("createTrainingInvite", () => {
  it("creates a pending invite with a future expiry derived from the ttl", () => {
    const invite = createTrainingInvite({ ...baseInput, ttlSeconds: 3600 }, now);

    expect(invite.status).toBe("PENDING");
    expect(invite.senderUid).toBe("willy");
    expect(invite.receiverUid).toBe("joao");
    expect(invite.groupSessionId).toBeNull();
    expect(invite.expiresAt).toBe("2026-09-02T13:00:00.000Z");
    expect(invite.respondedAt).toBeNull();
  });

  it("rejects self invites and non-positive ttl", () => {
    expect(() => createTrainingInvite({ ...baseInput, receiverUid: "willy" }, now)).toThrow(
      /convidar você mesmo/i,
    );
    expect(() => createTrainingInvite({ ...baseInput, ttlSeconds: 0 }, now)).toThrow(/validade/i);
  });
});

describe("training invite expiry", () => {
  it("flags an expired pending invite without mutating stored status", () => {
    const invite = createTrainingInvite({ ...baseInput, ttlSeconds: 60 }, now);
    const later = new Date(now.getTime() + 120_000);

    expect(isTrainingInviteExpired(invite, later)).toBe(true);
    expect(resolveTrainingInviteStatus(invite, later)).toBe("EXPIRED");
    expect(invite.status).toBe("PENDING");
  });

  it("transitions a stale pending invite to EXPIRED and is idempotent", () => {
    const invite = createTrainingInvite({ ...baseInput, ttlSeconds: 60 }, now);
    const later = new Date(now.getTime() + 120_000);

    const expired = expireTrainingInvite(invite, later);
    expect(expired.status).toBe("EXPIRED");
    expect(expireTrainingInvite(expired, later).status).toBe("EXPIRED");
  });

  it("does not expire an invite that is still inside its window", () => {
    const invite = createTrainingInvite({ ...baseInput, ttlSeconds: 3600 }, now);
    expect(expireTrainingInvite(invite, new Date(now.getTime() + 60_000)).status).toBe("PENDING");
  });
});

describe("acceptTrainingInvite", () => {
  it("moves a pending invite to ACCEPTED and links the group session", () => {
    const invite = createTrainingInvite(baseInput, now);
    const accepted = acceptTrainingInvite(invite, "joao", "group-1", now);

    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.groupSessionId).toBe("group-1");
    expect(accepted.respondedAt).toBe(now.toISOString());
  });

  it("is idempotent when the invite is already accepted", () => {
    const invite = createTrainingInvite(baseInput, now);
    const accepted = acceptTrainingInvite(invite, "joao", "group-1", now);

    expect(acceptTrainingInvite(accepted, "joao", "group-2", now).groupSessionId).toBe("group-1");
  });

  it("rejects acceptance by anyone other than the receiver", () => {
    const invite = createTrainingInvite(baseInput, now);
    expect(() => acceptTrainingInvite(invite, "willy", "group-1", now)).toThrow(
      /recebeu o convite/i,
    );
  });

  it("rejects acceptance of an expired invite", () => {
    const invite = createTrainingInvite({ ...baseInput, ttlSeconds: 60 }, now);
    const later = new Date(now.getTime() + 120_000);
    expect(() => acceptTrainingInvite(invite, "joao", "group-1", later)).toThrow(/expirou/i);
  });

  it("rejects acceptance of a cancelled invite", () => {
    const invite = createTrainingInvite(baseInput, now);
    const cancelled = cancelTrainingInvite(invite, "willy", now);
    expect(() => acceptTrainingInvite(cancelled, "joao", "group-1", now)).toThrow(/cancelado/i);
  });
});

describe("declineTrainingInvite", () => {
  it("moves a pending invite to DECLINED for the receiver and is idempotent", () => {
    const invite = createTrainingInvite(baseInput, now);
    const declined = declineTrainingInvite(invite, "joao", now);

    expect(declined.status).toBe("DECLINED");
    expect(declineTrainingInvite(declined, "joao", now).status).toBe("DECLINED");
  });

  it("rejects decline by the sender", () => {
    const invite = createTrainingInvite(baseInput, now);
    expect(() => declineTrainingInvite(invite, "willy", now)).toThrow(/recebeu o convite/i);
  });

  it("rejects declining an already accepted invite", () => {
    const invite = createTrainingInvite(baseInput, now);
    const accepted = acceptTrainingInvite(invite, "joao", "group-1", now);
    expect(() => declineTrainingInvite(accepted, "joao", now)).toThrow(/aceito/i);
  });
});

describe("cancelTrainingInvite", () => {
  it("moves a pending invite to CANCELLED for the sender and is idempotent", () => {
    const invite = createTrainingInvite(baseInput, now);
    const cancelled = cancelTrainingInvite(invite, "willy", now);

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).toBe(now.toISOString());
    expect(cancelTrainingInvite(cancelled, "willy", now).status).toBe("CANCELLED");
  });

  it("rejects cancel by the receiver", () => {
    const invite = createTrainingInvite(baseInput, now);
    expect(() => cancelTrainingInvite(invite, "joao", now)).toThrow(/enviou o convite/i);
  });
});
