import { z } from "zod";

/**
 * Deterministic progression: history, personal records, volume and overload
 * suggestions. Nothing here changes a load by itself — a suggestion is always
 * something the person confirms.
 */

const reference = z.string().trim().min(1).max(160);

export const exerciseSetResultSchema = z.object({
  completedAt: z.string().datetime(),
  exerciseId: reference,
  loadKg: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  rir: z.number().int().min(0).max(10).nullable().default(null),
  sessionId: reference,
  setIndex: z.number().int().positive(),
  uid: reference,
});

export type ExerciseSetResult = z.infer<typeof exerciseSetResultSchema>;

export type PersonalRecord = Readonly<{
  achievedAt: string;
  exerciseId: string;
  loadKg: number;
  reps: number;
  sessionId: string;
  volumeKg: number;
}>;

/** Volume of one set. Incomplete data (zero load or reps) contributes nothing. */
export function computeSetVolume(set: Pick<ExerciseSetResult, "loadKg" | "reps">): number {
  if (!Number.isFinite(set.loadKg) || !Number.isFinite(set.reps)) {
    return 0;
  }

  if (set.loadKg <= 0 || set.reps <= 0) {
    return 0;
  }

  return Math.round(set.loadKg * set.reps * 100) / 100;
}

export function computeTotalVolume(sets: readonly ExerciseSetResult[]): number {
  return Math.round(sets.reduce((total, set) => total + computeSetVolume(set), 0) * 100) / 100;
}

/** Last result of an exercise, by completion time. */
export function findLastResult(
  sets: readonly ExerciseSetResult[],
  exerciseId: string,
): ExerciseSetResult | null {
  const ordered = sets
    .filter((set) => set.exerciseId === exerciseId)
    .sort((left, right) => left.completedAt.localeCompare(right.completedAt));

  return ordered.at(-1) ?? null;
}

/**
 * A personal record is the heaviest set of an exercise; ties are broken by more
 * repetitions and then by the earlier date, so the same history always produces
 * the same record.
 */
export function detectPersonalRecord(
  sets: readonly ExerciseSetResult[],
  exerciseId: string,
): PersonalRecord | null {
  const candidates = sets.filter(
    (set) => set.exerciseId === exerciseId && set.loadKg > 0 && set.reps > 0,
  );

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((champion, set) => {
    if (set.loadKg !== champion.loadKg) {
      return set.loadKg > champion.loadKg ? set : champion;
    }

    if (set.reps !== champion.reps) {
      return set.reps > champion.reps ? set : champion;
    }

    return set.completedAt < champion.completedAt ? set : champion;
  });

  return {
    achievedAt: best.completedAt,
    exerciseId,
    loadKg: best.loadKg,
    reps: best.reps,
    sessionId: best.sessionId,
    volumeKg: computeSetVolume(best),
  };
}

/** True when `candidate` beats every previous set of the same exercise. */
export function isNewPersonalRecord(
  previousSets: readonly ExerciseSetResult[],
  candidate: ExerciseSetResult,
): boolean {
  const previous = detectPersonalRecord(previousSets, candidate.exerciseId);

  if (candidate.loadKg <= 0 || candidate.reps <= 0) {
    return false;
  }

  if (!previous) {
    return true;
  }

  if (candidate.loadKg !== previous.loadKg) {
    return candidate.loadKg > previous.loadKg;
  }

  return candidate.reps > previous.reps;
}

export const progressionActionOptions = [
  "INCREASE_LOAD",
  "ADD_REP",
  "HOLD",
  "REDUCE_LOAD",
] as const;

export type ProgressionAction = (typeof progressionActionOptions)[number];

export type ProgressionSuggestion = Readonly<{
  action: ProgressionAction;
  /** Always true: the person confirms; the app never changes the load alone. */
  needsConfirmation: true;
  reason: string;
  suggestedLoadKg: number;
  suggestedReps: number;
}>;

export type ProgressionTarget = Readonly<{
  repsMax: number;
  repsMin: number;
  rirTarget?: number | null;
}>;

/** Smallest usable jump on common equipment (two 1.25 kg plates). */
const loadStepKg = 2.5;

function roundToStep(loadKg: number): number {
  const rounded = Math.round(loadKg / loadStepKg) * loadStepKg;
  return Math.max(loadStepKg, Math.round(rounded * 100) / 100);
}

/**
 * Suggests the next load from the last result and the prescription. The output
 * is a proposal: `needsConfirmation` is always true and no caller may apply it
 * without the person accepting.
 */
export function suggestProgression(
  lastResult: ExerciseSetResult | null,
  target: ProgressionTarget,
): ProgressionSuggestion | null {
  if (!lastResult || lastResult.loadKg <= 0 || lastResult.reps <= 0) {
    return null;
  }

  const rirTarget = target.rirTarget ?? 2;
  const reachedTop = lastResult.reps >= target.repsMax;
  const belowFloor = lastResult.reps < target.repsMin;
  const easy = lastResult.rir !== null && lastResult.rir > rirTarget;
  const tooHard = lastResult.rir !== null && lastResult.rir < Math.max(0, rirTarget - 1);

  if (belowFloor && tooHard) {
    return {
      action: "REDUCE_LOAD",
      needsConfirmation: true,
      reason: "A última série ficou abaixo da faixa com esforço alto demais.",
      suggestedLoadKg: Math.max(loadStepKg, roundToStep(lastResult.loadKg - loadStepKg)),
      suggestedReps: target.repsMin,
    };
  }

  if (reachedTop && (easy || lastResult.rir === null)) {
    return {
      action: "INCREASE_LOAD",
      needsConfirmation: true,
      reason: "Você fechou o topo da faixa de repetições com folga.",
      suggestedLoadKg: roundToStep(lastResult.loadKg + loadStepKg),
      suggestedReps: target.repsMin,
    };
  }

  if (!reachedTop && easy) {
    return {
      action: "ADD_REP",
      needsConfirmation: true,
      reason: "Ainda há espaço na faixa de repetições com a mesma carga.",
      suggestedLoadKg: lastResult.loadKg,
      suggestedReps: Math.min(target.repsMax, lastResult.reps + 1),
    };
  }

  return {
    action: "HOLD",
    needsConfirmation: true,
    reason: "Mantenha a carga para consolidar a execução.",
    suggestedLoadKg: lastResult.loadKg,
    suggestedReps: Math.max(target.repsMin, Math.min(target.repsMax, lastResult.reps)),
  };
}

export type VolumePoint = Readonly<{
  label: string;
  volumeKg: number;
}>;

/** Series of volume per session, oldest first, ready for a chart. */
export function buildVolumeSeries(sets: readonly ExerciseSetResult[]): VolumePoint[] {
  const bySession = new Map<string, { label: string; volumeKg: number }>();

  for (const set of sets) {
    const day = set.completedAt.slice(0, 10);
    const current = bySession.get(set.sessionId) ?? { label: day, volumeKg: 0 };
    current.volumeKg = Math.round((current.volumeKg + computeSetVolume(set)) * 100) / 100;
    current.label = day < current.label ? day : current.label;
    bySession.set(set.sessionId, current);
  }

  return [...bySession.values()].sort((left, right) => left.label.localeCompare(right.label));
}
