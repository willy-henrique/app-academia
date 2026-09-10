import { z } from "zod";

import { defaultWeekStartsOn, defaultWeekTimeZone, weekStartOptions } from "./week-key";

export const workoutCompletionSourceOptions = ["PLANNED", "EXTRA"] as const;
export const workoutCompletionModeOptions = ["SOLO", "GROUP"] as const;
export const workoutCompletionKindOptions = ["STRENGTH", "CARDIO"] as const;

export type WorkoutCompletionSource = (typeof workoutCompletionSourceOptions)[number];
export type WorkoutCompletionMode = (typeof workoutCompletionModeOptions)[number];
export type WorkoutCompletionKind = (typeof workoutCompletionKindOptions)[number];

const reference = z.string().trim().min(1).max(160);

export const workoutCompletionEventSchema = z.object({
  cardioCompleted: z.boolean().default(false),
  cardioSeconds: z.number().int().nonnegative().default(0),
  completedAt: z.string().datetime(),
  eventId: reference,
  kind: z.enum(workoutCompletionKindOptions).default("STRENGTH"),
  mode: z.enum(workoutCompletionModeOptions),
  planId: reference.nullable().default(null),
  planVersionId: reference.nullable().default(null),
  source: z.enum(workoutCompletionSourceOptions),
  totalReps: z.number().int().nonnegative().default(0),
  totalSets: z.number().int().nonnegative().default(0),
  totalVolumeKg: z.number().nonnegative().default(0),
  uid: reference,
});

export type WorkoutCompletionEvent = z.infer<typeof workoutCompletionEventSchema>;

export const weeklyStatsSchema = z.object({
  cardioSeconds: z.number().int().nonnegative().default(0),
  cardioSessions: z.number().int().nonnegative().default(0),
  completedWorkouts: z.number().int().nonnegative().default(0),
  extraWorkouts: z.number().int().nonnegative().default(0),
  groupWorkouts: z.number().int().nonnegative().default(0),
  plannedTarget: z.number().int().nonnegative().default(0),
  plannedWorkouts: z.number().int().nonnegative().default(0),
  soloWorkouts: z.number().int().nonnegative().default(0),
  timeZone: z.string().trim().min(1).max(64).default(defaultWeekTimeZone),
  totalReps: z.number().int().nonnegative().default(0),
  totalSets: z.number().int().nonnegative().default(0),
  totalVolumeKg: z.number().nonnegative().default(0),
  uid: reference,
  updatedAt: z.unknown().optional(),
  weekKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekStartsOn: z.enum(weekStartOptions).default(defaultWeekStartsOn),
});

export type WeeklyStats = z.infer<typeof weeklyStatsSchema>;

export type WeeklyStatsIdentity = Readonly<{
  plannedTarget?: number;
  timeZone?: string;
  uid: string;
  weekKey: string;
  weekStartsOn?: (typeof weekStartOptions)[number];
}>;

export function createEmptyWeeklyStats(identity: WeeklyStatsIdentity): WeeklyStats {
  return weeklyStatsSchema.parse({
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
  });
}

/**
 * Folds one completion into the weekly projection. The function is pure and
 * additive: single processing per event is guaranteed by the server ledger, not
 * by this engine.
 */
export function applyWorkoutCompletion(
  stats: WeeklyStats,
  event: WorkoutCompletionEvent,
): WeeklyStats {
  const parsedStats = weeklyStatsSchema.parse(stats);
  const parsedEvent = workoutCompletionEventSchema.parse(event);

  if (parsedEvent.uid !== parsedStats.uid) {
    throw new Error("Uma projeção semanal só agrega eventos da própria pessoa.");
  }

  const isCardio = parsedEvent.kind === "CARDIO";
  const countsCardio = isCardio || parsedEvent.cardioCompleted;

  // Cardio e força são eixos separados: uma sessão de cardio nunca vira treino
  // de força, e pular cardio não reduz nenhuma métrica de força.
  return weeklyStatsSchema.parse({
    ...parsedStats,
    cardioSeconds: parsedStats.cardioSeconds + parsedEvent.cardioSeconds,
    cardioSessions: parsedStats.cardioSessions + (countsCardio ? 1 : 0),
    completedWorkouts: parsedStats.completedWorkouts + (isCardio ? 0 : 1),
    extraWorkouts:
      parsedStats.extraWorkouts + (!isCardio && parsedEvent.source === "EXTRA" ? 1 : 0),
    groupWorkouts: parsedStats.groupWorkouts + (!isCardio && parsedEvent.mode === "GROUP" ? 1 : 0),
    plannedWorkouts:
      parsedStats.plannedWorkouts + (!isCardio && parsedEvent.source === "PLANNED" ? 1 : 0),
    soloWorkouts: parsedStats.soloWorkouts + (!isCardio && parsedEvent.mode === "SOLO" ? 1 : 0),
    totalReps: parsedStats.totalReps + parsedEvent.totalReps,
    totalSets: parsedStats.totalSets + parsedEvent.totalSets,
    totalVolumeKg: Math.round((parsedStats.totalVolumeKg + parsedEvent.totalVolumeKg) * 100) / 100,
  });
}

/** Rebuilds a week from scratch. Duplicated `eventId`s are collapsed. */
export function projectWeeklyStats(
  identity: WeeklyStatsIdentity,
  events: readonly WorkoutCompletionEvent[],
): WeeklyStats {
  const unique = new Map<string, WorkoutCompletionEvent>();
  for (const event of events) {
    const parsed = workoutCompletionEventSchema.parse(event);
    if (parsed.uid === identity.uid) {
      unique.set(parsed.eventId, parsed);
    }
  }

  return [...unique.values()]
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt))
    .reduce(applyWorkoutCompletion, createEmptyWeeklyStats(identity));
}

export type PlanAdherence = Readonly<{
  completedPlanned: number;
  extraWorkouts: number;
  plannedTarget: number;
  rate: number;
}>;

/**
 * Adherence only counts workouts that fulfil the plan, capped at the weekly
 * target: extra workouts are reported separately as `+n` and never inflate it.
 */
export function resolvePlanAdherence(stats: WeeklyStats): PlanAdherence {
  const parsed = weeklyStatsSchema.parse(stats);
  const completedPlanned = Math.min(parsed.plannedWorkouts, parsed.plannedTarget);

  return {
    completedPlanned,
    extraWorkouts: parsed.extraWorkouts,
    plannedTarget: parsed.plannedTarget,
    rate:
      parsed.plannedTarget === 0
        ? 0
        : Math.round((completedPlanned / parsed.plannedTarget) * 100) / 100,
  };
}

export function formatExtraWorkouts(stats: WeeklyStats): string {
  const parsed = weeklyStatsSchema.parse(stats);
  return parsed.extraWorkouts > 0 ? `+${parsed.extraWorkouts}` : "0";
}
