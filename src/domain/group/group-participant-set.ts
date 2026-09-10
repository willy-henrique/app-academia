import { z } from "zod";

const referenceSchema = z.string().trim().min(1).max(128);

export const groupParticipantSetSchema = z.object({
  completedAt: z.string().datetime(),
  eventId: referenceSchema,
  exerciseId: referenceSchema,
  feedback: z.string().trim().max(500).nullable().default(null),
  groupSessionId: referenceSchema,
  id: referenceSchema,
  loadKg: z.number().nonnegative(),
  notes: z.string().trim().max(500).nullable().default(null),
  reps: z.number().int().positive(),
  rir: z.number().int().min(0).max(10).nullable().default(null),
  setIndex: z.number().int().positive(),
  uid: referenceSchema,
});

export type GroupParticipantSet = z.infer<typeof groupParticipantSetSchema>;

export type GroupParticipantSetInput = Readonly<{
  eventId: string;
  exerciseId: string;
  feedback?: string | null;
  groupSessionId: string;
  loadKg: number;
  notes?: string | null;
  reps: number;
  rir?: number | null;
  setIndex: number;
  uid: string;
}>;

/**
 * A completed set is an immutable participant event. The event id is supplied
 * by the caller so offline/retry flows can safely de-duplicate it later.
 */
export function recordGroupParticipantSet(
  input: GroupParticipantSetInput,
  completedAt: Date = new Date(),
): GroupParticipantSet {
  return groupParticipantSetSchema.parse({
    completedAt: completedAt.toISOString(),
    eventId: input.eventId,
    exerciseId: input.exerciseId,
    feedback: input.feedback ?? null,
    groupSessionId: input.groupSessionId,
    id: input.eventId,
    loadKg: input.loadKg,
    notes: input.notes ?? null,
    reps: input.reps,
    rir: input.rir ?? null,
    setIndex: input.setIndex,
    uid: input.uid,
  });
}
