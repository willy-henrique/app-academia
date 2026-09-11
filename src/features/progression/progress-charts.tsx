"use client";

import { Lightbulb, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  buildVolumeSeries,
  computeTotalVolume,
  detectPersonalRecord,
  findLastResult,
  suggestProgression,
  type ExerciseSetResult,
  type PersonalRecord,
} from "@/domain/progression/progression";
import { seedExercises } from "@/domain/workout/exercise-seed";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { listRecentExerciseResults } from "./history-repository";

const sessionLimit = 8;
const defaultTarget = { repsMax: 12, repsMin: 8, rirTarget: 2 };

const actionLabels: Record<string, string> = {
  ADD_REP: "Sugestão: mais uma repetição",
  HOLD: "Sugestão: manter a carga",
  INCREASE_LOAD: "Sugestão: aumentar a carga",
  REDUCE_LOAD: "Sugestão: reduzir a carga",
};

function formatKg(value: number): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} kg`;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, notation: "compact" }).format(
    value,
  );
}

/** "2026-09-01" → "01/09/2026" (ou "01/09" no eixo do gráfico). */
function formatDay(isoDay: string, withYear = true): string {
  const [year, month, day] = isoDay.slice(0, 10).split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

/**
 * Nome legível de um exercício do histórico. O id ("bench-press") é técnico e
 * nunca vai para a tela como está: vem do catálogo ou, na falta dele, é
 * convertido em texto ("Bench press").
 */
export function resolveExerciseName(exerciseId: string): string {
  const known = seedExercises.find((exercise) => exercise.id === exerciseId);
  if (known) {
    return known.name;
  }

  const words = exerciseId.replace(/[-_]+/g, " ").trim();
  return words.length > 0 ? `${words[0].toLocaleUpperCase("pt-BR")}${words.slice(1)}` : "Exercício";
}

/**
 * Accessible evolution chart: bars are decorative (`aria-hidden`) and the same
 * numbers are always available as a table, so a screen reader never depends on
 * the drawing. Only the signed-in person's own results are read.
 */
export function ProgressCharts() {
  const { status: authStatus, user } = useAuthSession();
  const [results, setResults] = useState<ExerciseSetResult[]>([]);
  const [status, setStatus] = useState("Carregando sua evolução...");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!user) {
        return;
      }

      try {
        const history = await listRecentExerciseResults(user.uid, sessionLimit);
        if (!active) {
          return;
        }

        setResults(history);
        setState("ready");
        setStatus(
          history.length > 0
            ? `${history.length} ${history.length === 1 ? "série" : "séries"} no seu histórico recente.`
            : "Ainda não há séries registradas.",
        );
      } catch {
        if (active) {
          setState("error");
          setStatus("Não foi possível carregar sua evolução agora.");
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [refreshToken, user]);

  const series = useMemo(() => buildVolumeSeries(results), [results]);
  const maxVolume = useMemo(
    () => series.reduce((max, point) => Math.max(max, point.volumeKg), 0),
    [series],
  );
  const records = useMemo(() => {
    const exerciseIds = [...new Set(results.map((result) => result.exerciseId))];
    return exerciseIds
      .map((exerciseId) => detectPersonalRecord(results, exerciseId))
      .filter((record): record is PersonalRecord => record !== null)
      .sort((left, right) => right.loadKg - left.loadKg)
      .slice(0, 5);
  }, [results]);

  if (authStatus !== "authenticated") {
    return null;
  }

  const latest = series.at(-1);
  const previous = series.at(-2);
  // Comparação só com dados reais: dois treinos com volume registrado.
  const change =
    latest && previous && previous.volumeKg > 0
      ? Math.round(((latest.volumeKg - previous.volumeKg) / previous.volumeKg) * 100)
      : null;

  return (
    <div className="space-y-8">
      <section aria-labelledby="volume-title" className="space-y-3">
        <SectionHeader
          description={`Últimos ${sessionLimit} treinos concluídos · volume total ${formatKg(computeTotalVolume(results))}`}
          id="volume-title"
          title="Volume por treino"
        />
        <Card className="p-5">
          {state === "loading" ? (
            <LoadingState label={status} variant="list" lines={2} />
          ) : state === "error" ? (
            <ErrorState
              title="Não conseguimos carregar sua evolução."
              onRetry={() => {
                setState("loading");
                setRefreshToken((token) => token + 1);
              }}
            />
          ) : series.length === 0 ? (
            <EmptyState
              action={
                <Link className={buttonVariants({})} href="/workout">
                  Começar treino
                </Link>
              }
              description="Cada treino concluído vira uma barra aqui."
              icon={<TrendingUp />}
              title="Conclua um treino para ver sua evolução aqui."
            />
          ) : (
            <div className="space-y-4">
              {change !== null ? (
                <p
                  className={`flex items-center gap-2 text-wt-body-sm font-semibold ${
                    change >= 0 ? "text-wt-success-text" : "text-wt-text-secondary-strong"
                  }`}
                >
                  {change >= 0 ? (
                    <TrendingUp aria-hidden="true" className="size-4" />
                  ) : (
                    <TrendingDown aria-hidden="true" className="size-4" />
                  )}
                  {change >= 0 ? "↑" : "↓"} {Math.abs(change)}% de volume em relação ao treino
                  anterior
                </p>
              ) : null}
              <div aria-hidden="true" className="flex h-40 items-end gap-2">
                {series.map((point, index) => (
                  <div
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    key={point.label}
                  >
                    <span className="text-[0.6875rem] font-semibold text-wt-text-secondary-strong wt-tabular">
                      {formatCompact(point.volumeKg)}
                    </span>
                    <div
                      className={`w-full max-w-12 rounded-t-wt-sm ${
                        index === series.length - 1 ? "bg-wt-accent-hover" : "bg-wt-accent-border"
                      }`}
                      style={{
                        height: `${maxVolume > 0 ? Math.max(4, (point.volumeKg / maxVolume) * 100) : 4}%`,
                      }}
                    />
                    <span className="text-[0.6875rem] text-wt-text-secondary-strong wt-tabular">
                      {formatDay(point.label, false)}
                    </span>
                  </div>
                ))}
              </div>
              <table className="sr-only">
                <caption>Volume por sessão, da mais antiga para a mais recente</caption>
                <thead>
                  <tr>
                    <th scope="col">Sessão</th>
                    <th scope="col">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((point) => (
                    <tr key={point.label}>
                      <td>{formatDay(point.label)}</td>
                      <td>{formatKg(point.volumeKg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <LiveRegion politeness="polite">{status}</LiveRegion>
        </Card>
      </section>

      <section aria-labelledby="records-title" className="space-y-3">
        <SectionHeader
          description="A série mais pesada de cada exercício no seu histórico recente."
          id="records-title"
          title="Seus recordes"
        />
        {state !== "ready" ? null : records.length === 0 ? (
          <EmptyState icon={<Trophy />} title="Nenhum recorde registrado ainda." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {records.map((record) => {
              const suggestion = suggestProgression(
                findLastResult(results, record.exerciseId),
                defaultTarget,
              );

              return (
                <li key={record.exerciseId}>
                  <Card as="article" className="h-full space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate wt-text-h3">
                          {resolveExerciseName(record.exerciseId)}
                        </h3>
                        <p className="text-wt-body-sm text-wt-text-secondary-strong">
                          Recorde: {formatKg(record.loadKg)} × {record.reps} repetições em{" "}
                          {formatDay(record.achievedAt)}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-wt-full bg-wt-warning-subtle text-wt-warning-text"
                      >
                        <Trophy className="size-4" />
                      </span>
                    </div>
                    {suggestion ? (
                      <p className="flex gap-2 rounded-wt-md bg-wt-surface-elevated px-3 py-2 text-wt-body-sm text-wt-text-secondary-strong">
                        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong className="font-semibold text-wt-text-primary">
                            {actionLabels[suggestion.action]}
                          </strong>{" "}
                          — {formatKg(suggestion.suggestedLoadKg)} × {suggestion.suggestedReps}.{" "}
                          {suggestion.reason} Você decide se aplica: nada é alterado
                          automaticamente.
                        </span>
                      </p>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
