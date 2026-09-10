"use client";

import { ArrowRight, CalendarDays, RotateCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Metric, MetricGrid } from "@/components/ui/metric";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { resolveWeekKey } from "@/domain/progression/week-key";
import {
  createEmptyWeeklyStats,
  formatExtraWorkouts,
  resolvePlanAdherence,
  type WeeklyStats,
} from "@/domain/progression/weekly-stats";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import {
  listWeeklyStatsHistory,
  loadWeekPreferences,
  loadWeeklyStats,
  rebuildWeeklyStatsRequest,
  type WeekPreferences,
} from "./weekly-stats-repository";

const historyWeeks = 8;

function formatWeekLabel(weekKey: string): string {
  const [year, month, day] = weekKey.split("-");
  return `Semana de ${day}/${month}/${year}`;
}

function formatVolumeNumber(totalVolumeKg: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(totalVolumeKg);
}

function formatVolume(totalVolumeKg: number): string {
  return `${formatVolumeNumber(totalVolumeKg)} kg`;
}

/** Texto de apoio sem culpa: fala do próximo passo, nunca do que faltou. */
function describeProgress(completedPlanned: number, plannedTarget: number): string {
  if (plannedTarget === 0) {
    return "Defina quantos dias quer treinar para acompanhar sua meta semanal.";
  }

  if (completedPlanned >= plannedTarget) {
    return "Meta da semana concluída. O que vier agora é extra.";
  }

  if (completedPlanned === 0) {
    return "Sua semana começa no próximo treino.";
  }

  const remaining = plannedTarget - completedPlanned;
  return `Faltam ${remaining} ${remaining === 1 ? "treino" : "treinos"} para a meta da semana.`;
}

type WeeklyDashboardProps = Readonly<{
  /** Versão do Início: sem histórico nem recálculo, com link para Evolução. */
  compact?: boolean;
  now?: Date;
}>;

/**
 * Weekly dashboard of the signed-in person. It reads only their own projection
 * (`weeklyStats/{uid}/weeks/{weekKey}`) — one document for the current week and
 * one page of previous weeks, never a per-session fan-out.
 */
