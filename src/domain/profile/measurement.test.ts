import { describe, expect, it } from "vitest";

import {
  compareMeasurements,
  measurementSchema,
  computeBodyMassIndex,
  createMeasurement,
  sortMeasurementHistory,
  type Measurement,
} from "./measurement";

const now = new Date("2026-09-09T12:00:00.000Z");

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return measurementSchema.parse({
    ...createMeasurement(
      {
        armCm: 35,
        bodyFatPercent: null,
        chestCm: 100,
        heightCm: 175,
        hipCm: 98,
        id: "m1",
        notes: null,
        ownerUid: "alice",
        thighCm: 55,
        waistCm: 85,
        weightKg: 78,
      },
      now,
    ),
    ...overrides,
  });
}

describe("measurements", () => {
  it("keeps every measurement owned and dated", () => {
    const created = measurement();
    expect(created.ownerUid).toBe("alice");
    expect(created.takenAt).toBe(now.toISOString());
  });

  it("computes BMI deterministically", () => {
    expect(computeBodyMassIndex({ heightCm: 175, weightKg: 78 })).toBe(25.5);
    expect(computeBodyMassIndex({ heightCm: 160, weightKg: 55 })).toBe(21.5);
  });

  it("returns no BMI without height or weight", () => {
    expect(computeBodyMassIndex({ heightCm: null, weightKg: 78 })).toBeNull();
    expect(computeBodyMassIndex({ heightCm: 175, weightKg: null })).toBeNull();
  });

  it("rejects values outside a plausible human range", () => {
    expect(() => measurement({ weightKg: 5 })).toThrow();
    expect(() => measurement({ heightCm: 400 })).toThrow();
    expect(() => measurement({ bodyFatPercent: 95 })).toThrow();
  });

  it("compares only the fields present in both measurements", () => {
    const previous = measurement({ armCm: null, waistCm: 90, weightKg: 80 });
    const current = measurement({ id: "m2", waistCm: 86.5, weightKg: 78 });

    expect(compareMeasurements(previous, current)).toEqual([
      { field: "chestCm", from: 100, to: 100, variation: 0 },
      { field: "hipCm", from: 98, to: 98, variation: 0 },
      { field: "thighCm", from: 55, to: 55, variation: 0 },
      { field: "waistCm", from: 90, to: 86.5, variation: -3.5 },
      { field: "weightKg", from: 80, to: 78, variation: -2 },
    ]);
  });

  it("orders the history newest first", () => {
    const older = measurement({ id: "old", takenAt: "2026-08-01T12:00:00.000Z" });
    const newer = measurement({ id: "new", takenAt: "2026-09-01T12:00:00.000Z" });

    expect(sortMeasurementHistory([older, newer]).map((item) => item.id)).toEqual(["new", "old"]);
  });
});
