import type { WeeklyStats } from "./weekly-stats";

const dayMs = 24 * 60 * 60 * 1000;

function weekKeyToDays(weekKey: string): number {
  const [year, month, day] = weekKey.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / dayMs);
}

export type HistoryTotals = Readonly<{
  cardioSessions: number;
  completedWorkouts: number;
  streakWeeks: number;
  totalSets: number;
}>;

/**
 * Resume o histórico semanal (qualquer ordem) em totais reais e sequência de
 * semanas seguidas com ao menos um treino concluído.
 *
 * A semana corrente ainda está em andamento: se estiver vazia ela não zera a
 * sequência, só deixa de somar. `currentWeekKey` identifica essa semana.
 */
export function summarizeWeeklyHistory(
  weeks: readonly WeeklyStats[],
  currentWeekKey?: string,
): HistoryTotals {
  const ordered = [...weeks].sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));

  let streakWeeks = 0;
  let previousDay: number | null = null;

  for (const week of ordered) {
    const day = weekKeyToDays(week.weekKey);
    const isOpenWeek = week.weekKey === currentWeekKey;

    if (week.completedWorkouts === 0) {
      if (isOpenWeek) {
        continue;
      }
      break;
    }

    if (previousDay !== null && previousDay - day !== 7) {
      break;
    }

    streakWeeks += 1;
    previousDay = day;
  }

  return ordered.reduce<HistoryTotals>(
    (totals, week) => ({
      cardioSessions: totals.cardioSessions + week.cardioSessions,
      completedWorkouts: totals.completedWorkouts + week.completedWorkouts,
      streakWeeks: totals.streakWeeks,
      totalSets: totals.totalSets + week.totalSets,
    }),
    { cardioSessions: 0, completedWorkouts: 0, streakWeeks, totalSets: 0 },
  );
}