export function WeeklyDashboard({ compact = false, now }: WeeklyDashboardProps) {
  const { status: authStatus, user } = useAuthSession();
  const [preferences, setPreferences] = useState<WeekPreferences | null>(null);
  const [currentWeek, setCurrentWeek] = useState<WeeklyStats | null>(null);
  const [history, setHistory] = useState<WeeklyStats[]>([]);
  const [status, setStatus] = useState("Carregando sua semana...");
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const applyWeek = useCallback(
    (uid: string, weekPreferences: WeekPreferences, weekKey: string, stats: WeeklyStats | null) => {
      setPreferences(weekPreferences);
      setCurrentWeek(
        stats ??
          createEmptyWeeklyStats({
            plannedTarget: weekPreferences.plannedTarget,
            timeZone: weekPreferences.timeZone,
            uid,
            weekKey,
            weekStartsOn: weekPreferences.weekStartsOn,
          }),
      );
      setLoadFailed(false);
      setStatus(stats ? "Semana atualizada." : "Nenhum treino registrado nesta semana ainda.");
    },
    [],
  );

  useEffect(() => {
    let active = true;

    async function loadCurrentWeek() {
      if (!user) {
        return;
      }

      try {
        setLoading(true);
        const weekPreferences = await loadWeekPreferences(user.uid);
        const weekKey = resolveWeekKey(now ?? new Date(), {
          timeZone: weekPreferences.timeZone,
          weekStartsOn: weekPreferences.weekStartsOn,
        });
        const stats = await loadWeeklyStats(user.uid, weekKey);
        if (!active) {
          return;
        }

        applyWeek(user.uid, weekPreferences, weekKey, stats);
      } catch {
        if (active) {
          setLoadFailed(true);
          setStatus("Não foi possível carregar suas estatísticas agora.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCurrentWeek();

    return () => {
      active = false;
    };
  }, [applyWeek, now, refreshToken, user]);

  async function loadHistory() {
    if (!user) {
      return;
    }

    setLoading(true);
    try {
      const weeks = await listWeeklyStatsHistory(user.uid, historyWeeks);
      setHistory(weeks);
      setShowHistory(true);
      setStatus(
        weeks.length > 0
          ? `${weeks.length} ${weeks.length === 1 ? "semana" : "semanas"} no seu histórico.`
          : "Ainda não há semanas anteriores registradas.",
      );
    } catch {
      setStatus("Não foi possível carregar as semanas anteriores agora.");
    } finally {
      setLoading(false);
    }
  }

  async function rebuild() {
    if (!user || !currentWeek) {
      return;
    }

    setLoading(true);
    try {
      const result = await rebuildWeeklyStatsRequest(currentWeek.weekKey);
      setStatus(
        `Semana recalculada a partir de ${result.events} ${result.events === 1 ? "treino registrado" : "treinos registrados"}.`,
      );
      setRefreshToken((token) => token + 1);
    } catch {
      setStatus("Não foi possível recalcular esta semana agora.");
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <SectionHeader
      action={
        compact ? (
          <Link
            className="inline-flex min-h-11 items-center gap-1 rounded-wt-md px-2 text-wt-label font-semibold text-wt-accent-text hover:bg-wt-accent-subtle"
            href="/progress"
          >
            Evolução <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null
      }
      description={
        currentWeek
          ? `${formatWeekLabel(currentWeek.weekKey)} · começa ${
              preferences?.weekStartsOn === "sunday" ? "no domingo" : "na segunda"
            }`
          : undefined
      }
      title="Sua semana"
    />
  );

  if (authStatus !== "authenticated" || !currentWeek) {
    return (
      <section aria-label="Sua semana" className="space-y-3">
        {header}
        {loadFailed ? (
          <ErrorState
            description="Seus treinos continuam salvos. Tente de novo em instantes."
            title="Não conseguimos carregar sua semana."
            onRetry={() => setRefreshToken((token) => token + 1)}
          />
        ) : (
          <LoadingState label={status} lines={3} />
        )}
        <LiveRegion politeness="polite">{status}</LiveRegion>
      </section>
    );
  }

  const adherence = resolvePlanAdherence(currentWeek);

  return (
    <section aria-label="Sua semana" className="space-y-3">
      {header}
      <Card className="space-y-5 p-5">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-wt-body-sm font-medium text-wt-text-primary">
              {describeProgress(adherence.completedPlanned, adherence.plannedTarget)}
            </p>
            <p className="shrink-0 wt-text-caption font-semibold text-wt-text-secondary-strong">
              Adesão ao plano: {Math.round(adherence.rate * 100)}%
            </p>
          </div>
          <ProgressBar
            label="Treinos do plano nesta semana"
            max={Math.max(1, adherence.plannedTarget)}
            size="md"
            tone={
              adherence.plannedTarget > 0 && adherence.completedPlanned >= adherence.plannedTarget
                ? "success"
                : "accent"
            }
            value={adherence.completedPlanned}
            valueText={`${adherence.completedPlanned} de ${adherence.plannedTarget} treinos`}
          />
        </div>

        <MetricGrid className="grid-cols-2 sm:grid-cols-3">
          <Metric
            label="Treinos do plano"
            unit={`de ${adherence.plannedTarget}`}
            value={adherence.completedPlanned}
          />
          <Metric label="Treinos extras" value={formatExtraWorkouts(currentWeek)} />
          <Metric label="Treinos em grupo" value={currentWeek.groupWorkouts} />
          <Metric
            label="Volume total"
            unit="kg"
            value={formatVolumeNumber(currentWeek.totalVolumeKg)}
          />
          <Metric label="Séries" value={currentWeek.totalSets} />
          <Metric label="Cardio" value={currentWeek.cardioSessions} />
        </MetricGrid>

        {!compact ? (
          <div className="flex flex-wrap gap-2 border-t border-wt-border pt-4">
            <Button disabled={loading} variant="secondary" onClick={() => void loadHistory()}>
              <CalendarDays aria-hidden="true" className="size-4" />
              Ver semanas anteriores
            </Button>
            <Button disabled={loading} variant="ghost" onClick={() => void rebuild()}>
              <RotateCw aria-hidden="true" className="size-4" />
              Recalcular esta semana
            </Button>
          </div>
        ) : null}
        <LiveRegion politeness="polite">{status}</LiveRegion>
      </Card>

      {showHistory ? (
        <Card className="space-y-3 p-5">
          <h3 className="wt-text-h3">Semanas anteriores</h3>
          {history.length === 0 ? (
            <EmptyState
              description="Assim que uma semana terminar, ela aparece aqui."
              title="Nenhuma semana anterior registrada até agora."
            />
          ) : (
            <ul className="divide-y divide-wt-border">
              {history.map((week) => (
                <li
                  key={week.weekKey}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3"
                >
                  <span className="text-wt-body-sm font-semibold">
                    {formatWeekLabel(week.weekKey)}
                  </span>
                  <span className="text-wt-body-sm text-wt-text-secondary-strong wt-tabular">
                    {week.completedWorkouts} {week.completedWorkouts === 1 ? "treino" : "treinos"} ·{" "}
                    {formatExtraWorkouts(week)} extra · {formatVolume(week.totalVolumeKg)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </section>
  );
}
