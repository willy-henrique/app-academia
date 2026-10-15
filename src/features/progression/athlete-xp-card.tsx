import { Flame, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeGamificationProfile,
  computeXpFromHistory,
} from "@/domain/progression/gamification";
import type { HistoryTotals } from "@/domain/progression/streak";

type AthleteXpCardProps = Readonly<{
  /** `null` enquanto o histórico carrega: mostra esqueleto, nunca números inventados. */
  totals: HistoryTotals | null;
}>;

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Patente e XP do atleta, derivados do histórico semanal real. */
export function AthleteXpCard({ totals }: AthleteXpCardProps) {
  if (!totals) {
    return (
      <Card aria-busy="true" className="space-y-4 p-4 sm:p-5">
        <p className="sr-only" role="status">
          Carregando sua patente...
        </p>
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-wt-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-wt-full" />
      </Card>
    );
  }

  const profile = computeGamificationProfile({
    streakWeeks: totals.streakWeeks,
    totalWorkouts: totals.completedWorkouts,
    totalXp: computeXpFromHistory({
      cardioSessions: totals.cardioSessions,
      completedWorkouts: totals.completedWorkouts,
      totalSets: totals.totalSets,
    }),
  });
  const isMaxLevel = profile.progressPercent === 100 && profile.currentLevel >= 7;

  return (
    <Card className="p-4 sm:p-5" elevated>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-wt-lg border border-wt-accent-border bg-wt-accent-subtle text-wt-body-sm font-extrabold text-wt-accent-text wt-tabular"
          >
            Nv.{profile.currentLevel}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="wt-kicker">Patente do atleta</span>
              <Badge tone="accent">{profile.title}</Badge>
            </div>
            <p className="text-wt-label font-bold text-wt-text-primary wt-tabular">
              {profile.totalXp} XP acumulados
            </p>
          </div>
        </div>

        <ul className="flex flex-wrap items-center gap-2">
          <li>
            <Badge icon={<Flame />} tone="warning">
              {pluralize(profile.streakWeeks, "semana seguida", "semanas seguidas")}
            </Badge>
          </li>
          <li>
            <Badge icon={<Trophy />} tone="neutral">
              {pluralize(profile.totalWorkouts, "treino", "treinos")}
            </Badge>
          </li>
        </ul>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-wt-caption font-medium text-wt-text-secondary-strong">
          <span>
            {isMaxLevel
              ? "Nível máximo alcançado"
              : `Evolução para o nível ${profile.currentLevel + 1}`}
          </span>
          <span className="font-bold text-wt-text-primary wt-tabular">
            {profile.progressPercent}%
          </span>
        </div>
        <ProgressBar
          label="Progresso de nível"
          max={100}
          size="sm"
          value={profile.progressPercent}
          valueText={`${profile.progressPercent}%`}
        />
        {isMaxLevel ? null : (
          <p className="text-wt-caption text-wt-text-secondary-strong wt-tabular">
            Faltam {Math.max(0, profile.nextLevelXp - profile.totalXp)} XP para o próximo nível
          </p>
        )}
      </div>
    </Card>
  );
}
