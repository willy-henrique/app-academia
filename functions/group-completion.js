/**
 * Closing rules for a shared group session. Mirrors
 * `src/domain/group/group-completion.ts`; keep both in sync.
 */

const completableSessionStatuses = ["ACTIVE", "PAUSED"];
const nonCompletableParticipantStatuses = ["LEFT", "INVITED"];

export function decideGroupParticipationCompletion(participantStatus, sessionStatus) {
  if (participantStatus === "COMPLETED") {
    return { allowed: true, alreadyCompleted: true };
  }

  if (nonCompletableParticipantStatuses.includes(participantStatus)) {
    return {
      allowed: false,
      reason:
        participantStatus === "LEFT"
          ? "Quem saiu do treino não pode concluí-lo."
          : "É necessário estar no treino para concluí-lo.",
    };
  }

  if (!completableSessionStatuses.includes(sessionStatus)) {
    return { allowed: false, reason: "Esta sessão não está em andamento." };
  }

  return { allowed: true, alreadyCompleted: false };
}

export function resolveGroupSessionClosure(participantStatuses, currentStatus) {
  if (!completableSessionStatuses.includes(currentStatus) || participantStatuses.length === 0) {
    return currentStatus;
  }

  const stillTraining = participantStatuses.some(
    (status) => status !== "COMPLETED" && status !== "LEFT",
  );
  if (stillTraining) {
    return currentStatus;
  }

  return participantStatuses.includes("COMPLETED") ? "COMPLETED" : "CANCELLED";
}
