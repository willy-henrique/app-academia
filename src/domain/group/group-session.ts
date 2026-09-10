import { z } from "zod";

import type { TrainingInvite } from "./training-invite";

export const groupSessionStatusOptions = [
  "LOBBY",
  "COUNTDOWN",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const groupParticipantRoleOptions = ["HOST", "MEMBER"] as const;

export const groupParticipantStatusOptions = [
  "INVITED",
  "READY",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "LEFT",
] as const;

export const groupParticipantOperationalStateOptions = [
  "WAITING_TURN",
  "PERFORMING_SET",
  "RESTING",
  "PAUSED",
] as const;

export const sharedEquipmentModeOptions = ["UNSET", "FULL", "PARTIAL", "NONE"] as const;

export const weightChangeModeOptions = ["UNSET", "FAST", "NORMAL", "SLOW", "CUSTOM"] as const;

export const groupStationModeOptions = [
  "ROTATION_SHARED_STATION",
  "PARALLEL_SAME_EXERCISE",
  "INDEPENDENT_STATIONS",
] as const;

const reference = z.string().trim().min(1).max(128);
const displaySnapshotSchema = z.object({
  avatar: z.string().trim().min(1).max(2048).nullable().default(null),
  displayName: z.string().trim().min(1).max(60),
  publicUserId: z.string().trim().min(1).max(32),
});

export const groupSessionSchema = z.object({
  createdAt: z.unknown().optional(),
  hostUid: reference,
  sharedEquipmentMode: z.enum(sharedEquipmentModeOptions).default("UNSET"),
  startAt: z.string().datetime().nullable().default(null),
  stationMode: z.enum(groupStationModeOptions).default("ROTATION_SHARED_STATION"),
  status: z.enum(groupSessionStatusOptions).default("LOBBY"),
  updatedAt: z.unknown().optional(),
  weightChangeMode: z.enum(weightChangeModeOptions).default("UNSET"),
  weightChangeSeconds: z.number().int().min(1).max(120).nullable().default(null),
  workoutPlanId: reference,
  workoutPlanVersionId: reference,
});

export const groupParticipantSchema = z.object({
  completedAt: z.string().datetime().nullable().default(null),
  displaySnapshot: displaySnapshotSchema,
  joinedAt: z.unknown().optional(),
  leftAt: z.string().datetime().nullable().default(null),
  operationalState: z.enum(groupParticipantOperationalStateOptions).default("WAITING_TURN"),
  operationalStateUpdatedAt: z.string().datetime().nullable().default(null),
  readyAt: z.string().datetime().nullable().default(null),
  role: z.enum(groupParticipantRoleOptions),
  status: z.enum(groupParticipantStatusOptions).default("INVITED"),
  uid: reference,
});

export type GroupSession = z.infer<typeof groupSessionSchema>;
export type GroupParticipant = z.infer<typeof groupParticipantSchema>;

export type GroupLobbyConfiguration = Readonly<{
  sharedEquipmentMode: Exclude<(typeof sharedEquipmentModeOptions)[number], "UNSET">;
  stationMode: (typeof groupStationModeOptions)[number];
  weightChangeMode: Exclude<(typeof weightChangeModeOptions)[number], "UNSET">;
  weightChangeSeconds?: number | null;
}>;

export function resolveEquipmentTransitionSeconds(
  sharedEquipmentMode: GroupLobbyConfiguration["sharedEquipmentMode"],
  stationMode: GroupLobbyConfiguration["stationMode"],
): number {
  if (sharedEquipmentMode === "NONE" || stationMode === "INDEPENDENT_STATIONS") {
    return 0;
  }

  if (stationMode === "PARALLEL_SAME_EXERCISE") {
    return sharedEquipmentMode === "FULL" ? 8 : 5;
  }

  return sharedEquipmentMode === "FULL" ? 15 : 10;
}

export interface GroupSessionDraft {
  participants: GroupParticipant[];
  session: GroupSession;
}

/**
 * Builds the shared group session and its participant snapshots when a training
 * invite is accepted. There is exactly one shared session per accepted invite;
 * the sender is the HOST and the receiver joins as READY (they just opted in).
 * Lobby configuration (equipment, weight change) and start are handled by later
 * phases and are intentionally left `UNSET` here.
 */
export function createGroupSessionFromInvite(
  invite: TrainingInvite,
  now: Date = new Date(),
): GroupSessionDraft {
  const timestamp = now.toISOString();

  const session = groupSessionSchema.parse({
    createdAt: timestamp,
    hostUid: invite.senderUid,
    sharedEquipmentMode: "UNSET",
    startAt: null,
    stationMode: "ROTATION_SHARED_STATION",
    status: "LOBBY",
    updatedAt: timestamp,
    weightChangeMode: "UNSET",
    weightChangeSeconds: null,
    workoutPlanId: invite.workoutPlanId,
    workoutPlanVersionId: invite.workoutPlanVersionId,
  });

  const participants = [
    groupParticipantSchema.parse({
      completedAt: null,
      displaySnapshot: {
        avatar: invite.senderAvatar,
        displayName: invite.senderDisplayName,
        publicUserId: invite.senderPublicUserId,
      },
      joinedAt: timestamp,
      leftAt: null,
      operationalState: "WAITING_TURN",
      operationalStateUpdatedAt: null,
      readyAt: null,
      role: "HOST",
      status: "INVITED",
      uid: invite.senderUid,
    }),
    groupParticipantSchema.parse({
      completedAt: null,
      displaySnapshot: {
        avatar: invite.receiverAvatar,
        displayName: invite.receiverDisplayName,
        publicUserId: invite.receiverPublicUserId,
      },
      joinedAt: timestamp,
      leftAt: null,
      operationalState: "WAITING_TURN",
      operationalStateUpdatedAt: null,
      readyAt: null,
      role: "MEMBER",
      status: "READY",
      uid: invite.receiverUid,
    }),
  ];

  return { participants, session };
}

export function configureGroupLobby(
  session: GroupSession,
  actorUid: string,
  configuration: GroupLobbyConfiguration,
  now: Date = new Date(),
): GroupSession {
  if (session.hostUid !== actorUid) {
    throw new Error("Apenas o host pode configurar o lobby.");
  }
  if (session.status !== "LOBBY") {
    throw new Error("O lobby não pode ser alterado depois do início do treino.");
  }
  if (
    configuration.weightChangeMode === "CUSTOM" &&
    (!configuration.weightChangeSeconds || configuration.weightChangeSeconds < 1)
  ) {
    throw new Error("Informe o tempo personalizado para trocar a carga.");
  }

  return groupSessionSchema.parse({
    ...session,
    sharedEquipmentMode: configuration.sharedEquipmentMode,
    stationMode: configuration.stationMode,
    updatedAt: now.toISOString(),
    weightChangeMode: configuration.weightChangeMode,
    weightChangeSeconds:
      configuration.weightChangeMode === "CUSTOM" ? configuration.weightChangeSeconds : null,
  });
}

export function setGroupParticipantReady(
  participant: GroupParticipant,
  ready: boolean,
  now: Date = new Date(),
): GroupParticipant {
  if (participant.status !== "INVITED" && participant.status !== "READY") {
    throw new Error("O estado de pronto só pode ser alterado no lobby.");
  }

  return groupParticipantSchema.parse({
    ...participant,
    readyAt: ready ? now.toISOString() : null,
    status: ready ? "READY" : "INVITED",
  });
}

export function startGroupSession(
  session: GroupSession,
  actorUid: string,
  participants: GroupParticipant[],
  now: Date = new Date(),
  countdownSeconds = 5,
): GroupSession {
  if (session.hostUid !== actorUid) {
    throw new Error("Apenas o host pode iniciar o treino.");
  }
  if (session.status === "COUNTDOWN" || session.status === "ACTIVE") {
    return session;
  }
  if (session.status !== "LOBBY") {
    throw new Error("A sessão não pode ser iniciada neste estado.");
  }
  if (
    participants.length < 2 ||
    participants.some((participant) => participant.status !== "READY")
  ) {
    throw new Error("Todos os participantes precisam estar prontos.");
  }
  if (!Number.isInteger(countdownSeconds) || countdownSeconds < 3 || countdownSeconds > 10) {
    throw new Error("A contagem precisa ter entre 3 e 10 segundos.");
  }

  return groupSessionSchema.parse({
    ...session,
    startAt: new Date(now.getTime() + countdownSeconds * 1000).toISOString(),
    status: "COUNTDOWN",
    updatedAt: now.toISOString(),
  });
}

export function finishGroupSession(
  session: GroupSession,
  actorUid: string,
  participants: GroupParticipant[],
  now: Date = new Date(),
): GroupSessionDraft {
  if (session.hostUid !== actorUid) {
    throw new Error("Apenas o host pode encerrar o treino em grupo.");
  }
  if (session.status === "COMPLETED") {
    return { participants, session };
  }
  if (session.status === "CANCELLED") {
    throw new Error("A sessão já foi cancelada.");
  }
  if (!["ACTIVE", "PAUSED", "COUNTDOWN", "LOBBY"].includes(session.status)) {
    throw new Error("A sessão não pode ser encerrada neste estado.");
  }

  const timestamp = now.toISOString();
  const nextParticipants = participants.map((participant) => {
    if (participant.status === "LEFT" || participant.status === "COMPLETED") {
      return groupParticipantSchema.parse({
        ...participant,
        completedAt:
          participant.status === "COMPLETED" ? participant.completedAt : participant.completedAt,
      });
    }

    return groupParticipantSchema.parse({
      ...participant,
      completedAt: timestamp,
      operationalState: "PAUSED",
      operationalStateUpdatedAt: timestamp,
      status: "COMPLETED",
    });
  });

  return {
    participants: nextParticipants,
    session: groupSessionSchema.parse({
      ...session,
      status: "COMPLETED",
      updatedAt: timestamp,
    }),
  };
}

export function estimateGroupLobbyDurationSeconds(
  participantCount: number,
  stationMode: GroupSession["stationMode"],
  weightChangeSeconds: number,
  soloDurationSeconds = 45 * 60,
  equipmentTransitionSeconds = 0,
): number {
  const safeParticipants = Math.max(1, Math.floor(participantCount));
  const safeWeightChange = Math.max(0, Math.floor(weightChangeSeconds));
  const safeEquipmentTransition = Math.max(0, Math.floor(equipmentTransitionSeconds));
  const extraParticipants = safeParticipants - 1;
  const stationMultiplier =
    stationMode === "ROTATION_SHARED_STATION"
      ? 0.22
      : stationMode === "PARALLEL_SAME_EXERCISE"
        ? 0.12
        : 0.05;
  const estimatedTransitions = Math.max(3, Math.round(soloDurationSeconds / 600));

  return Math.round(
    soloDurationSeconds * (1 + extraParticipants * stationMultiplier) +
      extraParticipants * estimatedTransitions * (safeWeightChange + safeEquipmentTransition),
  );
}
