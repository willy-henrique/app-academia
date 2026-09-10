import { estimateWorkoutDuration } from "@/domain/workout/workout";
import type { WorkoutSession } from "@/domain/workout/session";

/**
 * Leitura de apresentação de uma sessão de força. Tudo aqui é derivado dos
 * dados persistidos — nada é estimado além da duração prevista, que usa o
 * mesmo estimador do gerador de planos.
 */
export type WorkoutSessionOverview = Readonly<{
  completedExercises: number;
  completedSets: number;
  /** Duração real (início → conclusão), só quando os dois horários existem. */
  durationSeconds: number | null;
  estimatedMinutes: number;
  exerciseCount: number;
  status: "not_started" | "in_progress" | "strength_done" | "completed";
  title: string;
  totalReps: number;
  totalSets: number;
  totalVolumeKg: number;
}>;

const genericBlockTitles = new Set(["bloco principal"]);

/**
 * Exercício que ainda aceita séries, ou `null` quando a parte de força acabou.
 *
 * Ao concluir o último exercício, `advanceWorkoutExercise` mantém o índice nele
 * (não há próximo) e a sessão fica `PAUSED`. Olhar só para o índice mostraria
 * "Série 4 de 3" e deixaria gravar séries além da prescrição; por isso a
 * decisão usa as séries concluídas, que são o dado persistido.
 */
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
  const blockTitle = session.exerciseQueue[0]?.blockTitle?.trim();

  if (!blockTitle || genericBlockTitles.has(blockTitle.toLocaleLowerCase("pt-BR"))) {
    return "Treino de força";
  }

  return blockTitle;
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
    completedExercises: session.progress.completedExercises.length,
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

/** 87 → "01:27"; usado no descanso, onde os segundos importam. */
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
  const mmss = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/** 2640 → "44 min"; 4380 → "1h13". */
export function formatDurationShort(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h${rest.toString().padStart(2, "0")}` : `${minutes} min`;
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} kg`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

/** "1 série", "3 séries" — sem "(s)". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
