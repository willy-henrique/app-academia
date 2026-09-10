import { z } from "zod";

import type { GroupSession } from "./group-session";

const participantUidSchema = z.string().trim().min(1).max(128);

export const groupTurnSchema = z.object({
  participantUid: participantUidSchema,
  round: z.number().int().positive(),
  turnIndex: z.number().int().nonnegative(),
});

export const groupTurnQueueSchema = z.object({
  currentTurnIndex: z.number().int().nonnegative(),
  participantUids: z.array(participantUidSchema).min(2).max(8),
  stationMode: z.enum([
    "ROTATION_SHARED_STATION",
    "PARALLEL_SAME_EXERCISE",
    "INDEPENDENT_STATIONS",
  ]),
  turns: z.array(groupTurnSchema).min(2),
});

export type GroupTurn = z.infer<typeof groupTurnSchema>;
export type GroupTurnQueue = z.infer<typeof groupTurnQueueSchema>;

function assertUniqueParticipants(participantUids: readonly string[]): void {
  if (new Set(participantUids).size !== participantUids.length) {
    throw new Error("Cada participante pode aparecer uma única vez na fila.");
  }
}

/**
 * Creates a predictable station rotation. The first uid must be the host when
 * the shared session uses a host-led rotation. Parallel/independent modes keep
 * the same participants but do not create artificial extra turns.
 */
export function createGroupTurnQueue(
  participantUids: readonly string[],
  stationMode: GroupSession["stationMode"],
): GroupTurnQueue {
  const normalizedParticipantUids = participantUids.map((uid) => participantUidSchema.parse(uid));
  assertUniqueParticipants(normalizedParticipantUids);

  const turns = normalizedParticipantUids.map((participantUid, turnIndex) => ({
    participantUid,
    round: 1,
    turnIndex,
  }));

  return groupTurnQueueSchema.parse({
    currentTurnIndex: 0,
    participantUids: normalizedParticipantUids,
    stationMode,
    turns,
  });
}

export function getCurrentGroupTurn(queue: GroupTurnQueue): GroupTurn {
  const parsedQueue = groupTurnQueueSchema.parse(queue);
  const participantIndex = parsedQueue.currentTurnIndex % parsedQueue.participantUids.length;
  return groupTurnSchema.parse({
    participantUid: parsedQueue.participantUids[participantIndex],
    round: Math.floor(parsedQueue.currentTurnIndex / parsedQueue.participantUids.length) + 1,
    turnIndex: parsedQueue.currentTurnIndex,
  });
}

export function getUpcomingGroupTurns(queue: GroupTurnQueue, count: number): GroupTurn[] {
  const parsedQueue = groupTurnQueueSchema.parse(queue);
  const safeCount = Math.max(0, Math.floor(count));

  return Array.from({ length: safeCount }, (_, offset) => {
    const absoluteIndex = parsedQueue.currentTurnIndex + offset;
    const participantIndex = absoluteIndex % parsedQueue.participantUids.length;
    const round = Math.floor(absoluteIndex / parsedQueue.participantUids.length) + 1;

    return groupTurnSchema.parse({
      participantUid: parsedQueue.participantUids[participantIndex],
      round,
      turnIndex: absoluteIndex,
    });
  });
}

export function advanceGroupTurnQueue(queue: GroupTurnQueue): GroupTurnQueue {
  const parsedQueue = groupTurnQueueSchema.parse(queue);
  const nextTurnIndex = parsedQueue.currentTurnIndex + 1;
  const nextTurns = getUpcomingGroupTurns(
    { ...parsedQueue, currentTurnIndex: nextTurnIndex },
    parsedQueue.participantUids.length,
  );

  return groupTurnQueueSchema.parse({
    ...parsedQueue,
    currentTurnIndex: nextTurnIndex,
    turns: nextTurns,
  });
}
