"use client";

import {
  CircleCheck,
  Clock3,
  CloudOff,
  Crown,
  Dumbbell,
  Hourglass,
  LogOut,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  Timer,
  Wifi,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/states";
import {
  estimateGroupLobbyDurationSeconds,
  resolveEquipmentTransitionSeconds,
  type GroupParticipant,
  type GroupLobbyConfiguration,
} from "@/domain/group/group-session";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import {
  activateGroupSessionRequest,
  completeGroupParticipationRequest,
  saveGroupLobbyConfiguration,
  leaveGroupSessionRequest,
  setGroupParticipantOperationalState,
  setGroupLobbyReady,
  startGroupSessionRequest,
  subscribeToGroupLobby,
  type GroupLobbySnapshot,
} from "./group-lobby-repository";
import {
  flushPendingGroupParticipantSetSyncs,
  getPendingGroupParticipantSetSyncCount,
  subscribeToGroupConnectionState,
  type GroupConnectionState,
} from "./group-offline-sync";

type ParticipantStatus = Readonly<{ icon: typeof CircleCheck; label: string; tone: BadgeTone }>;

/**
 * Só o estado operacional é mostrado para os outros: pronto, executando,
 * descansando… Carga, repetições e dados pessoais nunca aparecem aqui.
 */
function getParticipantStatus(
  participant: GroupParticipant,
  sessionStatus: string | undefined,
): ParticipantStatus {
  if (participant.status === "COMPLETED") {
    return { icon: CircleCheck, label: "Concluiu o treino", tone: "success" };
  }
  if (participant.status === "LEFT")
    return { icon: LogOut, label: "Saiu do treino", tone: "neutral" };
  if (sessionStatus !== "ACTIVE") {
    return participant.status === "READY"
      ? { icon: CircleCheck, label: "Pronto", tone: "success" }
      : { icon: Hourglass, label: "Aguardando", tone: "neutral" };
  }

  if (participant.operationalState === "PERFORMING_SET") {
    return { icon: Dumbbell, label: "Executando", tone: "accent" };
  }
  if (participant.operationalState === "RESTING") {
    return { icon: Timer, label: "Descansando", tone: "warning" };
  }
  if (participant.operationalState === "PAUSED") {
    return { icon: PauseCircle, label: "Em pausa", tone: "neutral" };
  }
  return { icon: Hourglass, label: "Aguardando a vez", tone: "neutral" };
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${minutes.toString().padStart(2, "0")}` : `${minutes} min`;
}

function getWeightChangeSeconds(
  mode: GroupLobbyConfiguration["weightChangeMode"],
  customSeconds: string,
): number {
  if (mode === "FAST") return 10;
  if (mode === "NORMAL") return 20;
  if (mode === "SLOW") return 35;
  return Number.parseInt(customSeconds, 10) || 30;
}

const connectionLabels: Record<GroupConnectionState, string> = {
  BACKGROUND: "Em segundo plano",
  OFFLINE: "Offline",
  ONLINE: "Online",
  RECONNECTING: "Reconectando",
};

const operationalActions = [
  { label: "Estou executando", state: "PERFORMING_SET" },
  { label: "Estou descansando", state: "RESTING" },
  { label: "Aguardando minha vez", state: "WAITING_TURN" },
] as const;

type GroupLobbyPageClientProps = Readonly<{
  sessionId: string;
}>;

export function GroupLobbyPageClient({ sessionId }: GroupLobbyPageClientProps) {
  const { status: authStatus, user } = useAuthSession();
  const [lobby, setLobby] = useState<GroupLobbySnapshot | null>(null);
  const [lobbyResolved, setLobbyResolved] = useState(false);
  const [status, setStatus] = useState("Carregando lobby...");
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [sharedEquipmentMode, setSharedEquipmentMode] =
    useState<GroupLobbyConfiguration["sharedEquipmentMode"]>("FULL");
  const [stationMode, setStationMode] =
    useState<GroupLobbyConfiguration["stationMode"]>("ROTATION_SHARED_STATION");
  const [weightChangeMode, setWeightChangeMode] =
    useState<GroupLobbyConfiguration["weightChangeMode"]>("NORMAL");
  const [customWeightChangeSeconds, setCustomWeightChangeSeconds] = useState("30");
  const [now, setNow] = useState(() => new Date());
  const [connectionState, setConnectionState] = useState<GroupConnectionState>("ONLINE");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const activationRequestedFor = useRef<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    return subscribeToGroupLobby(
      sessionId,
      (next) => {
        setLobby(next);
        setLobbyResolved(true);
        if (!next) {
          setStatus("Lobby não encontrado ou indisponível.");
          return;
        }

        setSharedEquipmentMode(
          next.session.sharedEquipmentMode === "UNSET" ? "FULL" : next.session.sharedEquipmentMode,
        );
        setStationMode(next.session.stationMode);
        setWeightChangeMode(
          next.session.weightChangeMode === "UNSET" ? "NORMAL" : next.session.weightChangeMode,
        );
        setCustomWeightChangeSeconds(String(next.session.weightChangeSeconds ?? 30));
        setStatus("Lobby sincronizado.");
      },
      {
        onError: () => {
          setLobbyResolved(true);
          setStatus("Não foi possível sincronizar o lobby agora.");
        },
      },
    );
  }, [sessionId, user]);

  useEffect(() => {
    return subscribeToGroupConnectionState((nextState) => {
      setConnectionState(nextState);
      setPendingSyncCount(getPendingGroupParticipantSetSyncCount());
    });
  }, []);

  useEffect(() => {
    if (connectionState !== "RECONNECTING") {
      return;
    }

    let active = true;

    void flushPendingGroupParticipantSetSyncs()
      .then(({ pendingCount, syncedCount }) => {
        if (!active) {
          return;
        }

        setConnectionState(window.navigator.onLine ? "ONLINE" : "OFFLINE");
        setPendingSyncCount(pendingCount);
        if (syncedCount > 0) {
          setStatus(
            `${syncedCount} ${syncedCount === 1 ? "evento local sincronizado" : "eventos locais sincronizados"}.`,
          );
        }
      })
      .catch(() => {
        if (active) {
          setConnectionState("OFFLINE");
          setPendingSyncCount(getPendingGroupParticipantSetSyncCount());
          setStatus("A reconexão falhou. Seus eventos locais continuam guardados.");
        }
      });

    return () => {
      active = false;
    };
  }, [connectionState]);

  useEffect(() => {
    const session = lobby?.session;
    if (!session || session.status !== "COUNTDOWN" || !session.startAt) {
      return;
    }
    if (new Date(session.startAt).getTime() > now.getTime()) {
      activationRequestedFor.current = null;
      return;
    }
    if (activationRequestedFor.current === sessionId) {
      return;
    }

    activationRequestedFor.current = sessionId;
    void activateGroupSessionRequest(sessionId)
      .then(() => setStatus("Treino iniciado e sincronizado."))
      .catch(() => {
        activationRequestedFor.current = null;
        setStatus("Aguardando a confirmação segura do início do treino.");
      });
  }, [lobby?.session, now, sessionId]);

  const isHost = Boolean(user && lobby?.session.hostUid === user.uid);
  const ownParticipant =
    lobby?.participants.find((participant) => participant.uid === user?.uid) ?? null;
  const readyCount =
    lobby?.participants.filter((participant) => participant.status === "READY").length ?? 0;
  const configuration: GroupLobbyConfiguration = {
    sharedEquipmentMode,
    stationMode,
    weightChangeMode,
    ...(weightChangeMode === "CUSTOM"
      ? { weightChangeSeconds: getWeightChangeSeconds(weightChangeMode, customWeightChangeSeconds) }
      : {}),
  };
  const duration = useMemo(
    () =>
      estimateGroupLobbyDurationSeconds(
        lobby?.participants.length ?? 1,
        stationMode,
        getWeightChangeSeconds(weightChangeMode, customWeightChangeSeconds),
        45 * 60,
        resolveEquipmentTransitionSeconds(sharedEquipmentMode, stationMode),
      ),
    [
      customWeightChangeSeconds,
      lobby?.participants.length,
      sharedEquipmentMode,
      stationMode,
      weightChangeMode,
    ],
  );
  const countdownSeconds = lobby?.session.startAt
    ? Math.max(0, Math.ceil((new Date(lobby.session.startAt).getTime() - now.getTime()) / 1000))
    : null;
  const everyoneReady = Boolean(
    lobby &&
    lobby.participants.length >= 2 &&
    lobby.participants.every((participant) => participant.status === "READY"),
  );

  async function updateReady() {
    if (
      !user ||
      !ownParticipant ||
      lobby?.session.status !== "LOBBY" ||
      !["INVITED", "READY"].includes(ownParticipant.status)
    ) {
      return;
    }
    setSaving(true);
    try {
      const nextReady = ownParticipant.status !== "READY";
      await setGroupLobbyReady(sessionId, user.uid, nextReady);
      setStatus(nextReady ? "Você está pronto para o treino." : "Você ainda não está pronto.");
    } catch {
      setStatus("Não foi possível atualizar seu status agora.");
    } finally {
      setSaving(false);
    }
  }

  async function saveConfiguration() {
    if (!isHost) return;
    if (weightChangeMode === "CUSTOM" && !Number.parseInt(customWeightChangeSeconds, 10)) {
      setStatus("Informe os segundos para a troca de carga personalizada.");
      return;
    }
    setSaving(true);
    try {
      await saveGroupLobbyConfiguration(sessionId, configuration);
      setStatus("Configuração do lobby salva.");
    } catch {
      setStatus("Não foi possível salvar a configuração do lobby.");
    } finally {
      setSaving(false);
    }
  }

  async function startSession() {
    if (!isHost || !everyoneReady) return;
    setSaving(true);
    try {
      const result = await startGroupSessionRequest(sessionId);
      setStatus(
        `Início sincronizado confirmado para ${new Date(result.startAt).toLocaleTimeString("pt-BR")}.`,
      );
    } catch {
      setStatus("Não foi possível iniciar. Confirme se todos continuam prontos.");
    } finally {
      setSaving(false);
    }
  }

  async function completeParticipation() {
    if (!user || !ownParticipant || ownParticipant.status !== "ACTIVE") {
      return;
    }

    setSaving(true);
    try {
      const result = await completeGroupParticipationRequest(sessionId);
      setStatus(
        result.sessionStatus === "COMPLETED"
          ? "Treino concluído. O grupo encerrou a sessão."
          : "Treino concluído. Seu histórico foi preservado e o grupo continua.",
      );
    } catch {
      setStatus("Não foi possível concluir seu treino agora.");
    } finally {
      setSaving(false);
    }
  }

  async function leaveSession() {
    if (!user || !ownParticipant || ownParticipant.status === "LEFT") {
      return;
    }

    setSaving(true);
    try {
      await leaveGroupSessionRequest(sessionId);
      setConfirmLeave(false);
      setStatus("Você saiu deste treino.");
    } catch {
      setStatus("Não foi possível sair da sessão agora.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOperationalState(state: "WAITING_TURN" | "PERFORMING_SET" | "RESTING") {
    setSaving(true);
    try {
      await setGroupParticipantOperationalState(sessionId, state);
      setStatus("Seu status operacional foi sincronizado.");
    } catch {
      setStatus("Não foi possível atualizar seu status operacional agora.");
    } finally {
      setSaving(false);
    }
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  const sessionStatus = lobby?.session.status;
  const participantCount = lobby?.participants.length ?? 0;
  const title =
    sessionStatus === "ACTIVE"
      ? "Treinando juntos"
      : sessionStatus === "COUNTDOWN"
        ? "Prontos para começar"
        : sessionStatus === "COMPLETED"
          ? "Treino encerrado"
          : "Sala de treino";
  const connectionText = `${connectionLabels[connectionState]}${
    pendingSyncCount > 0
      ? ` · ${pendingSyncCount} ${pendingSyncCount === 1 ? "série guardada" : "séries guardadas"} neste aparelho`
      : ""
  }`;
  const connectionTone: BadgeTone =
    connectionState === "ONLINE" ? "success" : connectionState === "OFFLINE" ? "warning" : "info";
  const canLeave =
    sessionStatus === "ACTIVE" &&
    ownParticipant !== null &&
    ["ACTIVE", "PAUSED"].includes(ownParticipant.status);

  return (
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        actions={
          <Badge
            icon={
              connectionState === "ONLINE" ? (
                <Wifi />
              ) : connectionState === "RECONNECTING" ? (
                <RefreshCw />
              ) : (
                <CloudOff />
              )
            }
            tone={connectionTone}
          >
            {connectionText}
          </Badge>
        }
        description={
          lobby
            ? `${readyCount} de ${participantCount} ${participantCount === 1 ? "pessoa pronta" : "pessoas prontas"} · estimativa ${formatDuration(duration)}`
            : undefined
        }
        eyebrow="Treino acompanhado"
        title={title}
      />

      <LiveRegion politeness="assertive">{status}</LiveRegion>

      {!lobbyResolved ? (
        <LoadingState label="Entrando na sala de treino…" lines={3} variant="list" />
      ) : !lobby ? (
        <Card className="space-y-2 p-5">
          <h2 className="wt-text-h2">Sala indisponível</h2>
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            O convite pode ter expirado ou a sala já foi encerrada. Peça um novo convite para quem
            vai treinar com você.
          </p>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
          <div className="space-y-6">
            {sessionStatus === "COUNTDOWN" && countdownSeconds !== null ? (
              <Card as="div" className="p-8 text-center" elevated>
                <div aria-live="assertive" className="space-y-2">
                  <p className="wt-kicker justify-center">Começando em</p>
                  <h2 className="text-[4.5rem] font-extrabold leading-none tracking-[-0.04em] text-wt-accent-text wt-tabular">
                    {countdownSeconds > 0 ? countdownSeconds : "VAMOS!"}
                  </h2>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    Todos os dispositivos usam o mesmo horário de início.
                  </p>
                </div>
              </Card>
            ) : null}

            {sessionStatus === "LOBBY" &&
            ownParticipant &&
            ["INVITED", "READY"].includes(ownParticipant.status) ? (
              <Card as="div" className="space-y-4 p-5" elevated>
                <div className="space-y-1">
                  <h2 className="wt-text-h2">
                    {ownParticipant.status === "READY" ? "Você está pronto" : "Tudo certo por aí?"}
                  </h2>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    {ownParticipant.status === "READY"
                      ? isHost
                        ? everyoneReady
                          ? "Todos prontos. Você já pode começar."
                          : "Aguardando os outros confirmarem."
                        : "Aguarde o anfitrião iniciar quando todos estiverem prontos."
                      : "Confirme quando estiver no aparelho e pronto para começar."}
                  </p>
                </div>
                <div className="grid gap-2 sm:flex">
                  <Button
                    loading={saving}
                    size="xl"
                    variant={ownParticipant.status === "READY" ? "secondary" : "primary"}
                    onClick={() => void updateReady()}
                  >
                    {ownParticipant.status === "READY" ? "Ainda não estou pronto" : "Estou pronto"}
                  </Button>
                  {isHost ? (
                    <Button
                      disabled={!everyoneReady}
                      loading={saving}
                      size="xl"
                      variant={everyoneReady ? "primary" : "secondary"}
                      onClick={() => void startSession()}
                    >
                      Começar treino
                    </Button>
                  ) : null}
                </div>
                {isHost && !everyoneReady ? (
                  <p className="wt-text-caption text-wt-text-secondary-strong">
                    O início sincronizado é liberado quando todos estiverem prontos.
                  </p>
                ) : null}
              </Card>
            ) : null}

            {canLeave && ownParticipant ? (
              <Card as="div" className="space-y-5 p-5" elevated>
                <div className="space-y-1">
                  <h2 className="wt-text-h2">Seu status</h2>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    O grupo vê só isto. Carga, repetições, RIR e dados pessoais continuam privados.
                  </p>
                </div>
                <div
                  aria-label="Seu status no treino"
                  className="grid gap-2 sm:grid-cols-3"
                  role="group"
                >
                  {operationalActions.map((action) => {
                    const current = ownParticipant.operationalState === action.state;
                    return (
                      <Button
                        aria-pressed={current}
                        className={
                          current
                            ? "border-wt-accent-border bg-wt-accent-subtle text-wt-accent-text"
                            : ""
                        }
                        disabled={saving}
                        key={action.state}
                        size="large"
                        variant="secondary"
                        onClick={() => void updateOperationalState(action.state)}
                      >
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2 border-t border-wt-border pt-5 sm:flex-row sm:justify-between">
                  <Button disabled={saving} size="xl" onClick={() => void completeParticipation()}>
                    Concluir meu treino
                  </Button>
                  <Dialog
                    description="Sua participação termina e suas séries continuam na sua conta. O treino do grupo segue para quem ficar."
                    open={confirmLeave}
                    title="Sair deste treino?"
                    trigger={
                      <Button disabled={saving} variant="ghost">
                        <LogOut aria-hidden="true" className="size-4" />
                        Sair deste treino
                      </Button>
                    }
                    onOpenChange={setConfirmLeave}
                  >
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
                        Continuar treinando
                      </Button>
                      <Button loading={saving} variant="danger" onClick={() => void leaveSession()}>
                        Sair do treino
                      </Button>
                    </div>
                  </Dialog>
                </div>
              </Card>
            ) : ownParticipant?.status === "COMPLETED" ? (
              <Card as="div" className="space-y-3 p-5" elevated>
                <span className="grid size-12 place-items-center rounded-wt-full bg-wt-success-subtle text-wt-success-text">
                  <CircleCheck aria-hidden="true" className="size-7" />
                </span>
                <h2 className="wt-text-h2">Você concluiu este treino</h2>
                <p className="text-wt-body-sm text-wt-text-secondary-strong">
                  Suas séries continuam registradas na sua conta. Quem ainda está treinando segue
                  sem interrupção.
                </p>
              </Card>
            ) : sessionStatus === "ACTIVE" && ownParticipant?.status === "LEFT" ? (
              <Card as="div" className="space-y-2 p-5">
                <h2 className="wt-text-h2">Você saiu deste treino</h2>
                <p className="text-wt-body-sm text-wt-text-secondary-strong">
                  Sua participação foi encerrada sem apagar o treino do grupo.
                </p>
              </Card>
            ) : null}

            {isHost && sessionStatus === "LOBBY" ? (
              <Card className="space-y-5 p-5">
                <div className="space-y-1">
                  <h2 className="wt-text-h2">Como vocês vão treinar</h2>
                  <p className="text-wt-body-sm text-wt-text-secondary-strong">
                    Só ajusta logística e tempo; cargas e adaptações continuam individuais.
                  </p>
                </div>
                <Select
                  id="shared-equipment-mode"
                  label="Vocês compartilham aparelhos?"
                  options={[
                    { label: "Sim", value: "FULL" },
                    { label: "Parcialmente", value: "PARTIAL" },
                    { label: "Não", value: "NONE" },
                  ]}
                  value={sharedEquipmentMode}
                  onChange={(event) =>
                    setSharedEquipmentMode(
                      event.target.value as GroupLobbyConfiguration["sharedEquipmentMode"],
                    )
                  }
                />
                <Select
                  id="station-mode"
                  label="Modo de estação"
                  options={[
                    { label: "Revezamento no mesmo aparelho", value: "ROTATION_SHARED_STATION" },
                    { label: "Mesmo exercício em paralelo", value: "PARALLEL_SAME_EXERCISE" },
                    { label: "Estações independentes", value: "INDEPENDENT_STATIONS" },
                  ]}
                  value={stationMode}
                  onChange={(event) =>
                    setStationMode(event.target.value as GroupLobbyConfiguration["stationMode"])
                  }
                />
                <Select
                  id="weight-change-mode"
                  label="Troca de carga"
                  options={[
                    { label: "Rápida · ~10 s", value: "FAST" },
                    { label: "Normal · ~20 s", value: "NORMAL" },
                    { label: "Demorada · ~35 s", value: "SLOW" },
                    { label: "Personalizada", value: "CUSTOM" },
                  ]}
                  value={weightChangeMode}
                  onChange={(event) =>
                    setWeightChangeMode(
                      event.target.value as GroupLobbyConfiguration["weightChangeMode"],
                    )
                  }
                />
                {weightChangeMode === "CUSTOM" ? (
                  <Input
                    inputMode="numeric"
                    label="Segundos para trocar a carga"
                    max={120}
                    min={1}
                    type="number"
                    unit="s"
                    value={customWeightChangeSeconds}
                    onChange={(event) => setCustomWeightChangeSeconds(event.target.value)}
                  />
                ) : null}
                <p className="flex items-center gap-2 text-wt-body-sm text-wt-text-secondary-strong">
                  <Clock3 aria-hidden="true" className="size-4" />
                  Estimativa com essa configuração: {formatDuration(duration)}
                </p>
                <Button
                  loading={saving}
                  variant="secondary"
                  onClick={() => void saveConfiguration()}
                >
                  Salvar configuração
                </Button>
              </Card>
            ) : null}
          </div>

          <section aria-labelledby="participants-title" className="space-y-3">
            <SectionHeader
              description={`${participantCount} ${participantCount === 1 ? "pessoa" : "pessoas"} nesta sala`}
              id="participants-title"
              title="Participantes"
            />
            <Card as="div" className="p-2">
              <ul className="divide-y divide-wt-border">
                {lobby.participants.map((participant) => {
                  const participantStatus = getParticipantStatus(participant, sessionStatus);
                  const StatusIcon = participantStatus.icon;
                  const isYou = participant.uid === user?.uid;

                  return (
                    <li className="flex items-center gap-3 px-3 py-3" key={participant.uid}>
                      <Avatar name={participant.displaySnapshot.displayName} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-wt-label font-semibold">
                          <span className="truncate">
                            {participant.displaySnapshot.displayName}
                          </span>
                          {isYou ? (
                            <span className="shrink-0 font-normal text-wt-text-secondary-strong">
                              (você)
                            </span>
                          ) : null}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-wt-text-secondary-strong">
                          {participant.role === "HOST" ? (
                            <>
                              <Crown aria-hidden="true" className="size-3.5" />
                              Anfitrião
                            </>
                          ) : (
                            "Participante"
                          )}
                        </p>
                      </div>
                      <Badge icon={<StatusIcon />} tone={participantStatus.tone}>
                        {participantStatus.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <p className="flex items-start gap-2 wt-text-caption text-wt-text-secondary-strong">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              Nenhum dado de saúde, acessibilidade ou carga individual é exibido para o grupo.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
