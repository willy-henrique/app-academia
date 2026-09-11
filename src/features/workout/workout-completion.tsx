"use client";

import { ArrowRight, CircleCheck, HeartPulse } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Metric, MetricGrid } from "@/components/ui/metric";
import { Textarea } from "@/components/ui/textarea";

import { formatDurationShort, formatNumber, type WorkoutSessionOverview } from "./workout-summary";

type WorkoutCompletionProps = Readonly<{
  cardioCompleted: boolean;
  message: string;
  onRecoveryFeedbackChange: (value: string) => void;
  overview: WorkoutSessionOverview;
  recoveryFeedback: string;
}>;

/**
 * Fechamento do treino: mais emocional, mas só com números reais da sessão.
 * Sem calorias nem comparação com o treino anterior enquanto esses dados não
 * existirem — nada é inventado para parecer mais completo.
 */
export function WorkoutCompletion({
  cardioCompleted,
  message,
  onRecoveryFeedbackChange,
  overview,
  recoveryFeedback,
}: WorkoutCompletionProps) {
  return (
    <Card as="div" className="space-y-6 p-5 text-center sm:p-8" elevated>
      <div className="flex flex-col items-center gap-3">
        <span className="wt-pop-in grid size-16 place-items-center rounded-wt-full bg-wt-success-subtle text-wt-success-text">
          <CircleCheck aria-hidden="true" className="size-9" strokeWidth={2.25} />
        </span>
        <h2 className="wt-text-h1">Treino concluído</h2>
        <p className="max-w-md text-wt-body-sm text-wt-text-secondary-strong" role="status">
          {message}
        </p>
      </div>

      <MetricGrid className="grid-cols-2 rounded-wt-lg bg-wt-surface-elevated p-4 text-left sm:grid-cols-4">
        {overview.durationSeconds !== null ? (
          <Metric label="Tempo" value={formatDurationShort(overview.durationSeconds)} />
        ) : null}
        <Metric label="Volume" unit="kg" value={formatNumber(overview.totalVolumeKg)} />
        <Metric label="Séries" value={overview.completedSets} />
        <Metric label="Exercícios" value={overview.completedExercises} />
        <Metric label="Repetições" value={overview.totalReps} />
      </MetricGrid>

      <div className="flex flex-col items-center gap-2">
        {cardioCompleted ? (
          <Badge icon={<HeartPulse />} tone="success">
            Cardio registrado como concluído
          </Badge>
        ) : (
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            Cardio não foi registrado nesta sessão — e está tudo bem.{" "}
            <Link className="font-semibold text-wt-accent-text underline" href="/cardio">
              Registrar cardio
            </Link>{" "}
            não altera este treino de força.
          </p>
        )}
      </div>

      <div className="text-left">
        <Textarea
          hint="Energia, sono, dor muscular, motivação. Só você vê."
          id="recovery-feedback"
          label="Como você está se sentindo? (opcional)"
          value={recoveryFeedback}
          onChange={(event) => onRecoveryFeedbackChange(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link className={buttonVariants({ size: "large" })} href="/dashboard">
          Ir para o início
        </Link>
        <Link className={buttonVariants({ size: "large", variant: "secondary" })} href="/progress">
          Ver minha evolução <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </Card>
  );
}
