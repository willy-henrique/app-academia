"use client";

import { Bike, CalendarClock, CircleCheck, Footprints, HeartPulse, Timer, Play } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/states";
import {
  cardioModalityOptions,
  cardioRequirementOptions,
  completeCardioSession,
  createCardioPrescription,
  createCardioSession,
    rescheduleCardioSession,
  skipCardioSession,
  startCardioSession,
  type CardioModality,
  type CardioRequirement,
  type CardioSession,
} from "@/domain/cardio/cardio";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import { formatElapsed } from "@/features/workout/workout-summary";

import {
  findActiveCardioSession,
  listCardioSessions,
  persistActiveCardioLocal,
  recordCardioCompletionRequest,
  saveCardioSession,
} from "./cardio-repository";

const modalityLabels: Record<CardioModality, string> = {
  BIKE: "Bicicleta",
  ELLIPTICAL: "Elíptico",
  OTHER: "Outro",
  ROW: "Remo",
  RUN: "Corrida",
  STAIRS: "Escada",
  WALK: "Caminhada",
};

const modalityIcons: Record<CardioModality, typeof HeartPulse> = {
  BIKE: Bike,
  ELLIPTICAL: HeartPulse,
  OTHER: HeartPulse,
  ROW: HeartPulse,
  RUN: Footprints,
  STAIRS: HeartPulse,
  WALK: Footprints,
};

/** Motivos rápidos para pular — um toque em vez de digitar com a mão ocupada. */
const quickSkipReasons = ["Sem tempo hoje", "Cansaço", "Dor ou desconforto"] as const;

const historyLimit = 5;

type Feedback = Readonly<{ text: string; tone: "info" | "success" | "warning" | "danger" }>;

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

function formatShortDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/**
 * Standalone cardio. It runs on its own — starting, finishing, skipping or
 * moving cardio never blocks or changes a strength session.
 */
