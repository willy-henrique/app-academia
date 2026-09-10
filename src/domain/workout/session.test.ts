import { describe, expect, it } from "vitest";

import { seedExercises } from "./exercise-seed";
import {
  advanceWorkoutExercise,
  createWorkoutSessionFromPlan,
  finishWorkoutSession,
  getWorkoutRestState,
  recordWorkoutSet,
  startWorkoutSession,
  swapWorkoutExercise,
} from "./session";
import { generateWorkoutPlan } from "./workout";

describe("workout session domain", () => {
  const buildPlan = () =>
    generateWorkoutPlan(
      {
        availableEquipment: ["bodyweight", "mat", "barbell", "bench", "dumbbell"],
        availableMinutes: 30,
        cardioStatus: "optional",
        experience: "intermediario",
        goal: "ganhar_massa",
        ownerUid: "alice",
      },
      seedExercises,
    );

  it("creates and starts a solo workout session from a published plan version", () => {
    const plan = buildPlan();
    const session = createWorkoutSessionFromPlan(
      plan,
      "session-1",
      new Date("2026-09-02T08:00:00.000Z"),
    );
    const started = startWorkoutSession(session, new Date("2026-09-02T08:05:00.000Z"));

    expect(started.status).toBe("ACTIVE");
    expect(started.startedAt).toBe("2026-09-02T08:05:00.000Z");
    expect(started.planId).toBe(plan.id);
    expect(started.exerciseQueue).toHaveLength(
      plan.versions[0]?.blocks[0]?.prescriptions.length ?? 0,
    );
  });

  it("tracks sets and derives rest from timestamps", () => {
    const plan = buildPlan();
    const session = startWorkoutSession(createWorkoutSessionFromPlan(plan, "session-2"));
    const afterSet = recordWorkoutSet(
      session,
      {
        feedback: "Boa estabilidade",
        loadKg: 80,
        notes: null,
        reps: 10,
        rir: 2,
        setIndex: 1,
      },
      new Date("2026-09-02T08:10:00.000Z"),
    );

    expect(afterSet.progress.totalSets).toBe(1);
    expect(afterSet.progress.totalReps).toBe(10);
    expect(afterSet.progress.totalVolume).toBe(800);
    expect(afterSet.restTargetSeconds).toBeGreaterThan(0);

    const restState = getWorkoutRestState(afterSet, new Date("2026-09-02T08:10:45.000Z"));
    expect(restState.remainingSeconds).toBeGreaterThan(0);
    expect(restState.ready).toBe(false);
  });

  it("advances, swaps and finishes the session without mutating the source", () => {
    const plan = buildPlan();
    const session = startWorkoutSession(createWorkoutSessionFromPlan(plan, "session-3"));
    const afterSets = recordWorkoutSet(
      recordWorkoutSet(
        recordWorkoutSet(
          session,
          {
            feedback: null,
            loadKg: 70,
            notes: null,
            reps: 8,
            rir: 2,
            setIndex: 1,
          },
          new Date("2026-09-02T08:15:00.000Z"),
        ),
        {
          feedback: null,
          loadKg: 72,
          notes: null,
          reps: 8,
          rir: 2,
          setIndex: 2,
        },
        new Date("2026-09-02T08:18:00.000Z"),
      ),
      {
        feedback: null,
        loadKg: 74,
        notes: null,
        reps: 8,
        rir: 2,
        setIndex: 3,
      },
      new Date("2026-09-02T08:21:00.000Z"),
    );

    const advanced = advanceWorkoutExercise(afterSets, new Date("2026-09-02T08:20:00.000Z"));
    expect(advanced.currentExerciseIndex).toBe(1);

    const swapped = swapWorkoutExercise(
      advanced,
      {
        exerciseId: "bodyweight-squat",
        exerciseName: "Agachamento livre",
      },
      "equipamento ocupado",
      new Date("2026-09-02T08:21:00.000Z"),
    );
    expect(swapped.currentWorkoutExerciseId).toBe("bodyweight-squat");
    expect(swapped.exerciseQueue[swapped.currentExerciseIndex]?.swapReason).toBe(
      "equipamento ocupado",
    );

    const finished = finishWorkoutSession(swapped, new Date("2026-09-02T08:45:00.000Z"));
    expect(finished.status).toBe("COMPLETED");
    expect(finished.completedAt).toBe("2026-09-02T08:45:00.000Z");
    expect(session.status).toBe("ACTIVE");
  });
});
