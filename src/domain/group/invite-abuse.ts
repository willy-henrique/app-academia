import { isTrainingInviteExpired, type TrainingInvite } from "./training-invite";

export const inviteQuotaDecisionOptions = [
  "ALLOWED",
  "SELF_INVITE",
  "BLOCKED_BY_RECEIVER",
  "DUPLICATE_PENDING",
  "SENDER_LIMIT_REACHED",
  "RECEIVER_WINDOW_LIMIT_REACHED",
] as const;

export type InviteQuotaDecision = (typeof inviteQuotaDecisionOptions)[number];

export interface InviteQuotaConfig {
  maxOutgoingPending: number;
  maxPerReceiverPerWindow: number;
  windowSeconds: number;
}

export const DEFAULT_INVITE_QUOTA_CONFIG: InviteQuotaConfig = {
  maxOutgoingPending: 20,
  maxPerReceiverPerWindow: 3,
  windowSeconds: 60 * 60,
};

export interface InviteQuotaContext {
  config?: InviteQuotaConfig;
  now?: Date;
  outgoingInvites: readonly TrainingInvite[];
  receiverBlocksSender: boolean;
  receiverUid: string;
  senderUid: string;
}

function toMillis(value: unknown): number | null {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value !== null &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return null;
}

export function evaluateInviteQuota(context: InviteQuotaContext): InviteQuotaDecision {
  const now = context.now ?? new Date();
  const config = context.config ?? DEFAULT_INVITE_QUOTA_CONFIG;

  if (context.senderUid === context.receiverUid) {
    return "SELF_INVITE";
  }

  if (context.receiverBlocksSender) {
    return "BLOCKED_BY_RECEIVER";
  }

  const activePending = context.outgoingInvites.filter(
    (invite) => invite.status === "PENDING" && !isTrainingInviteExpired(invite, now),
  );

  if (activePending.some((invite) => invite.receiverUid === context.receiverUid)) {
    return "DUPLICATE_PENDING";
  }

  if (activePending.length >= config.maxOutgoingPending) {
    return "SENDER_LIMIT_REACHED";
  }

  const windowStartMs = now.getTime() - config.windowSeconds * 1000;
  const recentToReceiver = context.outgoingInvites.filter((invite) => {
    if (invite.receiverUid !== context.receiverUid) {
      return false;
    }

    const createdAtMs = toMillis(invite.createdAt);
    return createdAtMs !== null && createdAtMs >= windowStartMs;
  });

  if (recentToReceiver.length >= config.maxPerReceiverPerWindow) {
    return "RECEIVER_WINDOW_LIMIT_REACHED";
  }

  return "ALLOWED";
}

export function isInviteQuotaBlocking(decision: InviteQuotaDecision): boolean {
  return decision !== "ALLOWED";
}
