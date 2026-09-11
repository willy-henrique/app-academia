"use client";

import {
  Sparkles,
  Utensils,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AiWorkoutDietPlan } from "@/application/ai/coach-service";
import type { OnboardingDraft } from "@/domain/onboarding/onboarding";

type AiCoachModalProps = Readonly<{
  draft: OnboardingDraft | null;
  onClose?: () => void;
}>;

export function AiCoachSection({ draft }: AiCoachModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<AiWorkoutDietPlan | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"workout" | "nutrition">("workout");

  async function handleGenerate() {
    try {
      setLoading(true);
      setError(null);
      setExpanded(true);

      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: draft?.goal ?? "ganhar_massa",
          experience: draft?.experience ?? "intermediario",
          daysPerWeek: draft?.routine?.daysPerWeek ?? 4,
          sessionMinutes: draft?.routine?.sessionMinutes ?? 60,
          location: draft?.location ?? "academia",
          equipment: draft?.equipment ?? [],
          heightCm: draft?.physicalProfile?.heightCm,
          weightKg: draft?.physicalProfile?.weightKg,
          limitations: draft?.accessibility?.needs ?? [],
          safetyNotes: draft?.safetyNotes ?? undefined,
          cardioPreference: draft?.cardioPreference ?? "optional",
        }),
      });

      const data = await response.json();
      if (!data.ok || !data.plan) {
        throw new Error(data.error || "Falha ao gerar prescrição da IA.");
      }

      setPlan(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao consultar a IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-wt-accent/30 bg-gradient-to-br from-wt-surface via-wt-surface to-wt-accent-subtle/40 p-5 shadow-wt-surface transition-all">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-hover">
              <Sparkles className="size-4" />
            </span>
            <h2 className="wt-text-h3 text-wt-text-primary">WillCoach · IA Especialista</h2>
          </div>
          <p className="text-wt-body-sm text-wt-text-secondary">
            Gere uma periodização inteligente e estratégia de macros alinhada aos seus aparelhos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {plan ? (
            <Button
              variant="secondary"
              size="default"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? "Ocultar detalhes" : "Ver detalhes"}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              {expanded ? "Ocultar" : "Expandir"}
            </Button>
          ) : null}

          <Button
            variant="primary"
            size="default"
            loading={loading}
            loadingLabel="Gerando plano…"
            onClick={handleGenerate}
          >
            {plan ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
            {plan ? "Recalcular" : "Gerar com IA"}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-wt-md border border-wt-danger/30 bg-wt-danger-subtle p-3 text-xs text-wt-danger-text">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 py-6 text-wt-text-secondary">
          <Loader2 className="size-6 animate-spin text-wt-accent-hover" />
          <p className="text-xs font-semibold">
            Analisando sua rotina, biomecânica e gerando dieta e treino…
          </p>
        </div>
      ) : null}

      {plan && expanded && !loading ? (
        <div className="mt-5 space-y-4 border-t border-wt-border pt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("workout")}
              className={`flex items-center gap-1.5 rounded-wt-md px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === "workout"
                  ? "bg-wt-accent-hover text-wt-accent-foreground shadow-sm"
                  : "bg-wt-surface-elevated text-wt-text-secondary hover:text-wt-text-primary"
              }`}
            >
              <Dumbbell className="size-3.5" />
              Treino Prescrito ({plan.workout.exercises.length} exercícios)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("nutrition")}
              className={`flex items-center gap-1.5 rounded-wt-md px-3 py-1.5 text-xs font-bold transition-colors ${
                activeTab === "nutrition"
                  ? "bg-wt-accent-hover text-wt-accent-foreground shadow-sm"
                  : "bg-wt-surface-elevated text-wt-text-secondary hover:text-wt-text-primary"
              }`}
            >
              <Utensils className="size-3.5" />
              Dieta & Macros ({plan.nutrition.dailyCaloriesTarget} kcal)
            </button>
          </div>

          {activeTab === "workout" ? (
            <div className="space-y-3">
              <div className="rounded-wt-md bg-wt-surface-elevated/70 p-3 text-xs text-wt-text-secondary">
                <span className="font-bold text-wt-text-primary">{plan.workout.title}</span> · Foco:{" "}
                {plan.workout.focus} ({plan.workout.duration})
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {plan.workout.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex flex-col justify-between rounded-wt-md border border-wt-border bg-wt-surface p-3 transition-colors hover:border-wt-border-strong"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-wt-text-primary">{ex.name}</span>
                        <span className="rounded-wt-full bg-wt-accent-subtle px-2 py-0.5 text-[0.6875rem] font-bold text-wt-accent-text">
                          {ex.muscleGroup}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-wt-text-secondary-strong">
                        <strong className="text-wt-text-primary">{ex.sets} séries</strong> ×{" "}
                        {ex.reps} reps · RIR {ex.rir} · Descanso {ex.restSeconds}s
                      </p>
                    </div>
                    {ex.tip ? (
                      <p className="mt-2 border-t border-wt-border/60 pt-1.5 text-[0.7rem] italic text-wt-text-secondary">
                        💡 {ex.tip}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-wt-md bg-wt-surface-elevated p-2">
                  <div className="text-[0.65rem] font-bold text-wt-text-secondary">Calorias</div>
                  <div className="text-sm font-black text-wt-text-primary">
                    {plan.nutrition.dailyCaloriesTarget} kcal
                  </div>
                </div>
                <div className="rounded-wt-md bg-wt-surface-elevated p-2">
                  <div className="text-[0.65rem] font-bold text-wt-text-secondary">Proteína</div>
                  <div className="text-sm font-black text-wt-accent-text">
                    {plan.nutrition.macros.proteinGrams}g
                  </div>
                </div>
                <div className="rounded-wt-md bg-wt-surface-elevated p-2">
                  <div className="text-[0.65rem] font-bold text-wt-text-secondary">
                    Carboidratos
                  </div>
                  <div className="text-sm font-black text-wt-success-text">
                    {plan.nutrition.macros.carbsGrams}g
                  </div>
                </div>
                <div className="rounded-wt-md bg-wt-surface-elevated p-2">
                  <div className="text-[0.65rem] font-bold text-wt-text-secondary">Gorduras</div>
                  <div className="text-sm font-black text-wt-warning-text">
                    {plan.nutrition.macros.fatsGrams}g
                  </div>
                </div>
              </div>

              {plan.nutrition.guidelines.length > 0 ? (
                <ul className="space-y-1 rounded-wt-md bg-wt-surface-elevated/70 p-3 text-xs text-wt-text-secondary">
                  {plan.nutrition.guidelines.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-wt-accent-text">✓</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-wt-text-primary">Sugestão de Refeições</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plan.nutrition.suggestedMeals.map((meal, i) => (
                    <div
                      key={i}
                      className="rounded-wt-md border border-wt-border bg-wt-surface p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-wt-text-primary">
                        <span>{meal.meal}</span>
                        <span className="text-[0.65rem] font-semibold text-wt-accent-text">
                          P: {meal.protein} · C: {meal.carbs}
                        </span>
                      </div>
                      <p className="mt-1 text-wt-text-secondary">{meal.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
