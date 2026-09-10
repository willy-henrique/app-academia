"use client";

import {
  enqueuePendingEvent,
  markPendingEventAttempt,
  pendingEventQueueSchema,
  reconcilePendingEvents,
  removePendingEvent,
  resolveSyncStatus,
  type PendingEvent,
  type SyncStatus,
} from "@/domain/offline/sync-queue";
import {
  workoutSessionSchema,
  type WorkoutSession,
  type WorkoutSet,
} from "@/domain/workout/session";

import {
  buildWorkoutSetDocumentId,
  saveWorkoutSession,
  saveWorkoutSet,
  workoutSetExists,
} from "./workout-repository";

const sessionStorageKey = "willtreino.workout-session.v1";
const queueStorageKey = "willtreino.workout-pending-sets.v1";

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Guarda a sessão ativa no aparelho para sobreviver a refresh e queda de rede. */
export function persistActiveWorkoutSession(session: WorkoutSession): void {
  storage()?.setItem(sessionStorageKey, JSON.stringify(session));
}

export function loadActiveWorkoutSession(): WorkoutSession | null {
  const raw = storage()?.getItem(sessionStorageKey);
  if (!raw) {
    return null;
  }

  const parsed = workoutSessionSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    storage()?.removeItem(sessionStorageKey);
    return null;
  }

  return parsed.data;
}

export function clearActiveWorkoutSession(): void {
  storage()?.removeItem(sessionStorageKey);
}

function loadQueue(): PendingEvent[] {
  const raw = storage()?.getItem(queueStorageKey);
  if (!raw) {
    return [];
  }

  const parsed = pendingEventQueueSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    storage()?.removeItem(queueStorageKey);
    return [];
  }

  return parsed.data;
}

function saveQueue(queue: readonly PendingEvent[]): void {
  storage()?.setItem(queueStorageKey, JSON.stringify(queue));
}

export function getWorkoutSyncStatus(): SyncStatus {
  return resolveSyncStatus(loadQueue());
}

function isRecoverableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = String((error as { code?: unknown }).code ?? "").toLowerCase();
  return [
    "aborted",
    "cancelled",
    "deadline-exceeded",
    "internal",
    "network-request-failed",
    "unavailable",
    "unknown",
  ].includes(code);
}

/**
 * Salva a série. Se a rede falhar por erro recuperável, a série fica na fila
 * local com o mesmo id determinístico que ela terá no servidor — por isso o
 * reenvio nunca duplica nem sobrescreve o que já foi gravado.
 */
export async function saveWorkoutSetWithOfflineFallback(
  uid: string,
  session: WorkoutSession,
  set: WorkoutSet,
): Promise<SyncStatus & { status: "SYNCED" | "QUEUED" }> {
  persistActiveWorkoutSession(session);

  try {
    await saveWorkoutSet(uid, session, set);
    return { ...getWorkoutSyncStatus(), status: "SYNCED" };
  } catch (error) {
    if (!isRecoverableError(error)) {
      throw error;
    }

    saveQueue(
      enqueuePendingEvent(loadQueue(), {
        attempts: 0,
        eventId: buildWorkoutSetDocumentId(session, set),
        kind: "WORKOUT_SET",
        payload: { session, set, uid },
        queuedAt: new Date().toISOString(),
      }),
    );

    return { ...getWorkoutSyncStatus(), status: "QUEUED" };
  }
}

/**
 * Reenvia a fila. Antes de gravar, confirma se o servidor já tem o evento: um
 * set confirmado que voltou como erro ao navegador sai da fila sem regravar.
 */
export async function flushPendingWorkoutSets(): Promise<SyncStatus & { syncedCount: number }> {
  let queue = loadQueue();
  let syncedCount = 0;

  for (const pending of [...queue]) {
    const { session, set, uid } = pending.payload as {
      session: WorkoutSession;
      set: WorkoutSet;
      uid: string;
    };

    try {
      if (await workoutSetExists(session.id, pending.eventId)) {
        queue = removePendingEvent(queue, pending.eventId);
        saveQueue(queue);
        syncedCount += 1;
        continue;
      }

      await saveWorkoutSet(uid, session, set);
      await saveWorkoutSession(uid, session);
      queue = removePendingEvent(queue, pending.eventId);
      saveQueue(queue);
      syncedCount += 1;
    } catch (error) {
      queue = markPendingEventAttempt(queue, pending.eventId);
      saveQueue(queue);

      if (!isRecoverableError(error)) {
        throw error;
      }

      break;
    }
  }

  return { ...resolveSyncStatus(queue), syncedCount };
}

/** Remove da fila o que o servidor já confirmou, sem sobrescrever nada. */
export function reconcileWorkoutQueue(remoteSetIds: readonly string[]): SyncStatus {
  const { pending } = reconcilePendingEvents(
    loadQueue(),
    remoteSetIds.map((eventId) => ({ eventId })),
  );
  saveQueue(pending);
  return resolveSyncStatus(pending);
}
