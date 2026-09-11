import { describe, expect, it } from "vitest";
import {
  calculateAthleteRank,
  computeGamificationProfile,
  computeXpFromHistory,
  ranksTable,
} from "./gamification";

describe("gamification domain", () => {
  it("calculates rank 1 for initial 0 xp", () => {
    const rank = calculateAthleteRank(0);
    expect(rank.level).toBe(1);
    expect(rank.title).toBe("Iniciante");
  });

  it("advances rank as xp increases", () => {
    expect(calculateAthleteRank(299).level).toBe(1);
    expect(calculateAthleteRank(300).level).toBe(2);
    expect(calculateAthleteRank(799).level).toBe(2);
    expect(calculateAthleteRank(800).level).toBe(3);
    expect(calculateAthleteRank(2800).level).toBe(5);
  });

  it("computes profile with percentage progress to next rank", () => {
    const profile = computeGamificationProfile({ totalXp: 550, totalWorkouts: 4 });
    expect(profile.currentLevel).toBe(2);
    expect(profile.title).toBe("Constante");
    expect(profile.totalWorkouts).toBe(4);
    // Level 2 goes from 300 to 800 (span: 500). 550 - 300 = 250 -> 50%
    expect(profile.progressPercent).toBe(50);
    expect(profile.nextLevelXp).toBe(800);
  });

  it("computes total XP correctly from workouts and sets history", () => {
    const xp = computeXpFromHistory({
      completedWorkouts: 5, // 5 * 100 = 500
      totalSets: 20, // 20 * 15 = 300
      cardioSessions: 2, // 2 * 40 = 80
      personalRecordsCount: 1, // 1 * 50 = 50
    });
    expect(xp).toBe(930);
    const profile = computeGamificationProfile({ totalXp: xp });
    expect(profile.currentLevel).toBe(3);
  });
});
