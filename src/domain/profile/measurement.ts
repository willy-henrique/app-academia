import { z } from "zod";

/**
 * Private body measurements. They are health data: owner-only by default and
 * never shared with training partners. Every derived value (BMI, deltas) is
 * deterministic — the app computes, it does not diagnose.
 */

const reference = z.string().trim().min(1).max(120);

const optionalCentimeters = z.number().positive().max(300).nullable().default(null);

export const measurementSchema = z.object({
  armCm: optionalCentimeters,
  bodyFatPercent: z.number().min(1).max(70).nullable().default(null),
  chestCm: optionalCentimeters,
  createdAt: z.unknown().optional(),
  heightCm: z.number().positive().min(50).max(260).nullable().default(null),
  hipCm: optionalCentimeters,
  id: reference,
  notes: z.string().trim().max(500).nullable().default(null),
  ownerUid: reference,
  takenAt: z.string().datetime(),
  thighCm: optionalCentimeters,
  updatedAt: z.unknown().optional(),
  waistCm: optionalCentimeters,
  weightKg: z.number().positive().min(20).max(400).nullable().default(null),
});

export type Measurement = z.infer<typeof measurementSchema>;

export type CreateMeasurementInput = Omit<
  Measurement,
  "createdAt" | "id" | "ownerUid" | "takenAt" | "updatedAt"
> &
  Readonly<{ id: string; ownerUid: string }>;

export function createMeasurement(
  input: CreateMeasurementInput,
  now: Date = new Date(),
): Measurement {
  return measurementSchema.parse({
    ...input,
    createdAt: now.toISOString(),
    takenAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

/** BMI in kg/m², rounded to one decimal. Returns null without both values. */
export function computeBodyMassIndex(
  measurement: Pick<Measurement, "heightCm" | "weightKg">,
): number | null {
  const { heightCm, weightKg } = measurement;

  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  return Math.round((weightKg / (heightMeters * heightMeters)) * 10) / 10;
}

export type MeasurementDelta = Readonly<{
  field: keyof Pick<
    Measurement,
    "armCm" | "chestCm" | "hipCm" | "thighCm" | "waistCm" | "weightKg"
  >;
  from: number;
  to: number;
  variation: number;
}>;

const comparableFields = [
  "armCm",
  "chestCm",
  "hipCm",
  "thighCm",
  "waistCm",
  "weightKg",
] as const satisfies readonly MeasurementDelta["field"][];

/** Differences between two measurements, ignoring fields absent in either one. */
export function compareMeasurements(
  previous: Measurement,
  current: Measurement,
): MeasurementDelta[] {
  const deltas: MeasurementDelta[] = [];

  for (const field of comparableFields) {
    const from = previous[field];
    const to = current[field];

    if (typeof from !== "number" || typeof to !== "number") {
      continue;
    }

    deltas.push({
      field,
      from,
      to,
      variation: Math.round((to - from) * 100) / 100,
    });
  }

  return deltas;
}

/** History newest first, so the latest measurement is always the first item. */
export function sortMeasurementHistory(measurements: readonly Measurement[]): Measurement[] {
  return [...measurements].sort((left, right) => right.takenAt.localeCompare(left.takenAt));
}
