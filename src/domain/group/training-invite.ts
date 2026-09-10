import { z } from "zod";

import { isPublicUserId } from "@/domain/identity/public-user-id";

export const trainingInviteStatusOptions = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type TrainingInviteStatus = (typeof trainingInviteStatusOptions)[number];

export const DEFAULT_TRAINING_INVITE_TTL_SECONDS = 48 * 60 * 60;

const inviteUid = z.string().trim().min(1).max(128);
const invitePublicUserId = z.string().refine(isPublicUserId, "Informe um WillTreino ID válido.");
const inviteAvatar = z.string().trim().min(1).max(2048).nullable().default(null);
const inviteDisplayName = z.string().trim().min(1).max(60);
const inviteReference = z.string().trim().min(1).max(128);

export const trainingInviteSchema = z.object({
  cancelledAt: z.string().datetime().nullable().default(null),
  createdAt: z.unknown().optional(),
  expiresAt: z.string().datetime(),
  groupSessionId: z.string().trim().min(1).max(128).nullable().default(null),
  id: inviteReference,
  receiverAvatar: inviteAvatar,
  receiverDisplayName: inviteDisplayName,
  receiverPublicUserId: invitePublicUserId,
  receiverUid: inviteUid,
  respondedAt: z.string().datetime().nullable().default(null),
  senderAvatar: inviteAvatar,
  senderDisplayName: inviteDisplayName,
  senderPublicUserId: invitePublicUserId,
  senderUid: inviteUid,
  status: z.enum(trainingInviteStatusOptions).default("PENDING"),
  updatedAt: z.unknown().optional(),
  workoutPlanId: inviteReference,
  workoutPlanVersionId: inviteReference,
});

export type TrainingInvite = z.infer<typeof trainingInviteSchema>;

export interface TrainingInviteCreateInput {
  id: string;
  receiverAvatar?: string | null;
  receiverDisplayName: string;
  receiverPublicUserId: string;
  receiverUid: string;
  senderAvatar?: string | null;
  senderDisplayName: string;
  senderPublicUserId: string;
  senderUid: string;
  ttlSeconds?: number;
  workoutPlanId: string;
  workoutPlanVersionId: string;
}

const statusLabels: Record<TrainingInviteStatus, string> = {
  ACCEPTED: "aceito",
  CANCELLED: "cancelado",
  DECLINED: "recusado",
  EXPIRED: "expirado",
  PENDING: "pendente",
};

function statusLabel(status: TrainingInviteStatus): string {
  return statusLabels[status];
}

function cloneInvite(invite: TrainingInvite): TrainingInvite {
  return trainingInviteSchema.parse(structuredClone(invite));
}

export function createTrainingInvite(
  input: TrainingInviteCreateInput,
  now: Date = new Date(),
): TrainingInvite {
  if (input.senderUid === input.receiverUid) {
    throw new Error("Não é possível convidar você mesmo.");
  }

  const ttlSeconds = input.ttlSeconds ?? DEFAULT_TRAINING_INVITE_TTL_SECONDS;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("A validade do convite deve ser positiva.");
  }

  const timestamp = now.toISOString();

  return trainingInviteSchema.parse({
    cancelledAt: null,
    createdAt: timestamp,
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
    groupSessionId: null,
    id: input.id,
    receiverAvatar: input.receiverAvatar ?? null,
    receiverDisplayName: input.receiverDisplayName,
    receiverPublicUserId: input.receiverPublicUserId,
    receiverUid: input.receiverUid,
    respondedAt: null,
    senderAvatar: input.senderAvatar ?? null,
    senderDisplayName: input.senderDisplayName,
    senderPublicUserId: input.senderPublicUserId,
    senderUid: input.senderUid,
    status: "PENDING",
    updatedAt: timestamp,
    workoutPlanId: input.workoutPlanId,
    workoutPlanVersionId: input.workoutPlanVersionId,
  });
}

export function isTrainingInviteExpired(invite: TrainingInvite, now: Date = new Date()): boolean {
  return new Date(invite.expiresAt).getTime() <= now.getTime();
}

export function resolveTrainingInviteStatus(
  invite: TrainingInvite,
  now: Date = new Date(),
): TrainingInviteStatus {
  if (invite.status === "PENDING" && isTrainingInviteExpired(invite, now)) {
    return "EXPIRED";
  }

  return invite.status;
}

export function acceptTrainingInvite(
  invite: TrainingInvite,
  actorUid: string,
  groupSessionId: string,
  now: Date = new Date(),
): TrainingInvite {
  if (actorUid !== invite.receiverUid) {
    throw new Error("Apenas quem recebeu o convite pode aceitá-lo.");
  }

  if (invite.status === "ACCEPTED") {
    return cloneInvite(invite);
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Convite ${statusLabel(invite.status)} não pode ser aceito.`);
  }

  if (isTrainingInviteExpired(invite, now)) {
    throw new Error("Este convite expirou.");
  }

  const next = cloneInvite(invite);
  next.status = "ACCEPTED";
  next.respondedAt = now.toISOString();
  next.groupSessionId = z.string().trim().min(1).max(128).parse(groupSessionId);
  next.updatedAt = now.toISOString();
  return next;
}

export function declineTrainingInvite(
  invite: TrainingInvite,
  actorUid: string,
  now: Date = new Date(),
): TrainingInvite {
  if (actorUid !== invite.receiverUid) {
    throw new Error("Apenas quem recebeu o convite pode recusá-lo.");
  }

  if (invite.status === "DECLINED") {
    return cloneInvite(invite);
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Convite ${statusLabel(invite.status)} não pode ser recusado.`);
  }

  const next = cloneInvite(invite);
  next.status = "DECLINED";
  next.respondedAt = now.toISOString();
  next.updatedAt = now.toISOString();
  return next;
}

export function cancelTrainingInvite(
  invite: TrainingInvite,
  actorUid: string,
  now: Date = new Date(),
): TrainingInvite {
  if (actorUid !== invite.senderUid) {
    throw new Error("Apenas quem enviou o convite pode cancelá-lo.");
  }

  if (invite.status === "CANCELLED") {
    return cloneInvite(invite);
  }

  if (invite.status !== "PENDING") {
    throw new Error(`Convite ${statusLabel(invite.status)} não pode ser cancelado.`);
  }

  const next = cloneInvite(invite);
  next.status = "CANCELLED";
  next.cancelledAt = now.toISOString();
  next.updatedAt = now.toISOString();
  return next;
}

export function expireTrainingInvite(
  invite: TrainingInvite,
  now: Date = new Date(),
): TrainingInvite {
  if (invite.status !== "PENDING" || !isTrainingInviteExpired(invite, now)) {
    return cloneInvite(invite);
  }

  const next = cloneInvite(invite);
  next.status = "EXPIRED";
  next.updatedAt = now.toISOString();
  return next;
}
