import { z } from "zod";

/**
 * Fila local de eventos pendentes. Cada evento tem id determinístico, então
 * reenviar, reconectar ou recarregar a página nunca duplica nem sobrescreve o
 * que o servidor já registrou.
 */

export const pendingEventKindOptions = ["WORKOUT_SET", "GROUP_SET", "SESSION_STATE"] as const;

export type PendingEventKind = (typeof pendingEventKindOptions)[number];

export const pendingEventSchema = z.object({
  attempts: z.number().int().nonnegative().default(0),
  eventId: z.string().trim().min(1).max(200),
  kind: z.enum(pendingEventKindOptions),
  payload: z.record(z.string(), z.unknown()),
  queuedAt: z.string().datetime(),
});

export type PendingEvent = z.infer<typeof pendingEventSchema>;

export const pendingEventQueueSchema = z.array(pendingEventSchema);

export type SyncStatus = Readonly<{
  pendingCount: number;
  state: "SYNCED" | "PENDING";
}>;

/** Enfileira sem duplicar: o mesmo `eventId` substitui a entrada anterior. */
export function enqueuePendingEvent(
  queue: readonly PendingEvent[],
  event: PendingEvent,
): PendingEvent[] {
  const parsed = pendingEventSchema.parse(event);
  const existing = queue.find((item) => item.eventId === parsed.eventId);

  return [
    ...queue.filter((item) => item.eventId !== parsed.eventId),
    { ...parsed, attempts: existing ? existing.attempts : parsed.attempts },
  ];
}

export function removePendingEvent(
  queue: readonly PendingEvent[],
  eventId: string,
): PendingEvent[] {
  return queue.filter((item) => item.eventId !== eventId);
}

export function markPendingEventAttempt(
  queue: readonly PendingEvent[],
  eventId: string,
): PendingEvent[] {
  return queue.map((item) =>
    item.eventId === eventId ? { ...item, attempts: item.attempts + 1 } : item,
  );
}

export function resolveSyncStatus(queue: readonly PendingEvent[]): SyncStatus {
  return {
    pendingCount: queue.length,
    state: queue.length === 0 ? "SYNCED" : "PENDING",
  };
}

export type RemoteEventRef = Readonly<{ eventId: string }>;

/**
 * Reconcilia a fila local com o que já existe no servidor. Um evento que o
 * servidor confirmou sai da fila; o que ainda não chegou permanece na ordem em
 * que foi registrado. Nada é sobrescrito: o servidor é a fonte de verdade.
 */
export function reconcilePendingEvents(
  queue: readonly PendingEvent[],
  remoteEvents: readonly RemoteEventRef[],
): Readonly<{ confirmed: PendingEvent[]; pending: PendingEvent[] }> {
  const remoteIds = new Set(remoteEvents.map((event) => event.eventId));

  return {
    confirmed: queue.filter((item) => remoteIds.has(item.eventId)),
    pending: queue.filter((item) => !remoteIds.has(item.eventId)),
  };
}

/**
 * Une eventos remotos e pendentes para exibição. O remoto vence sempre que os
 * dois existem, e a ordem é estável por `eventId` para não “pular” na tela.
 */
export function mergeEventsForDisplay<T extends { eventId: string }>(
  remoteEvents: readonly T[],
  pendingEvents: readonly T[],
): T[] {
  const merged = new Map<string, T>();

  for (const event of pendingEvents) {
    merged.set(event.eventId, event);
  }

  for (const event of remoteEvents) {
    merged.set(event.eventId, event);
  }

  return [...merged.values()].sort((left, right) => left.eventId.localeCompare(right.eventId));
}