export function CardioPageClient() {
  const { status: authStatus, user } = useAuthSession();
  const [requirement, setRequirement] = useState<CardioRequirement>("OPTIONAL");
  const [modality, setModality] = useState<CardioModality>("WALK");
  const [minutes, setMinutes] = useState("15");
  const [skipReason, setSkipReason] = useState("");
  const [skipError, setSkipError] = useState<string | null>(null);
  const [session, setSession] = useState<CardioSession | null>(null);
  const [history, setHistory] = useState<CardioSession[]>([]);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({
    text: "Nenhum cardio em andamento.",
    tone: "info",
  });
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!user) {
        return;
      }

      try {
        // Recupera sessão ativa após refresh para evitar estado órfão
        const activeSession = await findActiveCardioSession(user.uid);
        if (active && activeSession) {
          setSession(activeSession);
          setModality(activeSession.prescription.modality);
          setMinutes(String(Math.max(1, Math.round(activeSession.prescription.targetSeconds / 60))));
          setFeedback({
            text: activeSession.status === "ACTIVE"
              ? "Cardio em andamento recuperado."
              : "Sessão de cardio pendente recuperada.",
            tone: "info",
          });
        }
      } catch (err) {
        console.error("[CardioPageClient] falha ao restaurar cardio ativo:", err);
      }

      try {
        const sessions = await listCardioSessions(user.uid, historyLimit);
        if (active) {
          setHistory(sessions);
        }
      } catch {
        if (active) {
          setHistoryFailed(true);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [user]);

  const pending =
    session !== null && session.status !== "COMPLETED" && session.status !== "SKIPPED";
  const running = pending && session?.status === "ACTIVE";

  // O relógio só anda enquanto há cardio em andamento.
  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  async function persist(next: CardioSession, message: Feedback) {
    setSaving(true);
    try {
      await saveCardioSession(next);
      setSession(next);
      setFeedback(message);
    } catch {
      setFeedback({ text: "Não foi possível salvar o cardio agora.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function start() {
    if (!user) {
      return;
    }

    const targetSeconds = Math.max(1, Number.parseInt(minutes, 10) || 15) * 60;
    const created = createCardioSession({
      id: `cardio-${crypto.randomUUID()}`,
      ownerUid: user.uid,
      prescription: createCardioPrescription(requirement, { modality, targetSeconds }),
      source: "STANDALONE",
    });

    setNow(new Date());
    setSkipError(null);
    await persist(startCardioSession(created), { text: "Cardio iniciado.", tone: "info" });
  }

  async function resume() {
    if (!session) return;
    const resumed = startCardioSession(session);
    setNow(new Date());
    await persist(resumed, { text: "Cardio retomado.", tone: "info" });
  }

  async function finish() {
    if (!session) {
      return;
    }

    // Calcula duração real feita baseada no timer ou no stepper
    const startedAtMs = session.startedAt ? Date.parse(session.startedAt) : Number.NaN;
    const calculatedMinutes = Number.isFinite(startedAtMs)
      ? Math.max(1, Math.round((Date.now() - startedAtMs) / 60000))
      : Number.parseInt(minutes, 10) || 15;

    const chosenMinutes = Number.parseInt(minutes, 10) || calculatedMinutes;
    const durationSeconds = chosenMinutes * 60;
    const completed = completeCardioSession(session, { durationSeconds });

    setSaving(true);
    try {
      await saveCardioSession(completed);
      setSession(completed);
      persistActiveCardioLocal(null);
      try {
        await recordCardioCompletionRequest(completed.id);
        setFeedback({ text: "Cardio concluído e somado à sua semana.", tone: "success" });
      } catch {
        setFeedback({
          text: "Cardio concluído. A semana será atualizada assim que houver conexão.",
          tone: "warning",
        });
      }
      setHistory((current) => [completed, ...current].slice(0, historyLimit));
    } catch {
      setFeedback({ text: "Não foi possível concluir o cardio agora.", tone: "danger" });
    } finally {
      setSaving(false);
    }
  }

  async function skip() {
    if (!session) {
      return;
    }

    try {
      const skipped = skipCardioSession(session, skipReason);
      setSkipError(null);
      await persist(skipped, {
        text: "Cardio pulado com o motivo registrado. Seu treino de força continua concluído.",
        tone: "info",
      });
      persistActiveCardioLocal(null);
      setHistory((current) => [skipped, ...current].slice(0, historyLimit));
      setSkipReason("");
    } catch {
      setSkipError("Informe o motivo para pular o cardio.");
    }
  }

  async function reschedule() {
    if (!session) {
      return;
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const rescheduled = rescheduleCardioSession(session, tomorrow);
    await persist(rescheduled, {
      text: "Cardio reagendado. Ele continua pendente, não concluído.",
      tone: "info",
    });
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  const startedAtMs = session?.startedAt ? Date.parse(session.startedAt) : Number.NaN;
  const elapsedSeconds =
    running && Number.isFinite(startedAtMs)
      ? Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000))
      : 0;
  const targetSeconds = session?.prescription.targetSeconds ?? 0;
  const ActiveIcon = session ? modalityIcons[session.prescription.modality] : HeartPulse;

  return (
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        description="Opcional e independente: fazer, pular ou reagendar nunca muda seu treino de força."
        title="Cardio"
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4">
          {/* Retorno das ações: visível sempre, com tom de acordo com o que aconteceu. */}
          <p
            aria-atomic="true"
            aria-live="polite"
            className={
              feedback.tone === "success"
                ? "rounded-wt-lg bg-wt-success-subtle px-4 py-3 text-wt-body-sm text-wt-success-text flex items-center gap-2"
                : feedback.tone === "danger"
                  ? "rounded-wt-lg bg-wt-danger-subtle px-4 py-3 text-wt-body-sm text-wt-danger-text flex items-center gap-2"
                  : feedback.tone === "warning"
                    ? "rounded-wt-lg bg-wt-surface-elevated px-4 py-3 text-wt-body-sm text-wt-text-primary flex items-center gap-2"
                    : "rounded-wt-lg bg-wt-surface px-4 py-3 text-wt-body-sm text-wt-text-secondary flex items-center gap-2 border border-wt-border"
            }
            role="status"
          >
            {feedback.tone === "success" ? (
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
            {feedback.text}
          </p>

          {!pending ? (
            <Card as="div" className="space-y-6 p-5 sm:p-6" elevated>
              <h2 className="wt-text-h2">Novo cardio</h2>
              <SegmentedControl
                label="Modalidade"
                layout="wrap"
                options={cardioModalityOptions.map((option) => ({
                  label: modalityLabels[option],
                  value: option,
                }))}
                value={modality}
                onValueChange={setModality}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberStepper
                  id="cardio-minutes"
                  label="Duração"
                  max={240}
                  min={1}
                  step={5}
                  unit="min"
                  value={minutes}
                  onValueChange={setMinutes}
                />
                <Select
                  id="cardio-requirement"
                  label="Papel no plano"
                  options={cardioRequirementOptions.map((option) => ({
                    label:
                      option === "OPTIONAL"
                        ? "Opcional"
                        : option === "RECOMMENDED"
                          ? "Recomendado"
                          : "Obrigatório pelo plano",
                    value: option,
                  }))}
                  value={requirement}
                  onChange={(event) => setRequirement(event.target.value as CardioRequirement)}
                />
              </div>
              <Button disabled={saving} size="xl" onClick={() => void start()}>
                Iniciar cardio
              </Button>
            </Card>
          ) : (
            <Card as="div" className="space-y-6 p-5 sm:p-6" elevated>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-12 place-items-center rounded-wt-lg bg-wt-accent-subtle text-wt-accent-text"
                  >
                    <ActiveIcon className="size-6" />
                  </span>
                  <div>
                    <p className="wt-kicker">Cardio em andamento</p>
                    <h2 className="wt-text-h1">
                      {modalityLabels[session.prescription.modality]} ·{" "}
                      {formatMinutes(session.prescription.targetSeconds)}
                    </h2>
                  </div>
                </div>
                <Badge tone={running ? "accent" : "warning"}>
                  {running ? "Em andamento" : "Pendente"}
                </Badge>
              </div>

              {running ? (
                <div className="space-y-2">
                  <p className="text-wt-caption text-wt-text-secondary-strong">
                    Tempo de cardio decorrido
                  </p>
                  <p
                    aria-hidden="true"
                    className="text-[3rem] font-extrabold leading-none tracking-[-0.03em] wt-tabular"
                  >
                    {formatElapsed(elapsedSeconds)}
                  </p>
                  <ProgressBar
                    label="Tempo em relação à meta"
                    max={Math.max(1, targetSeconds)}
                    size="md"
                    tone={elapsedSeconds >= targetSeconds ? "success" : "accent"}
                    value={elapsedSeconds}
                    valueText={`${Math.floor(elapsedSeconds / 60)} de ${Math.round(targetSeconds / 60)} minutos`}
                  />
                </div>
              ) : (
                <div className="rounded-wt-md bg-wt-surface-elevated p-4 text-wt-body-sm text-wt-text-secondary">
                  Esta sessão está salva como pendente. Você pode retomá-la agora ou finalizar diretamente.
                </div>
              )}

              <NumberStepper
                hint="Ajuste se fez mais ou menos que o planejado."
                id="cardio-minutes"
                label="Duração feita"
                max={240}
                min={1}
                step={5}
                unit="min"
                value={minutes}
                onValueChange={setMinutes}
              />

              <div className="grid gap-2 sm:flex">
                {!running ? (
                  <Button disabled={saving} size="xl" variant="secondary" onClick={() => void resume()}>
                    <Play className="size-4" />
                    Retomar cardio
                  </Button>
                ) : null}
                <Button disabled={saving} size="xl" onClick={() => void finish()}>
                  Concluir cardio
                </Button>
                <Button
                  disabled={saving}
                  size="xl"
                  variant="ghost"
                  onClick={() => void reschedule()}
                >
                  <CalendarClock aria-hidden="true" className="size-4" />
                  Reagendar para amanhã
                </Button>
              </div>

              <div className="space-y-2 border-t border-wt-border pt-4">
                <p className="wt-text-label">Pular o cardio hoje</p>
                <div className="flex flex-wrap gap-2">
                  {quickSkipReasons.map((reason) => (
                    <button
                      className="rounded-wt-full border border-wt-border bg-wt-surface px-3 py-1.5 text-xs font-semibold text-wt-text-secondary hover:border-wt-border-strong hover:text-wt-text-primary"
                      key={reason}
                      type="button"
                      onClick={() => setSkipReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <Input
                  error={skipError ?? undefined}
                  label="Motivo para pular"
                  placeholder="Ex.: sem tempo hoje, cansaço, dor no joelho"
                  value={skipReason}
                  onChange={(event) => {
                    setSkipReason(event.target.value);
                    if (skipError) {
                      setSkipError(null);
                    }
                  }}
                />
                <Button disabled={saving} variant="danger" onClick={() => void skip()}>
                  Pular cardio
                </Button>
              </div>
            </Card>
          )}
        </div>

        <section aria-labelledby="cardio-history-title" className="space-y-4">
          <SectionHeader
            description="Suas últimas sessões individuais. Cardio fica separado da musculação."
            id="cardio-history-title"
            title="Histórico de cardio"
          />

          {historyFailed ? (
            <p className="text-wt-body-sm text-wt-text-secondary">
              Não foi possível carregar o histórico de cardio agora.
            </p>
          ) : history.length === 0 ? (
            <EmptyState
              description="Suas sessões de esteira, bicicleta e caminhada aparecem aqui assim que forem concluídas."
              icon={<Timer aria-hidden="true" className="size-8 text-wt-text-secondary" />}
              title="Nenhum cardio recente"
            />
          ) : (
            <ul className="divide-y divide-wt-border overflow-hidden rounded-wt-card border border-wt-border bg-wt-surface">
              {history.map((item) => {
                const Icon = modalityIcons[item.prescription.modality];
                const isSkipped = item.status === "SKIPPED";
                const dateLabel = formatShortDate(
                  typeof item.completedAt === "string"
                    ? item.completedAt
                    : typeof item.createdAt === "string"
                      ? item.createdAt
                      : null,
                );

                return (
                  <li
                    className="flex min-h-16 items-center gap-3 px-4 py-3"
                    key={item.id}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-wt-md bg-wt-surface-elevated text-wt-text-secondary-strong"
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-wt-label font-semibold">
                          {modalityLabels[item.prescription.modality]}
                        </span>
                        {isSkipped ? (
                          <Badge tone="neutral">Pulado</Badge>
                        ) : item.status === "RESCHEDULED" ? (
                          <Badge tone="warning">Reagendado</Badge>
                        ) : (
                          <Badge tone="success">Concluído</Badge>
                        )}
                      </div>
                      <p className="text-xs text-wt-text-secondary-strong">
                        {isSkipped
                          ? item.skipReason ?? "Sem motivo informado"
                          : `${formatMinutes(item.durationSeconds)} · meta ${formatMinutes(item.prescription.targetSeconds)}`}
                        {dateLabel ? ` · ${dateLabel}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
