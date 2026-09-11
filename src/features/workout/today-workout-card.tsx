"use client";

import { ArrowRight, CircleCheck, Clock3, Dumbbell, Layers, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ErrorState, LoadingState } from "@/components/ui/states";
import type { OnboardingDraft } from "@/domain/onboarding/onboarding";
import type { WorkoutSession } from "@/domain/workout/session";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import { loadOnboardingDraft } from "@/features/onboarding/onboarding-repository";

import { createWorkoutInit } from "./workout-flow";
import { loadWorkoutSession } from "./workout-repository";
import {
  describeWorkoutSession,
  formatDurationShort,
  formatNumber,
  getActiveExercise,
  pluralize,
} from "./workout-summary";

type TodayState =
  | { kind: "loading" }
  | { kind: "error" }
  | {
      draft: OnboardingDraft | null;
      kind: "ready";
      /** `true` quando a sessão ainda não existe e é só uma prévia do plano. */
      preview: boolean;
      session: WorkoutSession;
    };

export function isOnboardingComplete(draft: OnboardingDraft | null): boolean {
  return Boolean(
    draft && (draft.summaryAcknowledged || draft.completedStepIds.includes("summary")),
  );
}

/**
 * Primeira pergunta do Início: "o que eu faço agora?". Mostra o treino ativo
 * (ou a prévia do plano gerado a partir do onboarding, sem gravar nada) com uma
 * única ação principal: começar, continuar ou finalizar.
 */
export function TodayWorkoutCard() {
  const { status, user } = useAuthSession();
  const [state, setState] = useState<TodayState>({ kind: "loading" });
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let active = true;

    async function load(uid: string) {
      try {
        const session = await loadWorkoutSession(uid);
        if (session) {
          if (active) {
            setState({ draft: null, kind: "ready", preview: false, session });
          }
          return;
        }

        // Sem sessão ainda: a prévia usa o mesmo gerador determinístico do
        // treino, em memória. Quem cria e salva a sessão é a tela de treino.
        const draft = await loadOnboardingDraft(uid);
        if (active) {
          setState({
            draft,
            kind: "ready",
            preview: true,
            session: createWorkoutInit(uid, draft).session,
          });
        }
      } catch {
        if (active) {
          setState({ kind: "error" });
        }
      }
    }

    void load(user.uid);

    return () => {
      active = false;
    };
  }, [refreshToken, status, user]);

  if (state.kind === "loading") {
    return <LoadingState label="Carregando seu treino de hoje…" lines={3} />;
  }

  if (state.kind === "error") {
    return (
      <ErrorState
        action={
          <Link className={buttonVariants({})} href="/workout">
            Abrir treino
          </Link>
        }
        description="Seu treino continua salvo. A tela de treino funciona mesmo com conexão ruim."
        title="Não conseguimos carregar seu treino de hoje."
        onRetry={() => {
          setState({ kind: "loading" });
          setRefreshToken((token) => token + 1);
        }}
      />
    );
  }

  const overview = describeWorkoutSession(state.session);
  const activeExercise = getActiveExercise(state.session);
  const names = state.session.exerciseQueue.map((item) => item.exerciseName);
  const needsOnboarding = state.preview && !isOnboardingComplete(state.draft);

  const cta =
    overview.status === "completed"
      ? { label: "Ver resumo", variant: "secondary" as const }
      : overview.status === "strength_done"
        ? { label: "Finalizar treino", variant: "primary" as const }
        : overview.status === "in_progress"
          ? { label: "Continuar treino", variant: "primary" as const }
          : { label: "Começar treino", variant: "primary" as const };

  return (
    <Card
      as="article"
      aria-labelledby="today-workout-title"
      className="space-y-5 p-5 sm:p-6"
      elevated
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="wt-kicker">Treino de hoje</p>
          <h2 className="wt-text-h1" id="today-workout-title">
            {overview.title}
          </h2>
        </div>
        {overview.status === "completed" ? (
          <Badge icon={<CircleCheck />} tone="success">
            Concluído
          </Badge>
        ) : overview.status === "in_progress" ? (
          <Badge tone="accent">Em andamento</Badge>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-wt-lg bg-wt-accent-subtle text-wt-accent-text"
          >
            <Dumbbell className="size-5" />
          </span>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-wt-body-sm text-wt-text-secondary-strong">
        <li className="flex items-center gap-1.5">
          <Clock3 aria-hidden="true" className="size-4" />
          {overview.status === "completed" && overview.durationSeconds !== null
            ? formatDurationShort(overview.durationSeconds)
            : `~${overview.estimatedMinutes} min`}
        </li>
        <li className="flex items-center gap-1.5">
          <Dumbbell aria-hidden="true" className="size-4" />
          {pluralize(overview.exerciseCount, "exercício", "exercícios")}
        </li>
        <li className="flex items-center gap-1.5">
          <Layers aria-hidden="true" className="size-4" />
          {pluralize(overview.totalSets, "série", "séries")}
        </li>
      </ul>

      {overview.status === "in_progress" && activeExercise ? (
        <div className="space-y-2">
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            Agora: <strong className="text-wt-text-primary">{activeExercise.exerciseName}</strong>
          </p>
          <ProgressBar
            label="Progresso do treino"
            max={overview.totalSets}
            size="md"
            value={overview.completedSets}
            valueText={`${overview.completedSets} de ${overview.totalSets} séries`}
          />
        </div>
      ) : overview.status === "completed" ? (
        <p className="text-wt-body-sm text-wt-text-secondary-strong wt-tabular">
          {pluralize(overview.completedSets, "série", "séries")} ·{" "}
          {formatNumber(overview.totalVolumeKg)} kg de volume
        </p>
      ) : (
        <p className="text-wt-body-sm text-wt-text-secondary-strong">
          {names.slice(0, 3).join(" · ")}
          {names.length > 3 ? ` · +${names.length - 3}` : ""}
        </p>
      )}

      <Link
        className={buttonVariants({
          className: "w-full sm:w-auto",
          size: "xl",
          variant: cta.variant,
        })}
        href="/workout"
      >
        {cta.label}
        <ArrowRight aria-hidden="true" className="size-5" />
      </Link>

      {needsOnboarding ? (
        <Link
          className="flex items-center gap-3 rounded-wt-lg bg-wt-accent-subtle px-4 py-3 text-wt-body-sm text-wt-accent-text hover:bg-wt-accent-border/50"
          href="/onboarding"
        >
          <Sparkles aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <strong className="font-semibold">Deixe o treino com a sua cara.</strong> Conte seu
            objetivo, rotina e equipamentos em poucos passos.
          </span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      ) : null}
    </Card>
  );
}
