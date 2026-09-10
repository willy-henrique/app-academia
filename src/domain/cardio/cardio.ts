import { z } from "zod";

export const cardioRequirementOptions = ["OPTIONAL", "RECOMMENDED", "PROGRAM_REQUIRED"] as const;

export const cardioModalityOptions = [
  "WALK",
  "RUN",
  "BIKE",
  "ROW",
  "ELLIPTICAL",
  "STAIRS",
  "OTHER",
] as const;

export const cardioIntensityOptions = ["LOW", "MODERATE", "HIGH"] as const;

export const cardioSessionStatusOptions = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "SKIPPED",
  "RESCHEDULED",
] as const;

export const cardioSourceOptions = ["WORKOUT", "STANDALONE"] as const;

export type CardioRequirement = (typeof cardioRequirementOptions)[number];
export type CardioModality = (typeof cardioModalityOptions)[number];
export type CardioIntensity = (typeof cardioIntensityOptions)[number];
export type CardioSessionStatus = (typeof cardioSessionStatusOptions)[number];
export type CardioSource = (typeof cardioSourceOptions)[number];

const reference = z.string().trim().min(1).max(120);

export const cardioPrescriptionSchema = z.object({
  intensity: z.enum(cardioIntensityOptions).default("MODERATE"),
  modality: z.enum(cardioModalityOptions).default("WALK"),
  notes: z.string().trim().max(500).nullable().default(null),
  requirement: z.enum(cardioRequirementOptions).default("OPTIONAL"),
  targetSeconds: z
    .number()
    .int()
    .min(60)
    .max(4 * 60 * 60),
});

export type CardioPrescription = z.infer<typeof cardioPrescriptionSchema>;

export const cardioSessionSchema = z.object({
  completedAt: z.string().datetime().nullable().default(null),
  createdAt: z.unknown().optional(),
  distanceMeters: z.number().nonnegative().nullable().default(null),
  durationSeconds: z.number().int().nonnegative().default(0),
  id: reference,
  ownerUid: reference,
  prescription: cardioPrescriptionSchema,
  rescheduledFor: z.string().datetime().nullable().default(null),
  skipReason: z.string().trim().max(500).nullable().default(null),
  skippedAt: z.string().datetime().nullable().default(null),
  source: z.enum(cardioSourceOptions).default("STANDALONE"),
  startedAt: z.string().datetime().nullable().default(null),
  status: z.enum(cardioSessionStatusOptions).default("PLANNED"),
  updatedAt: z.unknown().optional(),
  workoutSessionId: reference.nullable().default(null),
});

export type CardioSession = z.infer<typeof cardioSessionSchema>;

/** Default prescriptions per requirement, used when a plan has no explicit cardio. */
const defaultTargetSeconds: Record<CardioRequirement, number> = {
  OPTIONAL: 10 * 60,
  PROGRAM_REQUIRED: 20 * 60,
  RECOMMENDED: 15 * 60,
};

export function createCardioPrescription(
  requirement: CardioRequirement,
  overrides: Partial<Omit<CardioPrescription, "requirement">> = {},
): CardioPrescription {
  return cardioPrescriptionSchema.parse({
    intensity: overrides.intensity ?? "MODERATE",
    modality: overrides.modality ?? "WALK",
    notes: overrides.notes ?? null,
    requirement,
    targetSeconds: overrides.targetSeconds ?? defaultTargetSeconds[requirement],
  });
}

export type CreateCardioSessionInput = Readonly<{
  id: string;
  ownerUid: string;
  prescription: CardioPrescription;
  source?: CardioSource;
  workoutSessionId?: string | null;
}>;

export function createCardioSession(
  input: CreateCardioSessionInput,
  now: Date = new Date(),
): CardioSession {
  return cardioSessionSchema.parse({
    completedAt: null,
    createdAt: now.toISOString(),
    distanceMeters: null,
    durationSeconds: 0,
    id: input.id,
    ownerUid: input.ownerUid,
    prescription: input.prescription,
    rescheduledFor: null,
    skipReason: null,
    skippedAt: null,
    source: input.source ?? "STANDALONE",
    startedAt: null,
    status: "PLANNED",
    updatedAt: now.toISOString(),
    workoutSessionId: input.workoutSessionId ?? null,
  });
}

function clone(session: CardioSession): CardioSession {
  return cardioSessionSchema.parse(structuredClone(session));
}

function isClosed(session: CardioSession): boolean {
  return session.status === "COMPLETED" || session.status === "SKIPPED";
}

export function startCardioSession(session: CardioSession, now: Date = new Date()): CardioSession {
  if (isClosed(session)) {
    return session;
  }

  const next = clone(session);
  next.status = "ACTIVE";
  next.startedAt = next.startedAt ?? now.toISOString();
  next.rescheduledFor = null;
  next.updatedAt = now.toISOString();
  return next;
}

export type CompleteCardioInput = Readonly<{
  distanceMeters?: number | null;
  durationSeconds: number;
}>;

/** Completing is idempotent: a session already closed keeps its first result. */
export function completeCardioSession(
  session: CardioSession,
  input: CompleteCardioInput,
  now: Date = new Date(),
): CardioSession {
  if (isClosed(session)) {
    return session;
  }

  const next = clone(session);
  next.completedAt = now.toISOString();
  next.distanceMeters = input.distanceMeters ?? null;
  next.durationSeconds = Math.max(0, Math.round(input.durationSeconds));
  next.startedAt = next.startedAt ?? now.toISOString();
  next.status = "COMPLETED";
  next.updatedAt = now.toISOString();
  return next;
}

/**
 * Skipping is always explicit and keeps the reason. A required cardio can be
 * skipped — the person is never locked out of finishing their strength work —
 * but the skip is recorded as such and never counted as done.
 */
export function skipCardioSession(
  session: CardioSession,
  reason: string,
  now: Date = new Date(),
): CardioSession {
  if (isClosed(session)) {
    return session;
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    throw new Error("Informe o motivo para pular o cardio.");
  }

  const next = clone(session);
  next.skipReason = trimmedReason.slice(0, 500);
  next.skippedAt = now.toISOString();
  next.status = "SKIPPED";
  next.updatedAt = now.toISOString();
  return next;
}

/**
 * Rescheduling moves a pending cardio to another moment. It never marks the
 * cardio as done, so adherence is not falsified by moving it around.
 */
export function rescheduleCardioSession(
  session: CardioSession,
  scheduledFor: Date,
  now: Date = new Date(),
): CardioSession {
  if (isClosed(session)) {
    return session;
  }

  if (scheduledFor.getTime() <= now.getTime()) {
    throw new Error("Escolha um horário futuro para reagendar o cardio.");
  }

  const next = clone(session);
  next.rescheduledFor = scheduledFor.toISOString();
  next.status = "RESCHEDULED";
  next.updatedAt = now.toISOString();
  return next;
}

/** Cardio never blocks strength: the strength session closes on its own. */
export function blocksStrengthCompletion(): false {
  return false;
}

export function isCardioPending(session: CardioSession): boolean {
  return !isClosed(session);
}

export function describeCardioRequirement(requirement: CardioRequirement): string {
  if (requirement === "PROGRAM_REQUIRED") {
    return "Cardio do programa";
  }

  return requirement === "RECOMMENDED" ? "Cardio recomendado" : "Cardio opcional";
}
