import { describe, expect, it } from "vitest";

import {
  applyWorkoutCompletion,
  createEmptyWeeklyStats,
  formatExtraWorkouts,
  projectWeeklyStats,
  resolvePlanAdherence,
  type WorkoutCompletionEvent,
} from "./weekly-stats";

const identity = { plannedTarget: 3, uid: "alice", weekKey: "2026-09-07" };

function completion(overrides: Partial<WorkoutCompletionEvent> = {}): WorkoutCompletionEvent {
  return {
    cardioCompleted: false,
    cardioSeconds: 0,
    completedAt: "2026-09-08T12:00:00.000Z",
    eventId: "solo:session-1:alice",
    kind: "STRENGTH",
    mode: "SOLO",
    planId: "plan-1",
    planVersionId: "version-1",
    source: "PLANNED",
    totalReps: 40,
    totalSets: 5,
    totalVolumeKg: 1200,
    uid: "alice",
    ...overrides,
  };
}

describe("weekly stats engine", () => {
  it("aggregates a completion into the personal projection", () => {
    const stats = applyWorkoutCompletion(createEmptyWeeklyStats(identity), completion());

    expect(stats).toMatchObject({
      completedWorkouts: 1,
      extraWorkouts: 0,
      groupWorkouts: 0,
      plannedWorkouts: 1,
      soloWorkouts: 1,
      totalReps: 40,
      totalSets: 5,
      totalVolumeKg: 1200,
    });
  });

  it("refuses to aggregate an event from another person", () => {
    expect(() =>
      applyWorkoutCompletion(createEmptyWeeklyStats(identity), completion({ uid: "bob" })),
    ).toThrow(/própria pessoa/);
  });

  it("separates planned from extra workouts", () => {
    const stats = projectWeeklyStats(identity, [
      completion(),
      completion({ eventId: "solo:session-2:alice", source: "EXTRA" }),
    ]);

    expect(stats.plannedWorkouts).toBe(1);
    expect(stats.extraWorkouts).toBe(1);
    expect(stats.completedWorkouts).toBe(2);
    expect(formatExtraWorkouts(stats)).toBe("+1");
  });

  it("never lets extra workouts inflate plan adherence", () => {
    const stats = projectWeeklyStats(identity, [
      completion(),
      completion({ eventId: "solo:2:alice", source: "EXTRA" }),
      completion({ eventId: "solo:3:alice", source: "EXTRA" }),
      completion({ eventId: "solo:4:alice", source: "EXTRA" }),
    ]);

    expect(resolvePlanAdherence(stats)).toEqual({
      completedPlanned: 1,
      extraWorkouts: 3,
      plannedTarget: 3,
      rate: 0.33,
    });
  });

  it("caps adherence at the weekly target", () => {
    const stats = projectWeeklyStats(identity, [
      completion({ eventId: "a" }),
      completion({ eventId: "b" }),
      completion({ eventId: "c" }),
      completion({ eventId: "d" }),
    ]);

    expect(resolvePlanAdherence(stats).rate).toBe(1);
    expect(resolvePlanAdherence(stats).completedPlanned).toBe(3);
  });

  it("counts group and cardio workouts on their own axes", () => {
    const stats = projectWeeklyStats(identity, [
      completion({ cardioCompleted: true, eventId: "group:g1:alice", mode: "GROUP" }),
      completion({ eventId: "solo:s1:alice" }),
    ]);

    expect(stats.groupWorkouts).toBe(1);
    expect(stats.soloWorkouts).toBe(1);
    expect(stats.cardioSessions).toBe(1);
  });

  it("collapses repeated event ids when rebuilding a week", () => {
    const stats = projectWeeklyStats(identity, [completion(), completion(), completion()]);

    expect(stats.completedWorkouts).toBe(1);
    expect(stats.totalVolumeKg).toBe(1200);
  });

  it("ignores events from other people when rebuilding", () => {
    const stats = projectWeeklyStats(identity, [
      completion(),
      completion({ eventId: "solo:x:bob", uid: "bob" }),
    ]);

    expect(stats.completedWorkouts).toBe(1);
  });

  it("reports zero adherence when there is no plan target", () => {
    const stats = projectWeeklyStats({ uid: "alice", weekKey: "2026-09-07" }, [completion()]);
    expect(resolvePlanAdherence(stats).rate).toBe(0);
    expect(formatExtraWorkouts(stats)).toBe("0");
  });
  it("keeps cardio on its own axis, never as a strength workout", () => {
    const stats = projectWeeklyStats(identity, [
      completion(),
      completion({
        cardioCompleted: true,
        cardioSeconds: 1800,
        eventId: "cardio:c1:alice",
        kind: "CARDIO",
        source: "EXTRA",
        totalReps: 0,
        totalSets: 0,
        totalVolumeKg: 0,
      }),
    ]);

    expect(stats.completedWorkouts).toBe(1);
    expect(stats.soloWorkouts).toBe(1);
    expect(stats.extraWorkouts).toBe(0);
    expect(stats.cardioSessions).toBe(1);
    expect(stats.cardioSeconds).toBe(1800);
    expect(stats.totalSets).toBe(5);
  });

  it("does not reduce strength metrics when cardio is skipped", () => {
    const withCardio = projectWeeklyStats(identity, [
      completion({ cardioCompleted: true, cardioSeconds: 600 }),
    ]);
    const skippedCardio = projectWeeklyStats(identity, [completion({ cardioCompleted: false })]);

    expect(skippedCardio.completedWorkouts).toBe(withCardio.completedWorkouts);
    expect(skippedCardio.plannedWorkouts).toBe(withCardio.plannedWorkouts);
    expect(skippedCardio.totalVolumeKg).toBe(withCardio.totalVolumeKg);
    expect(skippedCardio.cardioSessions).toBe(0);
    expect(skippedCardio.cardioSeconds).toBe(0);
    expect(resolvePlanAdherence(skippedCardio)).toEqual(resolvePlanAdherence(withCardio));
  });
});
