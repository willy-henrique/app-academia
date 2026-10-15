"use client";

import { CalendarDays, Dumbbell, Moon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { resolveWeekKey } from "@/domain/progression/week-key";
import type { WeeklyStats } from "@/domain/progression/weekly-stats";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from "@/domain/settings/notification-preferences";

import { loadWeekPreferences, loadWeeklyStats } from "./weekly-stats-repository";
import { loadNotificationPreferences } from "@/features/settings/notification-preferences-repository";

type DaySchedule = {
  dayName: string;
  shortName: string;
  dayIndex: number;
  isToday: boolean;
  isRest: boolean;
  focus: string;
};

type WeeklyScheduleMapProps = Readonly<{
  /** Valores injetáveis para reutilização e testes; sem eles, a agenda lê a conta atual. */
  daysPerWeek?: number;
  now?: Date;
  stats?: WeeklyStats | null;
}>;

const muscleSplitsByDays: Record<number, string[]> = {
  2: ["Full Body A", "Full Body B", "Descanso", "Descanso", "Descanso", "Descanso", "Descanso"],
  3: [
    "Peito & Tríceps",
    "Costas & Bíceps",
    "Pernas & Ombros",
    "Descanso",
    "Descanso",
    "Descanso",
    "Descanso",
  ],
  4: [
    "Peito & Tríceps",
    "Costas & Bíceps",
    "Descanso",
    "Pernas & Glúteos",
    "Ombros & Abdômen",
    "Descanso",
    "Descanso",
  ],
  5: [
    "Peito & Tríceps",
    "Costas & Bíceps",
    "Pernas Completo",
    "Ombros & Trapézio",
    "Braços & Abdômen",
    "Descanso",
    "Descanso",
  ],
  6: [
    "Peito (Push A)",
    "Costas (Pull A)",
    "Pernas (Legs A)",
    "Peito & Ombros (Push B)",
    "Costas & Bíceps (Pull B)",
    "Pernas (Legs B)",
    "Descanso",
  ],
};

const dayNames = [
  { full: "Segunda", short: "SEG" },
  { full: "Terça", short: "TER" },
  { full: "Quarta", short: "QUA" },
  { full: "Quinta", short: "QUI" },
  { full: "Sexta", short: "SEX" },
  { full: "Sábado", short: "SÁB" },
  { full: "Domingo", short: "DOM" },
] as const;

function buildDays(daysPerWeek: number, now: Date): DaySchedule[] {
  const currentDayOfWeek = now.getDay();
  const todayMondayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const plannedSplits = muscleSplitsByDays[daysPerWeek] ?? muscleSplitsByDays[4];

  return dayNames.map((day, index) => {
    const focus = plannedSplits[index] ?? "Descanso";

    return {
      dayName: day.full,
      dayIndex: index,
      focus,
      isRest: focus === "Descanso",
      isToday: index === todayMondayIndex,
      shortName: day.short,
    };
  });
}

/**
 * A agenda mostra a frequência e o split planejados a partir do perfil real.
 * Ela não deduz a data de uma conclusão a partir de um contador semanal: isso
 * daria uma certeza falsa quando a pessoa muda a ordem dos treinos.
 */
export function WeeklyScheduleMap({ daysPerWeek, now, stats }: WeeklyScheduleMapProps) {
  const { mode, status: authStatus, user } = useAuthSession();
  const [fallbackNow] = useState(() => new Date());
  const referenceNow = now ?? fallbackNow;
  const hasProvidedSchedule = daysPerWeek !== undefined;
  const [loadedDaysPerWeek, setLoadedDaysPerWeek] = useState(4);
  const [loadedStats, setLoadedStats] = useState<WeeklyStats | null | undefined>();
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [loadingRemoteAgenda, setLoadingRemoteAgenda] = useState(true);

  useEffect(() => {
    if (hasProvidedSchedule) {
      return;
    }

    if (mode === "local" || authStatus !== "authenticated" || !user) {
      return;
    }

    const uid = user.uid;
    let active = true;

    async function loadAgenda() {
      try {
        const preferences = await loadWeekPreferences(uid);
        const weekKey = resolveWeekKey(referenceNow, preferences);
        const [weekStats, loadedNotificationPreferences] = await Promise.all([
          loadWeeklyStats(uid, weekKey),
          loadNotificationPreferences(uid).catch(() => defaultNotificationPreferences),
        ]);

        if (active) {
          setLoadedDaysPerWeek(preferences.plannedTarget || 4);
          setLoadedStats(weekStats);
          setNotificationPreferences(loadedNotificationPreferences);
        }
      } catch {
        // A agenda continua útil com o plano padrão, sem apresentar dados como reais.
        if (active) {
          setLoadedStats(null);
        }
      } finally {
        if (active) {
          setLoadingRemoteAgenda(false);
        }
      }
    }

    void loadAgenda();

    return () => {
      active = false;
    };
  }, [authStatus, hasProvidedSchedule, mode, referenceNow, user]);

  const resolvedDaysPerWeek = daysPerWeek ?? loadedDaysPerWeek;
  const resolvedStats = hasProvidedSchedule ? stats : loadedStats;
  const loading =
    !hasProvidedSchedule &&
    mode !== "local" &&
    authStatus === "authenticated" &&
    Boolean(user) &&
    loadingRemoteAgenda;
  const agendaDays = buildDays(resolvedDaysPerWeek, referenceNow);
  const completedCount = resolvedStats?.completedWorkouts ?? 0;
  const remainingWorkouts = Math.max(0, resolvedDaysPerWeek - completedCount);

  return (
    <section aria-busy={loading || undefined} aria-label="Agenda da semana">
      <Card className="space-y-4 p-5 sm:p-6" elevated>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-hover">
                <CalendarDays className="size-4" />
              </span>
              <h2 className="wt-text-h3 text-wt-text-primary">Agenda da semana</h2>
            </div>
            <p className="text-wt-body-sm text-wt-text-secondary">
              Sua divisão muscular e frequência planejada de {resolvedDaysPerWeek} dias.
            </p>
          </div>

          <Badge className="self-start sm:self-auto" tone="accent">
            {completedCount} de {resolvedDaysPerWeek} treinos concluídos
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {agendaDays.map((day) => (
            <div
              className={`relative flex min-h-24 flex-col justify-between rounded-wt-lg border p-3 ${
                day.isToday
                  ? "border-wt-accent-hover bg-wt-accent-subtle/30 ring-2 ring-wt-accent-hover/30"
                  : day.isRest
                    ? "border-dashed border-wt-border bg-wt-surface-elevated/60"
                    : "border-wt-border bg-wt-surface"
              }`}
              key={day.dayIndex}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-wt-caption font-bold tracking-wider ${
                    day.isToday ? "text-wt-accent-hover" : "text-wt-text-secondary"
                  }`}
                >
                  {day.shortName}
                </span>
                {day.isToday ? (
                  <span
                    aria-hidden="true"
                    className="flex size-2 rounded-full bg-wt-accent-hover"
                  />
                ) : day.isRest ? (
                  <Moon aria-hidden="true" className="size-3.5 text-wt-text-secondary" />
                ) : null}
              </div>

              <div className="mt-3">
                <p className="text-xs font-bold leading-tight text-wt-text-primary">{day.focus}</p>
                <p className="mt-1 text-wt-caption text-wt-text-secondary-strong">
                  {day.isToday ? "Hoje" : day.isRest ? "Recuperação" : "Planejado"}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-wt-border pt-4 text-wt-body-sm text-wt-text-secondary-strong sm:flex-row sm:items-center sm:justify-between">
          <p>
            {loading
              ? "Atualizando sua meta semanal..."
              : notificationPreferences.showWeeklyGoalReminder && remainingWorkouts > 0
                ? `Lembrete no app: faltam ${remainingWorkouts} ${remainingWorkouts === 1 ? "treino" : "treinos"} para sua meta semanal.`
                : "A agenda mostra o plano; o progresso confirmado aparece na meta acima."}
          </p>
          <Link
            className="inline-flex min-h-11 items-center gap-1 self-start rounded-wt-md px-2 text-wt-label font-semibold text-wt-accent-text hover:bg-wt-accent-subtle"
            href="/workout"
          >
            <Dumbbell aria-hidden="true" className="size-4" /> Abrir treino
          </Link>
        </div>
      </Card>
    </section>
  );
}
