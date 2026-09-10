import { z } from "zod";

export const movementPatternOptions = [
  "full_body",
  "squat",
  "hinge",
  "lunge",
  "push_horizontal",
  "push_vertical",
  "pull_horizontal",
  "pull_vertical",
  "carry",
  "rotation",
  "anti_rotation",
  "core_flexion",
  "core_extension",
  "locomotion",
  "balance",
  "mobility",
  "conditioning",
  "isolation_upper",
  "isolation_lower",
  "other",
] as const;

export const equipmentOptions = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "machine",
  "cable",
  "kettlebell",
  "band",
  "bench",
  "mat",
  "pull_up_bar",
  "smith_machine",
  "trap_bar",
  "medicine_ball",
  "slam_ball",
  "step",
  "cardio_machine",
  "rings",
  "trx",
  "plate_loaded_machine",
  "other",
] as const;

export const experienceLevelOptions = [
  "beginner",
  "intermediate",
  "advanced",
  "all_levels",
] as const;

const exerciseCaptionSchema = z.object({
  kind: z.enum(["closed_caption", "subtitles"]).default("subtitles"),
  label: z.string().trim().min(1).max(120),
  language: z.string().trim().min(2).max(16),
  src: z.string().trim().min(1).max(2048),
});

const exerciseSourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  note: z.string().trim().max(400).nullable().default(null),
  url: z.string().trim().min(1).max(2048).nullable(),
});

const exerciseVideoSchema = z.object({
  aspectRatio: z.string().trim().min(3).max(20).default("16:9"),
  autoplayAllowed: z.literal(false).default(false),
  durationSeconds: z.number().int().positive().nullable().default(null),
  mutedDefault: z.literal(true).default(true),
  posterUrl: z.string().trim().min(1).max(2048).nullable(),
  src: z.string().trim().min(1).max(2048).nullable(),
});

const exerciseMediaFields = {
  accessibleDescription: z.string().trim().min(1).max(4000),
  captions: z.array(exerciseCaptionSchema).default([]),
  thumbnail: z.string().trim().min(1).max(2048).nullable(),
  video: exerciseVideoSchema,
};

export const exerciseMediaSchema = z.object(exerciseMediaFields);

export const exerciseAdaptationSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(120),
  operationalResult: z.string().trim().min(1).max(400),
  privateReasonCodes: z.array(z.string().trim().min(1).max(80)).default([]),
  publicNote: z.string().trim().min(1).max(400),
  requiresReview: z.boolean().default(false),
});

export type ExerciseAdaptation = z.infer<typeof exerciseAdaptationSchema>;

export const exerciseAlternativeSchema = z.object({
  criteria: z.string().trim().min(1).max(400),
  exerciseId: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  privateReasonCodes: z.array(z.string().trim().min(1).max(80)).default([]),
  publicReason: z.string().trim().min(1).max(400),
});

export type ExerciseAlternative = z.infer<typeof exerciseAlternativeSchema>;

export const exerciseSchema = z.object({
  adaptabilityNotes: z.string().trim().max(2000).optional(),
  aliases: z.array(z.string().trim().min(1).max(120)).default([]),
  alternatives: z.array(exerciseAlternativeSchema).default([]),
  adaptations: z.array(exerciseAdaptationSchema).default([]),
  attribution: z.string().trim().min(1).max(280),
  breathing: z.string().trim().min(1).max(2000),
  description: z.string().trim().min(1).max(4000),
  defaultRestMax: z.number().int().positive(),
  defaultRestMin: z.number().int().positive(),
  equipment: z.array(z.enum(equipmentOptions)).default([]),
  experienceLevel: z.enum(experienceLevelOptions),
  estimatedSetDuration: z.number().int().positive(),
  execution: z.string().trim().min(1).max(4000),
  id: z.string().trim().min(1).max(120),
  instructions: z.string().trim().min(1).max(4000),
  license: z.string().trim().min(1).max(120),
  movementPattern: z.enum(movementPatternOptions),
  name: z.string().trim().min(1).max(140),
  primaryMuscles: z.array(z.string().trim().min(1).max(120)).min(1),
  mistakes: z.string().trim().min(1).max(4000),
  regressions: z.array(exerciseAlternativeSchema).default([]),
  safetyNotes: z.string().trim().min(1).max(4000),
  secondaryMuscles: z.array(z.string().trim().min(1).max(120)).default([]),
  setup: z.string().trim().min(1).max(4000),
  slug: z.string().trim().min(1).max(140),
  source: exerciseSourceSchema,
  thumbnail: z.string().trim().min(1).max(2048).nullable(),
  video: exerciseVideoSchema,
  captions: z.array(exerciseCaptionSchema).default([]),
  accessibleDescription: z.string().trim().min(1).max(4000),
  progressions: z.array(exerciseAlternativeSchema).default([]),
});

export type Exercise = z.infer<typeof exerciseSchema>;
