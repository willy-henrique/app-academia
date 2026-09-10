import { z } from "zod";

import type { WorkoutPlan, WorkoutPlanVersion } from "./workout";
import { workoutPlanSchema } from "./workout";

export const workoutSessionStatusOptions = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;
export const workoutSetCompletionStatusOptions = ["PENDING", "COMPLETED", "SKIPPED"] as const;
export const workoutOptionalCardioStatusOptions = [
  "NOT_STARTED",
  "SKIPPED",
  "COMPLETED",
  "DEFERRED",
] as const;

const workoutSessionExerciseStateSchema = z.object({
  blockId: z.string().trim().min(1).max(120),
  blockKind: z.string().trim().min(1).max(40),
  blockOrder: z.number().int().nonnegative(),
  blockTitle: z.string().trim().min(1).max(140),
  completedSets: z.number().int().nonnegative().default(0),
  exerciseId: z.string().trim().min(1).max(120),
  exerciseName: z.string().trim().min(1).max(140),
  lastSetCompletedAt: z.string().datetime().nullable().default(null),
  order: z.number().int().positive(),
  prescription: z.object({
    exerciseId: z.string().trim().min(1).max(120),
    exerciseName: z.string().trim().min(1).max(140),
    loadStrategy: z.enum(["last_used", "manual", "estimated"]).default("last_used"),
    notes: z.string().trim().max(500).nullable().default(null),
    repsMax: z.number().int().positive(),
    repsMin: z.number().int().positive(),
    restSeconds: z.number().int().positive(),
    rirTarget: z.number().int().min(0).max(10).nullable().default(null),
    sets: z.number().int().positive(),
  }),
  replacementExerciseId: z.string().trim().min(1).max(120).nullable().default(null),
  replacementExerciseName: z.string().trim().min(1).max(140).nullable().default(null),
  restExpectedEndAt: z.string().datetime().nullable().default(null),
  restStartedAt: z.string().datetime().nullable().default(null),
  restTargetSeconds: z.number().int().nonnegative().default(0),
  status: z.enum(["pending", "active", "completed", "swapped"]).default("pending"),
  swapReason: z.string().trim().max(500).nullable().default(null),
});

export const workoutSetSchema = z.object({
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.unknown().optional(),
  // Guarda o exercício da série para que histórico, PR e progressão sejam
  // calculáveis sem depender do id do documento.
  exerciseId: z.string().trim().min(1).max(120).default("unknown"),
  feedback: z.string().trim().max(500).nullable().default(null),
  loadKg: z.number().positive(),
  notes: z.string().trim().max(500).nullable().default(null),
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10),
  sessionId: z.string().trim().min(1).max(120),
  setIndex: z.number().int().positive(),
  uid: z.string().trim().min(1).max(120),
  updatedAt: z.unknown().optional(),
});

export const workoutSessionSchema = z.object({
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.unknown().optional(),
  currentExerciseIndex: z.number().int().nonnegative().default(0),
  currentSetIndex: z.number().int().nonnegative().default(0),
  currentWorkoutExerciseId: z.string().trim().min(1).max(120).nullable().default(null),
  currentWorkoutExerciseName: z.string().trim().min(1).max(140).nullable().default(null),
  exerciseQueue: z.array(workoutSessionExerciseStateSchema).default([]),
  id: z.string().trim().min(1).max(120),
  lastSetCompletedAt: z.string().datetime().nullable().default(null),
  optionalCardioStatus: z.enum(workoutOptionalCardioStatusOptions).default("NOT_STARTED"),
  optionalCardioSkippedAt: z.string().datetime().nullable().default(null),
  optionalCardioCompletedAt: z.string().datetime().nullable().default(null),
  ownerUid: z.string().trim().min(1).max(120),
  planId: z.string().trim().min(1).max(120),
  planVersionId: z.string().trim().min(1).max(120),
  progress: z
    .object({
      completedExercises: z.array(z.string().trim().min(1).max(120)).default([]),
      totalReps: z.number().int().nonnegative().default(0),
      totalSets: z.number().int().nonnegative().default(0),
      totalVolume: z.number().nonnegative().default(0),
    })
    .default({
      completedExercises: [],
      totalReps: 0,
      totalSets: 0,
      totalVolume: 0,
    }),
  recoveryFeedback: z.string().trim().max(2000).nullable().default(null),
  restExpectedEndAt: z.string().datetime().nullable().default(null),
  restStartedAt: z.string().datetime().nullable().default(null),
  restTargetSeconds: z.number().int().nonnegative().default(0),
  startedAt: z.string().datetime().nullable().default(null),
  status: z.enum(workoutSessionStatusOptions).default("PLANNED"),
  updatedAt: z.unknown().optional(),
});

