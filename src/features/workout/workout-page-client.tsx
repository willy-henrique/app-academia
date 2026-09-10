"use client";

import {
  BookOpen,
  CircleCheck,
  CloudOff,
  Clock3,
  History,
  ListOrdered,
  MessageSquarePlus,
  Repeat2,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { createDefaultOnboardingDraft, type OnboardingDraft } from "@/domain/onboarding/onboarding";
import { findLastResult, type ExerciseSetResult } from "@/domain/progression/progression";
import { seedExercises } from "@/domain/workout/exercise-seed";
import {
  advanceWorkoutExercise,
  adjustWorkoutRest,
  getWorkoutRestState,
  recordWorkoutSet,
  skipWorkoutRest,
  swapWorkoutExercise,
  type WorkoutSession,
  type WorkoutSet,
} from "@/domain/workout/session";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import { SendTrainingInvitePanel } from "@/features/group/send-training-invite-panel";
import { loadOnboardingDraft } from "@/features/onboarding/onboarding-repository";
import { listRecentExerciseResults } from "@/features/progression/history-repository";
import { recordWorkoutCompletionRequest } from "@/features/progression/weekly-stats-repository";

import { capitalize, formatEquipment } from "./exercise-labels";
import { ExerciseMedia } from "./exercise-media";
import { ExerciseQueue } from "./exercise-queue";
import {
  flushPendingWorkoutSets,
  getWorkoutSyncStatus,
  loadActiveWorkoutSession,
  persistActiveWorkoutSession,
  saveWorkoutSetWithOfflineFallback,
} from "./offline-workout-store";
import { RestTimer } from "./rest-timer";
import { WorkoutCompletion } from "./workout-completion";
import { createWorkoutInit, finishStrengthSession } from "./workout-flow";
import { loadWorkoutSession, saveWorkoutSession } from "./workout-repository";
import {
  describeWorkoutSession,
  formatElapsed,
  formatKg,
  getActiveExercise,
  pluralize,
} from "./workout-summary";

type FeedbackTone = "info" | "success" | "warning" | "danger";
type Feedback = Readonly<{ text: string; tone: FeedbackTone }>;

/** Sessões antigas de histórico usadas só para "Última vez" e carga sugerida. */
const recentHistorySessions = 3;
const setConfirmationMs = 2600;

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toExerciseSet(
  session: WorkoutSession,
  uid: string,
  loadKg: number,
  reps: number,
  rir: number,
  feedback: string | null,
  notes: string | null,
): WorkoutSet {
  const currentExercise = session.exerciseQueue[session.currentExerciseIndex];
  const completedAt = new Date().toISOString();

  return {
    completedAt,
    createdAt: completedAt,
    exerciseId: currentExercise?.exerciseId ?? "unknown",
    feedback,
    loadKg,
    notes,
    reps,
    rir,
    sessionId: session.id,
    setIndex: currentExercise ? currentExercise.completedSets + 1 : 1,
    uid,
  };
}

/**
 * Sessão salva com o exercício atual já completo mas com um próximo pendente
 * (ex.: salva no meio do avanço) é normalizada para o próximo exercício.
 */
function normalizeLoadedSession(session: WorkoutSession): WorkoutSession {
  const current = session.exerciseQueue[session.currentExerciseIndex];
  const hasNext = session.currentExerciseIndex + 1 < session.exerciseQueue.length;

  if (
    session.status !== "COMPLETED" &&
    current &&
    current.completedSets >= current.prescription.sets &&
    hasNext
  ) {
    return advanceWorkoutExercise(session, new Date());
  }

  return session;
}

function vibrate(pattern: number | number[]) {
  // Retorno tátil é um extra: o navegador pode não ter a API ou bloqueá-la.
  try {
    window.navigator.vibrate?.(pattern);
  } catch {
    // sem vibração, o retorno visual continua
  }
}

type WorkoutPageClientProps = Readonly<{
  autosaveDelayMs?: number;
}>;

export function WorkoutPageClient({ autosaveDelayMs = 550 }: WorkoutPageClientProps) {
  const { user, status } = useAuthSession();
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>({ text: "Pronto para iniciar.", tone: "info" });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendingSets, setPendingSets] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [loadKg, setLoadKg] = useState("20");
  const [reps, setReps] = useState("10");
  const [rir, setRir] = useState("2");
  const [setNotes, setSetNotes] = useState("");
  const [setFeedbackText, setSetFeedbackText] = useState("");
  const [recoveryFeedback, setRecoveryFeedback] = useState("");
  const [showPartnerInvite, setShowPartnerInvite] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentResults, setRecentResults] = useState<ExerciseSetResult[]>([]);
  const [prefilledKey, setPrefilledKey] = useState<string | null>(null);
  const [setConfirmation, setSetConfirmation] = useState<string | null>(null);
  const hydrationRef = useRef(false);
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const confirmationTimeoutRef = useRef<number | undefined>(undefined);
  const wasRestingRef = useRef(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(confirmationTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (status !== "authenticated" || !user) {
        return;
      }

      try {
        setLoading(true);
        const loadedDraft = await loadOnboardingDraft(user.uid);
        if (!active) {
          return;
        }
        setOnboardingDraft(loadedDraft);

        const loadedSession = await loadWorkoutSession(user.uid);
        if (!active) {
          return;
        }

        if (loadedSession) {
          setSession(normalizeLoadedSession(loadedSession));
          setRecoveryFeedback(loadedSession.recoveryFeedback ?? "");
          setFeedback({ text: "Sessão recuperada.", tone: "info" });
        } else {
          const initial = createWorkoutInit(user.uid, loadedDraft);
          setSession(initial.session);
          setFeedback({
            text: "Treino inicial criado a partir do seu onboarding.",
            tone: "info",
          });
          await saveWorkoutSession(user.uid, initial.session);
        }

        hydrationRef.current = true;
      } catch {
        const offlineSession = loadActiveWorkoutSession();
        if (active && offlineSession) {
          setSession(normalizeLoadedSession(offlineSession));
          setRecoveryFeedback(offlineSession.recoveryFeedback ?? "");
          setFeedback({
            text: "Sessão recuperada deste aparelho enquanto a conexão não volta.",
            tone: "warning",
          });
          hydrationRef.current = true;
          return;
        }

        if (active) {
          const fallbackDraft = createDefaultOnboardingDraft();
          setOnboardingDraft(fallbackDraft);
          const initial = createWorkoutInit(user.uid, fallbackDraft);
          setSession(initial.session);
          setRecoveryFeedback(initial.session.recoveryFeedback ?? "");
          setFeedback({
            text: "Não conseguimos carregar seu perfil de treino agora. Montamos um treino padrão enquanto isso.",
            tone: "warning",
          });
          hydrationRef.current = true;
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [status, user]);

  // Histórico curto e sob demanda: uma leitura limitada, sem listener. Falhar
  // aqui não atrapalha o treino — só some o "Última vez".
  useEffect(() => {
    if (status !== "authenticated" || !user) {
      return;
    }

    let active = true;
    listRecentExerciseResults(user.uid, recentHistorySessions)
      .then((results) => {
        if (active) {
          setRecentResults(results);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [status, user]);

  useEffect(() => {
    if (!hydrationRef.current || status !== "authenticated" || !user || !session) {
      return;
    }

    window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        setSaveState("saving");
        await saveWorkoutSession(user.uid, {
          ...session,
          recoveryFeedback: recoveryFeedback.trim() || null,
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, autosaveDelayMs);

    return () => {
      window.clearTimeout(saveTimeoutRef.current);
    };
  }, [autosaveDelayMs, recoveryFeedback, session, status, user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function syncPendingCount() {
      setPendingSets(getWorkoutSyncStatus().pendingCount);
    }

    void Promise.resolve().then(syncPendingCount);

    function handleOnline() {
      void flushPendingWorkoutSets()
        .then((sync) => {
          setPendingSets(sync.pendingCount);
          if (sync.syncedCount > 0) {
            setFeedback({
              text: `${pluralize(sync.syncedCount, "série guardada foi enviada", "séries guardadas foram enviadas")}.`,
              tone: "success",
            });
          }
        })
        .catch(() =>
          setFeedback({
            text: "A sincronização falhou. Suas séries continuam guardadas.",
            tone: "warning",
          }),
        );
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const activeExercise = session ? getActiveExercise(session) : null;
  const exerciseDetails = useMemo(() => {
    if (!activeExercise) {
      return null;
    }

    return seedExercises.find((exercise) => exercise.id === activeExercise.exerciseId) ?? null;
  }, [activeExercise]);

  const lastResult = useMemo(
    () => (activeExercise ? findLastResult(recentResults, activeExercise.exerciseId) : null),
    [activeExercise, recentResults],
  );

  // Ao entrar em um exercício, os campos começam pela última carga usada (ou
  // mantêm a atual) e pela meta de repetições. É estado de tela, derivado
  // durante a renderização — o padrão do React para "ajustar ao mudar a prop".
  const exerciseKey = session && activeExercise ? `${session.currentExerciseIndex}:${activeExercise.exerciseId}` : null;
  if (exerciseKey && exerciseKey !== prefilledKey && activeExercise) {
    setPrefilledKey(exerciseKey);
    if (lastResult && lastResult.loadKg > 0) {
      setLoadKg(String(lastResult.loadKg));
    }
    setReps(String(lastResult?.reps || activeExercise.prescription.repsMax));
    setRir(String(activeExercise.prescription.rirTarget ?? 2));
  }

  const restState = useMemo(
    () => (session ? getWorkoutRestState(session, now) : null),
    [now, session],
  );
  const resting = Boolean(activeExercise && restState && !restState.ready);

  useEffect(() => {
    if (wasRestingRef.current && !resting && activeExercise) {
      vibrate([120, 60, 120]);
    }
    wasRestingRef.current = resting;
  }, [activeExercise, resting]);

  const overview = useMemo(() => (session ? describeWorkoutSession(session) : null), [session]);

  function confirmSet(text: string) {
    setSetConfirmation(text);
    window.clearTimeout(confirmationTimeoutRef.current);
    confirmationTimeoutRef.current = window.setTimeout(
      () => setSetConfirmation(null),
      setConfirmationMs,
    );
  }

  async function handleCompleteSet() {
    if (!user || !session || !activeExercise) {
      return;
    }

    const completedAt = new Date();
    const loadValue = parseNumber(loadKg, 0);
    const repsValue = parseNumber(reps, activeExercise.prescription.repsMin);
    const rirValue = Math.max(
      0,
      Math.min(10, parseNumber(rir, activeExercise.prescription.rirTarget ?? 2)),
    );
    const setFeedbackValue = setFeedbackText.trim() || null;
    const notes = setNotes.trim() || null;
    const nextSet = toExerciseSet(
      session,
      user.uid,
      loadValue,
      repsValue,
      rirValue,
      setFeedbackValue,
      notes,
    );

    setActionLoading(true);
    try {
      const recorded = recordWorkoutSet(
        session,
        {
          feedback: setFeedbackValue,
          loadKg: loadValue,
          notes,
          reps: repsValue,
          rir: rirValue,
          setIndex: nextSet.setIndex,
        },
        completedAt,
      );

      const sync = await saveWorkoutSetWithOfflineFallback(user.uid, recorded, nextSet);
      setPendingSets(sync.pendingCount);

      const exerciseAfterSet = recorded.exerciseQueue[recorded.currentExerciseIndex];
      const nextSession =
        exerciseAfterSet && exerciseAfterSet.completedSets >= exerciseAfterSet.prescription.sets
          ? advanceWorkoutExercise(recorded, completedAt)
          : recorded;

      setSession(nextSession);
      persistActiveWorkoutSession(nextSession);
      setFeedback(
        sync.status === "QUEUED"
          ? {
              text: `Série ${nextSet.setIndex} salva neste aparelho. Ela será enviada quando a conexão voltar.`,
              tone: "warning",
            }
          : {
              text: `Série ${nextSet.setIndex} concluída para ${activeExercise.exerciseName}.`,
              tone: "success",
            },
      );
      confirmSet(`Série ${nextSet.setIndex} concluída`);
      vibrate(40);
      setSetNotes("");
      setSetFeedbackText("");
      setReps(String(activeExercise.prescription.repsMax));
    } catch {
      setFeedback({
        text: "Não foi possível salvar esta série. Tente novamente.",
        tone: "danger",
      });
    } finally {
      setActionLoading(false);
    }
  }

  const swapReplacement =
    exerciseDetails?.regressions[0] ?? exerciseDetails?.alternatives[0] ?? null;

  async function handleSwap() {
    if (!session || !activeExercise || !exerciseDetails) {
      return;
    }

    if (!swapReplacement) {
      setFeedback({ text: "Nenhuma alternativa disponível para este exercício.", tone: "info" });
      return;
    }

    setActionLoading(true);
    try {
      const updated = swapWorkoutExercise(
        skipWorkoutRest(session, new Date()),
        {
          exerciseId: swapReplacement.exerciseId,
          exerciseName: swapReplacement.label,
        },
        swapReplacement.criteria,
        new Date(),
      );

      setSession(updated);
      setFeedback({ text: `Troca aplicada: ${swapReplacement.label}.`, tone: "success" });
    } finally {
      setActionLoading(false);
    }
  }

  function handleAdjustRest(deltaSeconds: number) {
    if (!session) {
      return;
    }

    setSession(adjustWorkoutRest(session, deltaSeconds, new Date()));
  }

  function handleSkipRest() {
    if (!session) {
      return;
    }

    setSession(skipWorkoutRest(session, new Date()));
    setFeedback({ text: "Descanso pulado.", tone: "info" });
  }

  async function handleFinish(cardioStatus: "COMPLETED" | "SKIPPED") {
    if (!session) {
      return;
    }

    setActionLoading(true);
    try {
      const finished = finishStrengthSession(session, cardioStatus);
      setSession(finished);
      setRecoveryFeedback(finished.recoveryFeedback ?? recoveryFeedback);
      const baseMessage =
        cardioStatus === "COMPLETED"
          ? "Treino finalizado com cardio."
          : "Treino finalizado sem cardio.";

      if (!user) {
        setFeedback({ text: baseMessage, tone: "success" });
        return;
      }

      // A sessão precisa estar persistida como COMPLETED antes de pedir o
      // crédito: o servidor lê a sessão como fonte de verdade.
      await saveWorkoutSession(user.uid, {
        ...finished,
        recoveryFeedback: recoveryFeedback.trim() || null,
      });

      try {
        await recordWorkoutCompletionRequest(finished.id);
        setFeedback({ text: `${baseMessage} Estatística semanal atualizada.`, tone: "success" });
      } catch {
        setFeedback({
          text: `${baseMessage} A estatística semanal será atualizada assim que houver conexão.`,
          tone: "warning",
        });
      }
    } finally {
      setActionLoading(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <main className="wt-page" id="main-content">
        <p className="wt-text-body text-wt-text-secondary-strong">
          Você precisa entrar para iniciar um treino.
        </p>
      </main>
    );
  }

  if (loading || !session || !onboardingDraft || !overview) {
    return (
      <main className="wt-page max-w-3xl space-y-4" id="main-content">
        <LoadingState label="Preparando seu treino…" lines={4} />
        {saveState === "error" ? (
          <p className="wt-text-caption text-wt-danger-text">
            Falha ao sincronizar o treino agora.
          </p>
        ) : null}
      </main>
    );
  }

  const isFinished = session.status === "COMPLETED";
  const awaitingFinish = !isFinished && !activeExercise;
  const currentRest = restState ?? { elapsedSeconds: 0, ready: true, remainingSeconds: 0 };
  const startedAtMs = session.startedAt ? Date.parse(session.startedAt) : Number.NaN;
  const elapsedSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - startedAtMs) / 1000))
    : null;
  const setNumber = activeExercise ? activeExercise.completedSets + 1 : 0;
  const nextLabel = activeExercise
    ? `série ${setNumber} de ${activeExercise.prescription.sets} · ${activeExercise.exerciseName}`
    : "";
  const syncLabel =
    pendingSets > 0
      ? `${pluralize(pendingSets, "série guardada", "séries guardadas")} neste aparelho`
      : saveState === "saving"
        ? "Salvando treino..."
        : saveState === "saved"
          ? "Treino sincronizado."
          : saveState === "error"
            ? "Não foi possível sincronizar o treino."
            : "Treino pronto.";
  const visibleAlert = feedback.tone === "warning" || feedback.tone === "danger";
  const prescription = activeExercise?.prescription;
  const repsTarget = prescription
    ? prescription.repsMin === prescription.repsMax
      ? `${prescription.repsMax}`
      : `${prescription.repsMin}–${prescription.repsMax}`
    : "";
  const canRepeatLast =
    lastResult !== null &&
    (String(lastResult.loadKg) !== loadKg || String(lastResult.reps) !== reps);

  const inviteButton = !isFinished ? (
    <Button
      aria-expanded={showPartnerInvite}
      aria-haspopup="dialog"
      variant="secondary"
      onClick={() => setShowPartnerInvite(true)}
    >
      <UsersRound aria-hidden="true" className="size-4" />
      <span className="sr-only sm:not-sr-only">Treinar com alguém</span>
    </Button>
  ) : null;

  return (
    <main className="wt-page" id="main-content">
      {/* Cabeçalho da sessão: fixo no topo do celular para o progresso nunca sumir. */}
      <header className="sticky top-0 z-[var(--wt-z-sticky)] -mx-[clamp(1rem,4vw,2rem)] -mt-[clamp(1rem,3vw,2.5rem)] mb-4 border-b border-wt-border bg-wt-background/90 px-[clamp(1rem,4vw,2rem)] pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md lg:static lg:mx-0 lg:mt-0 lg:mb-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold tracking-[-0.02em] sm:text-2xl">
              {isFinished ? "Resumo do treino" : overview.title}
            </h1>
            <p className="text-wt-body-sm text-wt-text-secondary-strong wt-tabular">
              {isFinished || awaitingFinish
                ? `${pluralize(overview.exerciseCount, "exercício", "exercícios")} · ${pluralize(overview.completedSets, "série", "séries")}`
                : `Exercício ${session.currentExerciseIndex + 1} de ${overview.exerciseCount}`}
            </p>
          </div>
          {elapsedSeconds !== null && !isFinished ? (
            <span
              aria-label={`Tempo de treino: ${Math.floor(elapsedSeconds / 60)} minutos`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-wt-full bg-wt-surface px-3 text-wt-label font-semibold text-wt-text-primary shadow-[inset_0_0_0_1px_var(--wt-color-border)] wt-tabular"
              role="img"
            >
              <Clock3 aria-hidden="true" className="size-4 text-wt-text-secondary" />
              {formatElapsed(elapsedSeconds)}
            </span>
          ) : null}
          {!isFinished ? (
            <Button
              aria-label="Ver sequência do treino"
              className="lg:hidden"
              size="icon"
              variant="secondary"
              onClick={() => setShowQueue(true)}
            >
              <ListOrdered aria-hidden="true" className="size-5" />
            </Button>
          ) : null}
          {inviteButton}
        </div>
        {!isFinished ? (
          <ProgressBar
            className="mt-3"
            label="Progresso do treino"
            max={overview.totalSets}
            value={overview.completedSets}
            valueText={`${overview.completedSets} de ${overview.totalSets} séries`}
          />
        ) : null}
      </header>

      <LiveRegion politeness="polite">{syncLabel}</LiveRegion>

      {pendingSets > 0 || saveState === "error" ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {pendingSets > 0 ? (
            <Badge icon={<CloudOff />} tone="warning">
              {syncLabel}
            </Badge>
          ) : (
            <Badge icon={<CloudOff />} tone="danger">
              Sem conexão · tentaremos de novo
            </Badge>
          )}
        </div>
      ) : null}

      {/*
        Uma única região viva para o retorno das ações: visível quando pede
        atenção (offline, erro), só para leitor de tela quando é confirmação.
        No fim do treino, a mensagem vai para o resumo.
      */}
      {!isFinished ? (
        <p
          aria-atomic="true"
          aria-live="polite"
          className={
            visibleAlert
              ? `mb-4 rounded-wt-lg px-4 py-3 text-wt-body-sm ${
                  feedback.tone === "danger"
                    ? "bg-wt-danger-subtle text-wt-danger-text"
                    : "bg-wt-warning-subtle text-wt-warning-text"
                }`
              : "sr-only"
          }
          role="status"
        >
          {feedback.text}
        </p>
      ) : null}

      {isFinished ? (
        <div className="mx-auto max-w-2xl">
          <WorkoutCompletion
            cardioCompleted={session.optionalCardioStatus === "COMPLETED"}
            message={feedback.text}
            overview={overview}
            recoveryFeedback={recoveryFeedback}
            onRecoveryFeedbackChange={(value) => {
              setRecoveryFeedback(value);
              setSession((current) => (current ? { ...current, recoveryFeedback: value } : current));
            }}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div className="min-w-0 space-y-4">
            {awaitingFinish ? (
              <Card as="div" className="space-y-5 p-5 sm:p-7" elevated>
                <div className="space-y-2">
                  <span className="grid size-12 place-items-center rounded-wt-full bg-wt-success-subtle text-wt-success-text">
                    <CircleCheck aria-hidden="true" className="size-7" />
                  </span>
                  <h2 className="wt-text-h1">Musculação concluída</h2>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    Cardio é opcional. Encerre agora ou registre que também fez cardio — as duas
                    opções contam o treino de força.
                  </p>
                </div>
                <div className="grid gap-2 sm:flex">
                  <Button
                    loading={actionLoading}
                    loadingLabel="Salvando"
                    size="xl"
                    onClick={() => void handleFinish("SKIPPED")}
                  >
                    Concluir sem cardio
                  </Button>
                  <Button
                    loading={actionLoading}
                    loadingLabel="Salvando"
                    size="xl"
                    variant="secondary"
                    onClick={() => void handleFinish("COMPLETED")}
                  >
                    Fiz cardio também
                  </Button>
                </div>
              </Card>
            ) : null}

            {activeExercise && resting ? (
              <RestTimer
                disabled={actionLoading}
                elapsedSeconds={currentRest.elapsedSeconds}
                nextLabel={nextLabel}
                remainingSeconds={currentRest.remainingSeconds}
                onAdjust={handleAdjustRest}
                onSkip={handleSkipRest}
              />
            ) : null}
            {/*
              O número do descanso muda a cada segundo: anunciá-lo inundaria o
              leitor de tela. Só a mudança de estado é anunciada.
            */}
            {activeExercise ? (
              <p className="sr-only" role="timer">
                {currentRest.ready
                  ? "Descanso concluído. Você pode iniciar a próxima série."
                  : `Descanso em andamento: faltam ${currentRest.remainingSeconds} segundos.`}
              </p>
            ) : null}

            {activeExercise && prescription ? (
              <Card as="div" className="space-y-5 p-4 sm:p-6" elevated>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[1.625rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl">
                        {activeExercise.exerciseName}
                      </h2>
                      {exerciseDetails ? (
                        <p className="mt-1 text-wt-body-sm text-wt-text-secondary-strong">
                          {capitalize(exerciseDetails.primaryMuscles.join(", "))}
                          {exerciseDetails.equipment.length > 0
                            ? ` · ${formatEquipment(exerciseDetails.equipment)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {setConfirmation ? (
                      <Badge
                        className="wt-pop-in shrink-0"
                        icon={<CircleCheck />}
                        role="status"
                        tone="success"
                      >
                        {setConfirmation}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-lg font-bold wt-tabular">
                      Série {setNumber} de {prescription.sets}
                    </p>
                    <ol aria-hidden="true" className="flex gap-1.5">
                      {Array.from({ length: prescription.sets }, (_, index) => (
                        <li
                          className={`h-2 w-6 rounded-wt-full ${
                            index < activeExercise.completedSets
                              ? "bg-wt-success"
                              : index === activeExercise.completedSets
                                ? "bg-wt-accent-hover"
                                : "bg-wt-border"
                          }`}
                          key={index}
                        />
                      ))}
                    </ol>
                  </div>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong wt-tabular">
                    Meta: {repsTarget} repetições
                    {prescription.rirTarget !== null ? ` · RIR ${prescription.rirTarget}` : ""} ·
                    descanso {prescription.restSeconds}s
                  </p>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleCompleteSet();
                  }}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberStepper
                      decimals={1}
                      label="Carga"
                      size="large"
                      step={2.5}
                      unit="kg"
                      value={loadKg}
                      onValueChange={setLoadKg}
                    />
                    <NumberStepper
                      label="Repetições"
                      min={1}
                      size="large"
                      step={1}
                      value={reps}
                      onValueChange={setReps}
                    />
                  </div>
                  <NumberStepper
                    className="sm:max-w-[calc(50%-0.5rem)]"
                    hint="Repetições que ainda sobravam no final da série."
                    label="RIR"
                    max={10}
                    step={1}
                    value={rir}
                    onValueChange={setRir}
                  />

                  {lastResult ? (
                    <div className="flex items-center justify-between gap-3 rounded-wt-lg bg-wt-surface-elevated px-4 py-2.5">
                      <p className="flex min-w-0 items-center gap-2 text-wt-body-sm text-wt-text-secondary-strong">
                        <History aria-hidden="true" className="size-4 shrink-0" />
                        <span className="truncate">
                          Última vez:{" "}
                          <strong className="font-semibold text-wt-text-primary wt-tabular">
                            {formatKg(lastResult.loadKg)} × {lastResult.reps}
                          </strong>
                          {lastResult.rir !== null ? ` · RIR ${lastResult.rir}` : ""}
                        </span>
                      </p>
                      {canRepeatLast ? (
                        <Button
                          className="shrink-0"
                          variant="ghost"
                          onClick={() => {
                            setLoadKg(String(lastResult.loadKg));
                            setReps(String(lastResult.reps));
                          }}
                        >
                          Repetir
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <Disclosure icon={<MessageSquarePlus />} summary="Adicionar observação">
                    <div className="grid gap-4">
                      <Input
                        label="Observação"
                        maxLength={500}
                        value={setNotes}
                        onChange={(event) => setSetNotes(event.target.value)}
                      />
                      <Textarea
                        id="set-feedback"
                        label="Feedback da série"
                        maxLength={500}
                        placeholder="Ex.: senti o ombro na descida"
                        value={setFeedbackText}
                        onChange={(event) => setSetFeedbackText(event.target.value)}
                      />
                    </div>
                  </Disclosure>

                  {/*
                    CTA fixo acima da navegação inferior no celular: sempre ao
                    alcance do polegar, sem cobrir o conteúdo quando parado.
                  */}
                  <div className="sticky bottom-[calc(var(--wt-mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-[var(--wt-z-sticky)] -mx-1 rounded-wt-lg bg-wt-surface/95 p-1 backdrop-blur-sm lg:static lg:bg-transparent lg:p-0">
                    <Button
                      className="w-full"
                      loading={actionLoading}
                      loadingLabel="Salvando série"
                      size="xl"
                      type="submit"
                    >
                      Concluir série
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-2 border-t border-wt-border pt-4">
                  <Button
                    disabled={actionLoading || !swapReplacement}
                    variant="ghost"
                    onClick={() => void handleSwap()}
                  >
                    <Repeat2 aria-hidden="true" className="size-4" />
                    {swapReplacement ? `Trocar por ${swapReplacement.label}` : "Trocar exercício"}
                  </Button>
                </div>
              </Card>
            ) : null}

            {activeExercise && exerciseDetails ? (
              <Disclosure icon={<BookOpen />} summary="Como executar">
                <div className="space-y-4">
                  <ExerciseMedia exercise={exerciseDetails} />
                  <dl className="m-0 grid gap-3 text-wt-body-sm">
                    {[
                      ["Passo a passo", exerciseDetails.instructions],
                      ["Preparação", exerciseDetails.setup],
                      ["Execução", exerciseDetails.execution],
                      ["Respiração", exerciseDetails.breathing],
                      ["Evite", exerciseDetails.mistakes],
                      ["Segurança", exerciseDetails.safetyNotes],
                    ].map(([term, description]) => (
                      <div key={term}>
                        <dt className="font-semibold text-wt-text-primary">{term}</dt>
                        <dd className="m-0 text-wt-text-secondary-strong">{description}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Disclosure>
            ) : null}
          </div>

          <aside aria-label="Sequência do treino" className="hidden lg:sticky lg:top-6 lg:block">
            <Card as="div" className="p-2">
              <p className="px-3 pb-1 pt-2 text-wt-label font-semibold text-wt-text-secondary-strong">
                Sequência
              </p>
              <ExerciseQueue
                activeIndex={activeExercise ? session.currentExerciseIndex : null}
                queue={session.exerciseQueue}
              />
            </Card>
          </aside>
        </div>
      )}

      <Sheet open={showQueue} title="Sequência do treino" onOpenChange={setShowQueue}>
        <ExerciseQueue
          activeIndex={activeExercise ? session.currentExerciseIndex : null}
          queue={session.exerciseQueue}
        />
      </Sheet>

      <Sheet
        description="Busque pelo WillTreino ID. Você vê apenas nome e ID público antes de convidar."
        open={showPartnerInvite && !isFinished}
        title="Convidar parceiro"
        onOpenChange={setShowPartnerInvite}
      >
        <SendTrainingInvitePanel
          embedded
          workoutPlanId={session.planId}
          workoutPlanVersionId={session.planVersionId}
        />
      </Sheet>
    </main>
  );
}
