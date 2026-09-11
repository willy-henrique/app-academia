import { Trophy, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  computeGamificationProfile,
  computeXpFromHistory,
  type GamificationProfile,
} from "@/domain/progression/gamification";
import type { WeeklyStats } from "@/domain/progression/weekly-stats";

type AthleteXpCardProps = {
  stats: WeeklyStats | null;
  totalWorkouts?: number;
  streakWeeks?: number;
};

export function AthleteXpCard({ stats, totalWorkouts = 0, streakWeeks = 1 }: AthleteXpCardProps) {
  const xp = computeXpFromHistory({
    completedWorkouts: totalWorkouts || (stats?.completedWorkouts ?? 0),
    totalSets: stats?.totalSets ?? 0,
    cardioSessions: stats?.cardioSessions ?? 0,
  });

  const profile: GamificationProfile = computeGamificationProfile({
    totalXp: xp,
    totalWorkouts: totalWorkouts || (stats?.completedWorkouts ?? 0),
    streakWeeks,
  });

  return (
    <Card className="border-wt-border bg-gradient-to-r from-wt-surface via-wt-surface to-wt-accent-subtle/30 p-4 sm:p-5" elevated>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-wt-lg bg-wt-accent-subtle text-wt-accent-hover font-black text-lg shadow-sm border border-wt-accent/20">
            Nv.{profile.currentLevel}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-wt-caption font-semibold uppercase tracking-wider text-wt-accent-text">
                Patente do Atleta
              </span>
              <Badge tone="accent">{profile.title}</Badge>
            </div>
            <p className="text-sm font-bold text-wt-text-primary">
              {profile.totalXp} XP Acumulados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-wt-md bg-wt-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-wt-text-secondary border border-wt-border">
            <Flame className="size-4 text-orange-500" />
            <span>{profile.streakWeeks} sem. seguidas</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-wt-md bg-wt-surface-elevated px-2.5 py-1.5 text-xs font-semibold text-wt-text-secondary border border-wt-border">
            <Trophy className="size-4 text-yellow-500" />
            <span>{profile.totalWorkouts} treinos</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs text-wt-text-secondary font-medium">
          <span>Evolução para Nível {profile.currentLevel + 1}</span>
          <span className="font-bold text-wt-text-primary">{profile.progressPercent}%</span>
        </div>
        <ProgressBar
          label="Progresso de nível"
          max={100}
          size="sm"
          value={profile.progressPercent}
          valueText={`${profile.progressPercent}%`}
        />
        <div className="flex justify-between text-[0.6875rem] text-wt-text-secondary">
          <span>{profile.totalXp} XP</span>
          <span>Próximo nível: {profile.nextLevelXp} XP</span>
        </div>
      </div>
    </Card>
  );
}