export type WorkoutSessionStatus = (typeof workoutSessionStatusOptions)[number];
export type WorkoutSetCompletionStatus = (typeof workoutSetCompletionStatusOptions)[number];
export type WorkoutOptionalCardioStatus = (typeof workoutOptionalCardioStatusOptions)[number];

export type WorkoutSessionExerciseState = z.infer<typeof workoutSessionExerciseStateSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema>;
export type WorkoutSession = z.infer<typeof workoutSessionSchema>;

export interface WorkoutSessionTimerState {
  elapsedSeconds: number;
  remainingSeconds: number;
  ready: boolean;
}

export interface WorkoutSetInput {
  feedback?: string | null;
  loadKg: number;
  notes?: string | null;
  reps: number;
  rir: number;
  setIndex: number;
}

function toIsoDate(value: Date): string {
  return value.toISOString();
}

function cloneWorkoutSession(session: WorkoutSession): WorkoutSession {
  return workoutSessionSchema.parse(structuredClone(session));
}

function flattenPlanVersion(version: WorkoutPlanVersion): WorkoutSessionExerciseState[] {
  const queue: WorkoutSessionExerciseState[] = [];
  let order = 1;

  for (const block of version.blocks) {
    for (const prescription of block.prescriptions) {
      queue.push(
        workoutSessionExerciseStateSchema.parse({
          blockId: block.id,
          blockKind: block.kind,
          blockOrder: block.order,
          blockTitle: block.title,
          completedSets: 0,
          exerciseId: prescription.exerciseId,
          exerciseName: prescription.exerciseName,
          lastSetCompletedAt: null,
          order,
          prescription,
          replacementExerciseId: null,
          replacementExerciseName: null,
          restExpectedEndAt: null,
          restStartedAt: null,
          restTargetSeconds: prescription.restSeconds,
          status: "pending",
          swapReason: null,
        }),
      );
      order += 1;
    }
  }

  return queue;
}

export function createWorkoutSessionFromPlan(
  plan: WorkoutPlan,
  sessionId?: string,
  now: Date = new Date(),
): WorkoutSession {
  const parsedPlan = workoutPlanSchema.parse(plan);
  const activeVersion = parsedPlan.versions.find(
    (version) => version.id === parsedPlan.activeVersionId,
  );

  if (!activeVersion) {
    throw new Error("Versão ativa não encontrada no plano.");
  }

  const firstExercise = flattenPlanVersion(activeVersion)[0] ?? null;
  const session = workoutSessionSchema.parse({
    completedAt: null,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    currentWorkoutExerciseId: firstExercise?.exerciseId ?? null,
    currentWorkoutExerciseName: firstExercise?.exerciseName ?? null,
    exerciseQueue: flattenPlanVersion(activeVersion),
    id: sessionId ?? `${parsedPlan.id}-session`,
    lastSetCompletedAt: null,
    optionalCardioCompletedAt: null,
    optionalCardioSkippedAt: null,
    optionalCardioStatus: "NOT_STARTED",
    ownerUid: parsedPlan.ownerUid,
    planId: parsedPlan.id,
    planVersionId: activeVersion.id,
    progress: {
      completedExercises: [],
      totalReps: 0,
      totalSets: 0,
      totalVolume: 0,
    },
    recoveryFeedback: null,
    restExpectedEndAt: null,
    restStartedAt: null,
    restTargetSeconds: 0,
    startedAt: null,
    status: "PLANNED",
  });

  return workoutSessionSchema.parse({
    ...session,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export function startWorkoutSession(
  session: WorkoutSession,
  startedAt: Date = new Date(),
): WorkoutSession {
  const next = cloneWorkoutSession(session);
  if (next.startedAt) {
    return next;
  }

  next.startedAt = toIsoDate(startedAt);
  next.status = "ACTIVE";
  next.updatedAt = startedAt.toISOString();
  return next;
}

export function getWorkoutRestState(
  session: WorkoutSession,
  now: Date = new Date(),
): WorkoutSessionTimerState {
  if (!session.restStartedAt || !session.restExpectedEndAt || session.restTargetSeconds <= 0) {
    return {
      elapsedSeconds: 0,
      remainingSeconds: 0,
      ready: true,
    };
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.restStartedAt).getTime()) / 1000),
  );
  const remainingSeconds = Math.max(
    0,
    Math.ceil((new Date(session.restExpectedEndAt).getTime() - now.getTime()) / 1000),
  );

  return {
    elapsedSeconds,
    remainingSeconds,
    ready: remainingSeconds === 0,
  };
}

