"use client";

import { Bike, CalendarClock, CircleCheck, Footprints, HeartPulse, Timer } from "lucide-react";
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
  describeCardioRequirement,
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
  listCardioSessions,
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

    async function loadHistory() {
      if (!user) {
        return;
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

    void loadHistory();

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

  async function finish() {
    if (!session) {
      return;
    }

    const durationSeconds = Math.max(1, Number.parseInt(minutes, 10) || 15) * 60;
    const completed = completeCardioSession(session, { durationSeconds });

    setSaving(true);
    try {
      await saveCardioSession(completed);
      setSession(completed);
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
              feedback.text === "Nenhum cardio em andamento."
                ? "sr-only"
                : `flex items-center gap-2 rounded-wt-lg px-4 py-3 text-wt-body-sm ${
                    feedback.tone === "success"
                      ? "bg-wt-success-subtle text-wt-success-text"
                      : feedback.tone === "warning"
                        ? "bg-wt-warning-subtle text-wt-warning-text"
                        : feedback.tone === "danger"
                          ? "bg-wt-danger-subtle text-wt-danger-text"
                          : "bg-wt-surface-elevated text-wt-text-secondary-strong"
                  }`
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
                  label="Tipo de cardio"
                  onChange={(event) => setRequirement(event.target.value as CardioRequirement)}
                  options={cardioRequirementOptions.map((option) => ({
                    label: describeCardioRequirement(option),
                    value: option,
                  }))}
                  value={requirement}
                />
              </div>
              <Button
                className="w-full sm:w-auto"
                disabled={saving}
                size="xl"
                onClick={() => void start()}
              >
                Iniciar cardio
              </Button>
            </Card>
          ) : session ? (
            <Card as="div" className="space-y-6 p-5 sm:p-6" elevated>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-wt-lg bg-wt-accent-subtle text-wt-accent-text"
                  >
                    <ActiveIcon className="size-5" />
                  </span>
                  <div>
                    <h2 className="wt-text-h2">{modalityLabels[session.prescription.modality]}</h2>
                    <p className="text-wt-body-sm text-wt-text-secondary-strong">
                      Meta: {formatMinutes(targetSeconds)}
                    </p>
                  </div>
                </div>
                {session.status === "RESCHEDULED" ? (
                  <Badge icon={<CalendarClock />} tone="warning">
                    Reagendado
                  </Badge>
                ) : (
                  <Badge tone="accent">Em andamento</Badge>
                )}
              </div>

              {running ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-wt-label font-medium text-wt-text-secondary-strong">
                    <Timer aria-hidden="true" className="size-4" />
                    Tempo decorrido
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
              ) : null}

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
                <Button disabled={saving} size="xl" onClick={() => void finish()}>
                  Concluir cardio
                </Button>
                <Button
                  disabled={saving}
                  size="xl"
                  variant="secondary"
                  onClick={() => void reschedule()}
                >
                  Reagendar para amanhã
                </Button>
              </div>

              <div className="space-y-3 border-t border-wt-border pt-5">
                <div>
                  <h3 className="wt-text-h3">Não vai dar hoje?</h3>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    Tudo bem pular. Só registramos o motivo para o seu histórico.
                  </p>
                </div>
                <div aria-label="Motivos rápidos" className="flex flex-wrap gap-2" role="group">
                  {quickSkipReasons.map((reason) => (
                    <button
                      aria-pressed={skipReason === reason}
                      className={`inline-flex min-h-11 items-center rounded-wt-full border px-4 text-wt-label font-medium transition-colors duration-150 ${
                        skipReason === reason
                          ? "border-wt-accent-border bg-wt-accent-subtle text-wt-accent-text"
                          : "border-wt-border bg-wt-surface text-wt-text-primary hover:border-wt-border-strong"
                      }`}
                      key={reason}
                      type="button"
                      onClick={() => {
                        setSkipReason(reason);
                        setSkipError(null);
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <Input
                  error={skipError ?? undefined}
                  id="cardio-skip-reason"
                  label="Motivo para pular"
                  maxLength={500}
                  value={skipReason}
                  onChange={(event) => {
                    setSkipReason(event.target.value);
                    setSkipError(null);
                  }}
                />
                <Button disabled={saving} variant="ghost" onClick={() => void skip()}>
                  Pular cardio
                </Button>
              </div>
            </Card>
          ) : null}
        </div>

        <section aria-labelledby="cardio-history-title" className="space-y-3">
          <SectionHeader id="cardio-history-title" title="Seus cardios recentes" />
          {historyFailed && history.length === 0 ? (
            <p className="rounded-wt-lg bg-wt-surface-elevated px-4 py-3 text-wt-body-sm text-wt-text-secondary-strong">
              Não foi possível carregar seu histórico de cardio agora. O que você registrar aqui
              continua salvo.
            </p>
          ) : history.length === 0 ? (
            <EmptyState
              description="Quando fizer, pular ou reagendar um cardio, ele aparece aqui."
              icon={<HeartPulse />}
              title="Nenhum cardio registrado ainda."
            />
          ) : (
            <Card as="div" className="p-2">
              <ul className="divide-y divide-wt-border">
                {history.map((item) => {
                  const Icon = modalityIcons[item.prescription.modality];
                  const date = formatShortDate(
                    item.completedAt ?? item.skippedAt ?? item.startedAt,
                  );

                  return (
                    <li className="flex items-center gap-3 px-3 py-3" key={item.id}>
                      <span
                        aria-hidden="true"
                        className="grid size-9 shrink-0 place-items-center rounded-wt-md bg-wt-surface-elevated text-wt-text-secondary-strong"
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-wt-label font-semibold">
                          {modalityLabels[item.prescription.modality]}
                        </span>
                        {date ? (
                          <span className="block text-xs text-wt-text-secondary-strong">
                            {date}
                          </span>
                        ) : null}
                      </span>
                      {item.status === "COMPLETED" ? (
                        <Badge tone="success">{formatMinutes(item.durationSeconds)}</Badge>
                      ) : item.status === "SKIPPED" ? (
                        <Badge tone="neutral">Pulado</Badge>
                      ) : (
                        <Badge tone="warning">Pendente</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
