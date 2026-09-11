import { estimateWorkoutDuration } from "@/domain/workout/workout";
import type { WorkoutSession } from "@/domain/workout/session";
import { resolveDynamicWorkoutTitle } from "@/domain/workout/muscle-split";

/**
 * Leitura de apresentacao de uma sessao de forca. Tudo aqui e derivado dos
 * dados persistidos - nada e estimado alem da duracao prevista, que usa o
 * mesmo estimador do gerador de planos.
 */
export type WorkoutSessionOverview = Readonly<{
  completedExercises: number;
  completedSets: number;
  /** Duracao real (inicio a conclusao), so quando os dois horarios existem. */
  durationSeconds: number | null;
  estimatedMinutes: number;
  exerciseCount: number;
  status: "not_started" | "in_progress" | "strength_done" | "completed";
  title: string;
  totalReps: number;
  totalSets: number;
  totalVolumeKg: number;
}>;


export function getActiveExercise(
  session: WorkoutSession,
): WorkoutSession["exerciseQueue"][number] | null {
  const current = session.exerciseQueue[session.currentExerciseIndex];

  if (!current || current.completedSets >= current.prescription.sets) {
    return null;
  }

  return current;
}

export function resolveWorkoutTitle(session: WorkoutSession): string {
  return resolveDynamicWorkoutTitle(session);
}

export function describeWorkoutSession(session: WorkoutSession): WorkoutSessionOverview {
  const totalSets = session.exerciseQueue.reduce((sum, item) => sum + item.prescription.sets, 0);
  const completedSets = session.exerciseQueue.reduce((sum, item) => sum + item.completedSets, 0);
  const estimate = estimateWorkoutDuration({
    exercises: session.exerciseQueue.map((item) => item.prescription),
  });
  const started = session.startedAt ? Date.parse(session.startedAt) : Number.NaN;
  const completed = session.completedAt ? Date.parse(session.completedAt) : Number.NaN;
  const durationSeconds =
    Number.isFinite(started) && Number.isFinite(completed) && completed >= started
      ? Math.round((completed - started) / 1000)
      : null;
  const status: WorkoutSessionOverview["status"] =
    session.status === "COMPLETED"
      ? "completed"
      : getActiveExercise(session) === null
        ? "strength_done"
        : completedSets > 0
          ? "in_progress"
          : "not_started";

  return {
    completedExercises: session.exerciseQueue.filter(
      (item) => item.completedSets >= item.prescription.sets,
    ).length,
    completedSets: session.progress.totalSets,
    durationSeconds,
    estimatedMinutes: Math.max(5, Math.round(estimate.totalSeconds / 60)),
    exerciseCount: session.exerciseQueue.length,
    status,
    title: resolveWorkoutTitle(session),
    totalReps: session.progress.totalReps,
    totalSets,
    totalVolumeKg: session.progress.totalVolume,
  };
}

/** 87 -> "01:27"; usado no descanso, onde os segundos importam. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Tempo de treino decorrido: "32:18" ou "1:05:10" depois da primeira hora. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatKg(loadKg: number): string {
  if (loadKg <= 0) {
    return "peso corporal";
  }

  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(loadKg)} kg`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatDurationShort(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `${minutes} min`;
}