export function adjustWorkoutRest(
  session: WorkoutSession,
  secondsDelta: number,
  now: Date = new Date(),
): WorkoutSession {
  const next = cloneWorkoutSession(session);
  const currentExercise = next.exerciseQueue[next.currentExerciseIndex];

  if (!currentExercise || !next.restStartedAt || !next.restExpectedEndAt) {
    return next;
  }

  const currentExpectedEnd = new Date(next.restExpectedEndAt).getTime();
  const nextExpectedEnd = Math.max(now.getTime(), currentExpectedEnd + secondsDelta * 1000);
  const nextRemainingSeconds = Math.max(0, Math.ceil((nextExpectedEnd - now.getTime()) / 1000));
  const nextElapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(next.restStartedAt).getTime()) / 1000),
  );

  currentExercise.restExpectedEndAt = new Date(nextExpectedEnd).toISOString();
  currentExercise.restTargetSeconds = nextElapsedSeconds + nextRemainingSeconds;
  next.restExpectedEndAt = currentExercise.restExpectedEndAt;
  next.restTargetSeconds = currentExercise.restTargetSeconds;
  next.updatedAt = now.toISOString();

  return next;
}

export function skipWorkoutRest(session: WorkoutSession, now: Date = new Date()): WorkoutSession {
  const next = cloneWorkoutSession(session);
  const currentExercise = next.exerciseQueue[next.currentExerciseIndex];

  if (!currentExercise) {
    return next;
  }

  currentExercise.restStartedAt = null;
  currentExercise.restExpectedEndAt = null;
  currentExercise.restTargetSeconds = 0;
  next.restStartedAt = null;
  next.restExpectedEndAt = null;
  next.restTargetSeconds = 0;
  next.updatedAt = now.toISOString();

  return next;
}

export function recordWorkoutSet(
  session: WorkoutSession,
  input: WorkoutSetInput,
  completedAt: Date = new Date(),
): WorkoutSession {
  const next = cloneWorkoutSession(session);
  if (next.status === "COMPLETED" || next.status === "CANCELLED") {
    return next;
  }

  const currentExercise = next.exerciseQueue[next.currentExerciseIndex];
  if (!currentExercise) {
    return next;
  }

  currentExercise.completedSets = Math.min(
    currentExercise.prescription.sets,
    currentExercise.completedSets + 1,
  );
  currentExercise.lastSetCompletedAt = toIsoDate(completedAt);
  currentExercise.restStartedAt = toIsoDate(completedAt);
  currentExercise.restTargetSeconds = currentExercise.prescription.restSeconds;
  currentExercise.restExpectedEndAt = new Date(
    completedAt.getTime() + currentExercise.restTargetSeconds * 1000,
  ).toISOString();
  currentExercise.status =
    currentExercise.completedSets >= currentExercise.prescription.sets ? "completed" : "active";

  next.currentSetIndex = input.setIndex;
  next.currentWorkoutExerciseId = currentExercise.exerciseId;
  next.currentWorkoutExerciseName = currentExercise.exerciseName;
  next.lastSetCompletedAt = currentExercise.lastSetCompletedAt;
  next.restStartedAt = currentExercise.restStartedAt;
  next.restExpectedEndAt = currentExercise.restExpectedEndAt;
  next.restTargetSeconds = currentExercise.restTargetSeconds;
  next.progress.totalSets += 1;
  next.progress.totalReps += input.reps;
  next.progress.totalVolume += input.loadKg * input.reps;
  next.updatedAt = completedAt.toISOString();

  return next;
}

