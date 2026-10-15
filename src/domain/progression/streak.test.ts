import { describe, expect, it } from "vitest";

import { summarizeWeeklyHistory } from "./streak";
import { createEmptyWeeklyStats, type WeeklyStats } from "./weekly-stats";

function week(weekKey: string, completedWorkouts: number, totalSets = 0): WeeklyStats {
  return {
    ...createEmptyWeeklyStats({
      plannedTarget: 3,
      timeZone: "America/Sao_Paulo",
      uid: "user-1",
      weekKey,
      weekStartsOn: "monday",
    }),
    completedWorkouts,
    totalSets,
  };
}

describe("summarizeWeeklyHistory", () => {
  it("returns zeros for an empty history", () => {
    expect(summarizeWeeklyHistory([])).toEqual({
      cardioSessions: 0,
      completedWorkouts: 0,
      streakWeeks: 0,
      totalSets: 0,
    });
  });

  it("sums totals and counts consecutive weeks", () => {
    const result = summarizeWeeklyHistory([
      week("2026-10-12", 2, 20),
      week("2026-10-05", 3, 30),
      week("2026-09-28", 1, 10),
    ]);

    expect(result).toMatchObject({ completedWorkouts: 6, streakWeeks: 3, totalSets: 60 });
  });

  it("does not break the streak with an empty week still in progress", () => {
    const result = summarizeWeeklyHistory(
      [week("2026-10-12", 0), week("2026-10-05", 2), week("2026-09-28", 2)],
      "2026-10-12",
    );

    expect(result.streakWeeks).toBe(2);
  });

  it("breaks the streak on an empty past week or a gap", () => {
    expect(
      summarizeWeeklyHistory([week("2026-10-12", 1), week("2026-10-05", 0), week("2026-09-28", 4)])
        .streakWeeks,
    ).toBe(1);
    expect(summarizeWeeklyHistory([week("2026-10-12", 1), week("2026-09-28", 4)]).streakWeeks).toBe(
      1,
    );
  });
});
