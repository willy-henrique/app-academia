import { z } from "zod";

import type { GroupSession } from "./group-session";

const participantUidSchema = z.string().trim().min(1).max(128);
const isoDateSchema = z.string().datetime();
const nonNegativeSecondsSchema = z
  .number()
  .int()
  .min(0)
  .max(60 * 60);

export const groupRestEngineInputSchema = z.object({
  equipmentTransitionSeconds: nonNegativeSecondsSchema,
  estimatedSetDurationSeconds: nonNegativeSecondsSchema,
  now: isoDateSchema,
  participantCount: z.number().int().min(2).max(8),
  participantLastSetCompletedAt: z.record(participantUidSchema, isoDateSchema.nullable()),
  participantUid: participantUidSchema,
  stationMode: z.enum([
    "ROTATION_SHARED_STATION",
    "PARALLEL_SAME_EXERCISE",
    "INDEPENDENT_STATIONS",
  ] satisfies readonly GroupSession["stationMode"][]),
  targetRestSeconds: nonNegativeSecondsSchema,
  weightChangeSeconds: nonNegativeSecondsSchema,
});

export type GroupRestEngineInput = z.infer<typeof groupRestEngineInputSchema>;

export const groupRestStateSchema = z.object({
  elapsedRecoverySeconds: nonNegativeSecondsSchema,
  estimatedInterveningRecoverySeconds: nonNegativeSecondsSchema,
  estimatedRemainingRestAtNextTurnSeconds: nonNegativeSecondsSchema,
  isRecommendedRestComplete: z.boolean(),
  remainingRestSeconds: nonNegativeSecondsSchema,
  restExpectedEndAt: isoDateSchema.nullable(),
  status: z.enum(["NOT_STARTED", "RESTING", "READY"]),
});

export type GroupRestState = z.infer<typeof groupRestStateSchema>;

function getEstimatedInterveningRecoverySeconds(input: GroupRestEngineInput): number {
  if (input.stationMode !== "ROTATION_SHARED_STATION") {
    return 0;
  }

  const otherParticipants = input.participantCount - 1;
  const secondsPerOtherTurn =
    input.estimatedSetDurationSeconds +
    input.equipmentTransitionSeconds +
    input.weightChangeSeconds;

  return otherParticipants * secondsPerOtherTurn;
}

/**
 * Computes individual recovery from authoritative timestamps. The projected
 * next-turn field is a planning aid only: the current rest never relies on a
 * JavaScript countdown or gets a second full target added after a rotation.
 */
export function evaluateGroupRest(input: GroupRestEngineInput): GroupRestState {
  const parsedInput = groupRestEngineInputSchema.parse(input);
  const participantUids = Object.keys(parsedInput.participantLastSetCompletedAt);

  if (participantUids.length !== parsedInput.participantCount) {
    throw new Error("A quantidade de participantes precisa corresponder aos timestamps recebidos.");
  }

  const lastSetCompletedAt = parsedInput.participantLastSetCompletedAt[parsedInput.participantUid];
  if (lastSetCompletedAt === undefined) {
    throw new Error("O participante precisa possuir uma entrada de recuperação.");
  }

  if (!lastSetCompletedAt) {
    return groupRestStateSchema.parse({
      elapsedRecoverySeconds: 0,
      estimatedInterveningRecoverySeconds: 0,
      estimatedRemainingRestAtNextTurnSeconds: 0,
      isRecommendedRestComplete: true,
      remainingRestSeconds: 0,
      restExpectedEndAt: null,
      status: "NOT_STARTED",
    });
  }

  const nowMs = new Date(parsedInput.now).getTime();
  const lastSetMs = new Date(lastSetCompletedAt).getTime();
  const elapsedRecoverySeconds = Math.max(0, Math.floor((nowMs - lastSetMs) / 1000));
  const remainingRestSeconds = Math.max(0, parsedInput.targetRestSeconds - elapsedRecoverySeconds);
  const estimatedInterveningRecoverySeconds = getEstimatedInterveningRecoverySeconds(parsedInput);
  const estimatedRemainingRestAtNextTurnSeconds = Math.max(
    0,
    parsedInput.targetRestSeconds - elapsedRecoverySeconds - estimatedInterveningRecoverySeconds,
  );

  return groupRestStateSchema.parse({
    elapsedRecoverySeconds,
    estimatedInterveningRecoverySeconds,
    estimatedRemainingRestAtNextTurnSeconds,
    isRecommendedRestComplete: remainingRestSeconds === 0,
    remainingRestSeconds,
    restExpectedEndAt: new Date(lastSetMs + parsedInput.targetRestSeconds * 1000).toISOString(),
    status: remainingRestSeconds === 0 ? "READY" : "RESTING",
  });
}