export function advanceWorkoutExercise(
  session: WorkoutSession,
  now: Date = new Date(),
): WorkoutSession {
  const next = cloneWorkoutSession(session);
  const currentExercise = next.exerciseQueue[next.currentExerciseIndex];
  if (currentExercise && currentExercise.completedSets < currentExercise.prescription.sets) {
    return next;
  }

  if (currentExercise && !next.progress.completedExercises.includes(currentExercise.exerciseId)) {
    next.progress.completedExercises.push(currentExercise.exerciseId);
  }

  const nextExerciseIndex = next.currentExerciseIndex + 1;
  const nextExercise = next.exerciseQueue[nextExerciseIndex];
  next.currentExerciseIndex = nextExercise ? nextExerciseIndex : next.currentExerciseIndex;
  next.currentSetIndex = 0;
  next.currentWorkoutExerciseId = nextExercise?.exerciseId ?? null;
  next.currentWorkoutExerciseName = nextExercise?.exerciseName ?? null;
  next.lastSetCompletedAt = null;
  next.restStartedAt = null;
  next.restExpectedEndAt = null;
  next.restTargetSeconds = 0;
  next.updatedAt = now.toISOString();

  if (!nextExercise) {
    next.status = next.optionalCardioStatus === "COMPLETED" ? "COMPLETED" : "PAUSED";
  } else {
    next.exerciseQueue[next.currentExerciseIndex].status = "active";
  }

  return next;
}

export function swapWorkoutExercise(
  session: WorkoutSession,
  replacement: Pick<WorkoutSessionExerciseState, "exerciseId" | "exerciseName">,
  reason: string,
  now: Date = new Date(),
): WorkoutSession {
  const next = cloneWorkoutSession(session);
  const currentExercise = next.exerciseQueue[next.currentExerciseIndex];
  if (!currentExercise) {
    return next;
  }

  currentExercise.replacementExerciseId = replacement.exerciseId;
  currentExercise.replacementExerciseName = replacement.exerciseName;
  currentExercise.swapReason = reason;
  currentExercise.exerciseId = replacement.exerciseId;
  currentExercise.exerciseName = replacement.exerciseName;
  currentExercise.status = "swapped";
  next.currentWorkoutExerciseId = replacement.exerciseId;
  next.currentWorkoutExerciseName = replacement.exerciseName;
  next.updatedAt = now.toISOString();

  return next;
}

export function finishWorkoutSession(
  session: WorkoutSession,
  now: Date = new Date(),
  optionalCardioStatus: Exclude<WorkoutOptionalCardioStatus, "NOT_STARTED"> = "SKIPPED",
): WorkoutSession {
  const next = cloneWorkoutSession(session);

  next.optionalCardioStatus = optionalCardioStatus;
  if (optionalCardioStatus === "SKIPPED") {
    next.optionalCardioSkippedAt = toIsoDate(now);
  }
  if (optionalCardioStatus === "COMPLETED") {
    next.optionalCardioCompletedAt = toIsoDate(now);
  }

  next.completedAt = toIsoDate(now);
  next.status = "COMPLETED";
  next.updatedAt = now.toISOString();
  return next;
}
