import { describe, expect, it } from "vitest";

import { seedExercises } from "./exercise-seed";
import { createStaticExerciseProvider } from "@/infrastructure/exercises/static-exercise-provider";

import {
  appendWorkoutPlanVersion,
  estimateWorkoutDuration,
  evaluateExerciseCompatibility,
  generateWorkoutPlan,
  validateWorkoutPlan,
} from "./workout";

describe("workout domain", () => {
  it("evaluates compatibility with four deterministic outcomes", () => {
    const squat = seedExercises.find((exercise) => exercise.id === "bodyweight-squat");
    const bench = seedExercises.find((exercise) => exercise.id === "barbell-bench-press");

    expect(squat).toBeDefined();
    expect(bench).toBeDefined();
    if (!squat || !bench) {
      return;
    }

    expect(
      evaluateExerciseCompatibility({
        experienceLevel: "iniciante",
        exercise: squat,
        availableEquipment: ["bodyweight", "mat"],
      }).status,
    ).toBe("compatible");

    expect(
      evaluateExerciseCompatibility({
        accessibilityNeeds: ["instrucao_simplificada"],
        experienceLevel: "iniciante",
        exercise: bench,
        availableEquipment: ["barbell", "bench"],
      }).status,
    ).toBe("adaptation_required");

    expect(
      evaluateExerciseCompatibility({
        experienceLevel: "nunca_treinei",
        exercise: bench,
        availableEquipment: ["barbell", "bench"],
      }).status,
    ).toBe("review_required");

    expect(
      evaluateExerciseCompatibility({
        experienceLevel: "intermediario",
        exercise: squat,
        movementRestrictions: ["squat"],
        availableEquipment: ["bodyweight", "mat"],
      }).status,
    ).toBe("not_recommended");
  });

  it("estimates group rest using the partner's execution time", () => {
    const duration = estimateWorkoutDuration({
      cardioSeconds: 0,
      cooldownSeconds: 0,
      exercises: [
        {
          exerciseId: "barbell-bench-press",
          exerciseName: "Supino reto com barra",
          loadStrategy: "last_used",
          notes: null,
          repsMax: 10,
          repsMin: 8,
          restSeconds: 90,
          rirTarget: 2,
          sets: 3,
        },
      ],
      equipmentTransitionSeconds: 15,
      participantCount: 3,
      stationMode: "rotation_shared_station",
      warmupSeconds: 0,
      weightChangeSeconds: 20,
    });

    expect(duration.effectiveRestSeconds).toBeLessThan(270);
    expect(duration.totalSeconds).toBeGreaterThan(0);
  });

  it("generates a deterministic plan that fits the available time", () => {
    const provider = createStaticExerciseProvider();

    return provider.list().then((catalog) => {
      const plan = generateWorkoutPlan(
        {
          availableEquipment: ["bodyweight", "mat", "barbell", "bench", "dumbbell"],
          availableMinutes: 30,
          cardioStatus: "optional",
          experience: "intermediario",
          goal: "ganhar_massa",
          ownerUid: "alice",
          participantCount: 1,
          stationMode: "independent_stations",
        },
        catalog,
      );

      expect(plan.id).toContain("plan-alice-ganhar-massa-30");
      expect(plan.versions).toHaveLength(1);
      expect(plan.versions[0]?.blocks[0]?.prescriptions).toHaveLength(2);
      expect(validateWorkoutPlan(plan).valid).toBe(true);
      expect(plan.versions[0]?.durationSeconds).toBeLessThanOrEqual(30 * 60);
    });
  });

  it("appends a new immutable version without overwriting the original", async () => {
    const catalog = createStaticExerciseProvider();
    const plan = generateWorkoutPlan(
      {
        availableEquipment: ["bodyweight", "mat", "barbell", "bench", "dumbbell"],
        availableMinutes: 45,
        cardioStatus: "recommended",
        experience: "intermediario",
        goal: "forca",
        ownerUid: "alice",
      },
      await catalog.list(),
    );

    const nextPlan = appendWorkoutPlanVersion(plan, {
      activeParticipantCount: plan.versions[0]!.activeParticipantCount,
      blocks: plan.versions[0]!.blocks,
      cardioSeconds: plan.versions[0]!.cardioSeconds,
      cardioStatus: plan.versions[0]!.cardioStatus,
      durationSeconds: plan.versions[0]!.durationSeconds,
      planId: plan.id,
      sourceExerciseIds: plan.versions[0]!.sourceExerciseIds,
      stationMode: plan.versions[0]!.stationMode,
      summary: "Ajuste de carga validado",
    });

    expect(nextPlan.versions).toHaveLength(2);
    expect(nextPlan.activeVersionId).toBe("v2");
    expect(nextPlan.versions[0]?.versionNumber).toBe(1);
    expect(nextPlan.versions[1]?.versionNumber).toBe(2);
    expect(validateWorkoutPlan(nextPlan).valid).toBe(true);
  });

  it("detects invalid plan mutations", async () => {
    const catalog = createStaticExerciseProvider();
    const plan = generateWorkoutPlan(
      {
        availableEquipment: ["bodyweight", "mat", "barbell", "bench", "dumbbell"],
        availableMinutes: 30,
        cardioStatus: "optional",
        experience: "intermediario",
        goal: "ganhar_massa",
        ownerUid: "alice",
      },
      await catalog.list(),
    );

    const corruptedPlan = {
      ...plan,
      versions: [
        {
          ...plan.versions[0]!,
          durationSeconds: plan.versions[0]!.durationSeconds + 1,
        },
      ],
    };

    expect(validateWorkoutPlan(corruptedPlan).valid).toBe(false);
  });
});
