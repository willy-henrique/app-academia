import { z } from "zod";

import {
  groupParticipantStatusOptions,
  groupSessionStatusOptions,
  type GroupParticipant,
  type GroupSession,
} from "./group-session";

export type GroupParticipantStatus = (typeof groupParticipantStatusOptions)[number];
export type GroupSessionStatus = (typeof groupSessionStatusOptions)[number];

export const groupParticipantClosureSchema = z.object({
  status: z.enum(groupParticipantStatusOptions),
  uid: z.string().trim().min(1),
});

export type GroupParticipantClosure = z.infer<typeof groupParticipantClosureSchema>;

/**
 * Statuses in which the shared session still accepts individual completion.
 * A session that already closed (COMPLETED/CANCELLED) never reopens.
 */
const completableSessionStatuses: readonly GroupSessionStatus[] = ["ACTIVE", "PAUSED"];

/** Individual statuses that cannot transition into COMPLETED. */
const nonCompletableParticipantStatuses: readonly GroupParticipantStatus[] = ["LEFT", "INVITED"];

export type GroupParticipationCompletionDecision =
  | Readonly<{ allowed: true; alreadyCompleted: boolean }>
  | Readonly<{ allowed: false; reason: string }>;

/**
 * Decides whether a participant may close their own participation. Completion is
 * always individual: it never depends on what the other people are doing and it
 * never removes anyone else's sets.
 */
export function decideGroupParticipationCompletion(
  participant: Pick<GroupParticipant, "status">,
  session: Pick<GroupSession, "status">,
): GroupParticipationCompletionDecision {
  if (participant.status === "COMPLETED") {
    return { allowed: true, alreadyCompleted: true };
  }

  if (nonCompletableParticipantStatuses.includes(participant.status)) {
    return {
      allowed: false,
      reason:
        participant.status === "LEFT"
          ? "Quem saiu do treino não pode concluí-lo."
          : "É necessário estar no treino para concluí-lo.",
    };
  }

  if (!completableSessionStatuses.includes(session.status)) {
    return { allowed: false, reason: "Esta sessão não está em andamento." };
  }

  return { allowed: true, alreadyCompleted: false };
}

/**
 * Applies the shared-session closing rules after an individual transition.
 * The session only closes when nobody is still training; it becomes COMPLETED
 * when at least one person finished and CANCELLED when everyone left.
 */
export function resolveGroupSessionClosure(
  participants: readonly GroupParticipantClosure[],
  currentStatus: GroupSessionStatus,
): GroupSessionStatus {
  if (!completableSessionStatuses.includes(currentStatus)) {
    return currentStatus;
  }

  if (participants.length === 0) {
    return currentStatus;
  }

  const stillTraining = participants.some(
    (participant) => participant.status !== "COMPLETED" && participant.status !== "LEFT",
  );

  if (stillTraining) {
    return currentStatus;
  }

  return participants.some((participant) => participant.status === "COMPLETED")
    ? "COMPLETED"
    : "CANCELLED";
}
