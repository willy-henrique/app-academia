"use client";

import { doc, getDoc } from "firebase/firestore";
import { z } from "zod";

import { reconcilePendingEvents } from "@/domain/offline/sync-queue";
import {
  groupParticipantSetSchema,
  type GroupParticipantSet,
} from "@/domain/group/group-participant-set";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

import { saveGroupParticipantSet } from "./group-workout-repository";

const pendingGroupParticipantSetSyncSchema = z.object({
  queuedAt: z.string().datetime(),
  set: groupParticipantSetSchema,
  syncKey: z.string().trim().min(1),
});

const pendingGroupParticipantSetSyncListSchema = z.array(pendingGroupParticipantSetSyncSchema);

export type GroupConnectionState = "ONLINE" | "BACKGROUND" | "OFFLINE" | "RECONNECTING";

export type PendingGroupParticipantSetSync = z.infer<typeof pendingGroupParticipantSetSyncSchema>;

export type GroupParticipantSetSyncResult = Readonly<{
  pendingCount: number;
  status: "SYNCED" | "QUEUED";
}>;

const pendingSyncStorageKey = "willtreino.group-participant-set-sync.v1";

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function syncKeyForSet(set: GroupParticipantSet): string {
  return `${set.groupSessionId}:${set.uid}:${set.eventId}`;
}

function isRecoverableSyncError(error: unknown): boolean {
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

function loadPendingSyncs(): PendingGroupParticipantSetSync[] {
  const storage = getBrowserStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(pendingSyncStorageKey);
  if (!raw) {
    return [];
  }

  try {
    return pendingGroupParticipantSetSyncListSchema.parse(JSON.parse(raw));
  } catch {
    storage.removeItem(pendingSyncStorageKey);
    return [];
  }
}

function savePendingSyncs(syncs: PendingGroupParticipantSetSync[]): void {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  storage.setItem(pendingSyncStorageKey, JSON.stringify(syncs));
}

function removePendingSync(syncKey: string): void {
  const next = loadPendingSyncs().filter((sync) => sync.syncKey !== syncKey);
  savePendingSyncs(next);
}

export function getPendingGroupParticipantSetSyncs(): PendingGroupParticipantSetSync[] {
  return loadPendingSyncs();
}

export function getPendingGroupParticipantSetSyncCount(): number {
  return loadPendingSyncs().length;
}

export function enqueuePendingGroupParticipantSetSync(
  set: GroupParticipantSet,
  queuedAt: Date = new Date(),
): PendingGroupParticipantSetSync {
  const parsedSet = groupParticipantSetSchema.parse(set);
  const sync: PendingGroupParticipantSetSync = {
    queuedAt: queuedAt.toISOString(),
    set: parsedSet,
    syncKey: syncKeyForSet(parsedSet),
  };
  const next = loadPendingSyncs().filter((item) => item.syncKey !== sync.syncKey);
  next.push(sync);
  savePendingSyncs(next);
  return sync;
}

export async function flushPendingGroupParticipantSetSyncs(): Promise<{
  pendingCount: number;
  syncedCount: number;
}> {
  const pending = loadPendingSyncs();
  let syncedCount = 0;

  for (const sync of pending) {
    const { firestore } = getFirebaseClientServices();
    const setRef = doc(
      firestore,
      "groupSessions",
      sync.set.groupSessionId,
      "participants",
      sync.set.uid,
      "sets",
      sync.set.eventId,
    );

    try {
      const existing = await getDoc(setRef);
      if (existing.exists()) {
        removePendingSync(sync.syncKey);
        syncedCount += 1;
        continue;
      }

      await saveGroupParticipantSet(sync.set);
      removePendingSync(sync.syncKey);
      syncedCount += 1;
    } catch (error) {
      if (!isRecoverableSyncError(error)) {
        throw error;
      }

      break;
    }
  }

  return {
    pendingCount: loadPendingSyncs().length,
    syncedCount,
  };
}

export async function saveGroupParticipantSetWithOfflineFallback(
  set: GroupParticipantSet,
): Promise<GroupParticipantSetSyncResult> {
  try {
    await saveGroupParticipantSet(set);
    return {
      pendingCount: getPendingGroupParticipantSetSyncCount(),
      status: "SYNCED",
    };
  } catch (error) {
    if (!isRecoverableSyncError(error)) {
      throw error;
    }

    enqueuePendingGroupParticipantSetSync(set);
    return {
      pendingCount: getPendingGroupParticipantSetSyncCount(),
      status: "QUEUED",
    };
  }
}

/**
 * Reconcilia a fila local com o que o servidor já registrou para esta pessoa.
 * Usado na reconexão: o evento confirmado sai da fila e o restante permanece,
 * sem sobrescrever séries — nem as próprias, nem as de quem treina junto.
 */
export function reconcileGroupParticipantSetQueue(remoteEventIds: readonly string[]): number {
  const queue = loadPendingSyncs();
  const { pending } = reconcilePendingEvents(
    queue.map((sync) => ({
      attempts: 0,
      eventId: sync.syncKey,
      kind: "GROUP_SET" as const,
      payload: { set: sync.set },
      queuedAt: sync.queuedAt,
    })),
    remoteEventIds.map((eventId) => ({ eventId })),
  );
  const pendingKeys = new Set(pending.map((event) => event.eventId));
  const next = queue.filter((sync) => pendingKeys.has(sync.syncKey));
  savePendingSyncs(next);

  return next.length;
}

export function subscribeToGroupConnectionState(
  onChange: (state: GroupConnectionState) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const emit = () => {
    if (document.visibilityState === "hidden") {
      onChange("BACKGROUND");
      return;
    }

    onChange(window.navigator.onLine ? "ONLINE" : "OFFLINE");
  };

  const handleOnline = () => onChange("RECONNECTING");
  const handleOffline = () => onChange("OFFLINE");
  const handleVisibilityChange = () => emit();

  emit();
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
