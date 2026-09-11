
export type AthleteRank = {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badge: string;
};

export const ranksTable: readonly AthleteRank[] = [
  { level: 1, title: "Iniciante", minXp: 0, maxXp: 300, badge: "Iniciante" },
  { level: 2, title: "Constante", minXp: 300, maxXp: 800, badge: "Constante" },
  { level: 3, title: "Dedicado", minXp: 800, maxXp: 1600, badge: "Dedicado" },
  { level: 4, title: "Avancado", minXp: 1600, maxXp: 2800, badge: "Avancado" },
  { level: 5, title: "Atleta de Ferro", minXp: 2800, maxXp: 4500, badge: "Atleta de Ferro" },
  { level: 6, title: "Mestre", minXp: 4500, maxXp: 7000, badge: "Mestre" },
  { level: 7, title: "Lenda WillTreino", minXp: 7000, maxXp: 12000, badge: "Lenda" },
];

export const xpReward = {
  workoutCompleted: 100,
  cardioCompleted: 40,
  setCompleted: 15,
  personalRecordBonus: 50,
  weekStreakBonus: 80,
} as const;

export type GamificationProfile = {
  currentLevel: number;
  title: string;
  badge: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  totalWorkouts: number;
  streakWeeks: number;
};

export function calculateAthleteRank(totalXp: number): AthleteRank {
  const safeXp = Math.max(0, Math.floor(totalXp));

  for (let i = ranksTable.length - 1; i >= 0; i--) {
    if (safeXp >= ranksTable[i].minXp) {
      return ranksTable[i];
    }
  }

  return ranksTable[0];
}

export function computeGamificationProfile(input: {
  totalXp: number;
  totalWorkouts?: number;
  streakWeeks?: number;
}): GamificationProfile {
  const safeXp = Math.max(0, Math.floor(input.totalXp));
  const rank = calculateAthleteRank(safeXp);

  const isMaxRank = rank.level === ranksTable[ranksTable.length - 1].level;
  const levelSpan = rank.maxXp - rank.minXp;
  const xpIntoLevel = safeXp - rank.minXp;

  const progressPercent = isMaxRank
    ? 100
    : Math.min(100, Math.max(0, Math.round((xpIntoLevel / levelSpan) * 100)));

  return {
    badge: rank.badge,
    currentLevel: rank.level,
    currentLevelXp: safeXp,
    nextLevelXp: rank.maxXp,
    progressPercent,
    streakWeeks: input.streakWeeks ?? 1,
    title: rank.title,
    totalWorkouts: input.totalWorkouts ?? 0,
    totalXp: safeXp,
  };
}

export function computeXpFromHistory(data: {
  completedWorkouts: number;
  totalSets: number;
  cardioSessions?: number;
  personalRecordsCount?: number;
}): number {
  const workoutXp = Math.max(0, data.completedWorkouts) * xpReward.workoutCompleted;
  const setsXp = Math.max(0, data.totalSets) * xpReward.setCompleted;
  const cardioXp = Math.max(0, data.cardioSessions ?? 0) * xpReward.cardioCompleted;
  const prXp = Math.max(0, data.personalRecordsCount ?? 0) * xpReward.personalRecordBonus;

  return workoutXp + setsXp + cardioXp + prXp;
}
