/**
 * Weekly projection arithmetic for server-side crediting. Mirrors
 * `src/domain/progression/weekly-stats.ts`; keep both in sync.
 * Single processing per event is guaranteed by the `processedEvents` ledger,
 * never by this module.
 */

import { defaultWeekStartsOn, defaultWeekTimeZone } from "./week-key.js";

export function createEmptyWeeklyStats(identity) {
  return {
    cardioSeconds: 0,
    cardioSessions: 0,
    completedWorkouts: 0,
    extraWorkouts: 0,
    groupWorkouts: 0,
    plannedTarget: identity.plannedTarget ?? 0,
    plannedWorkouts: 0,
    soloWorkouts: 0,
    timeZone: identity.timeZone ?? defaultWeekTimeZone,
    totalReps: 0,
    totalSets: 0,
    totalVolumeKg: 0,
    uid: identity.uid,
    weekKey: identity.weekKey,
    weekStartsOn: identity.weekStartsOn ?? defaultWeekStartsOn,
  };
}

export function applyWorkoutCompletion(stats, event) {
  if (event.uid !== stats.uid) {
    throw new Error("Uma projeção semanal só agrega eventos da própria pessoa.");
  }

  const isCardio = event.kind === "CARDIO";
  const countsCardio = isCardio || Boolean(event.cardioCompleted);

  return {
    ...stats,
    cardioSeconds: stats.cardioSeconds + (event.cardioSeconds ?? 0),
    cardioSessions: stats.cardioSessions + (countsCardio ? 1 : 0),
    completedWorkouts: stats.completedWorkouts + (isCardio ? 0 : 1),
    extraWorkouts: stats.extraWorkouts + (!isCardio && event.source === "EXTRA" ? 1 : 0),
    groupWorkouts: stats.groupWorkouts + (!isCardio && event.mode === "GROUP" ? 1 : 0),
    plannedWorkouts: stats.plannedWorkouts + (!isCardio && event.source === "PLANNED" ? 1 : 0),
    soloWorkouts: stats.soloWorkouts + (!isCardio && event.mode === "SOLO" ? 1 : 0),
    totalReps: stats.totalReps + (event.totalReps ?? 0),
    totalSets: stats.totalSets + (event.totalSets ?? 0),
    totalVolumeKg: Math.round((stats.totalVolumeKg + (event.totalVolumeKg ?? 0)) * 100) / 100,
  };
}

export function projectWeeklyStats(identity, events) {
  const unique = new Map();
  for (const event of events) {
    if (event.uid === identity.uid) {
      unique.set(event.eventId, event);
    }
  }

  return [...unique.values()]
    .sort((left, right) => String(left.completedAt).localeCompare(String(right.completedAt)))
    .reduce(applyWorkoutCompletion, createEmptyWeeklyStats(identity));
}

/** Totals a participant's immutable group set events. */
export function summarizeSetDocuments(documents) {
  let totalReps = 0;
  let totalSets = 0;
  let totalVolumeKg = 0;

  for (const document of documents) {
    const data = typeof document.data === "function" ? document.data() : document;
    const reps = Number(data?.reps);
    const loadKg = Number(data?.loadKg);
    if (!Number.isFinite(reps) || reps <= 0) {
      continue;
    }

    totalSets += 1;
    totalReps += reps;
    if (Number.isFinite(loadKg) && loadKg > 0) {
      totalVolumeKg += loadKg * reps;
    }
  }

  return {
    totalReps,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
  };
}
