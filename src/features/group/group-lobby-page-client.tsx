"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function getParticipantOperationalLabel(
  participant: GroupParticipant,
  sessionStatus: string | undefined,
): string {
  if (participant.status === "COMPLETED") return "Concluiu o treino";
  if (participant.status === "LEFT") return "Saiu do treino";
  if (sessionStatus !== "ACTIVE") {
    return participant.status === "READY" ? "Pronto" : "Aguardando";
  }

  if (participant.operationalState === "PERFORMING_SET") return "Executando";
  if (participant.operationalState === "RESTING") return "Descansando";
  if (participant.operationalState === "PAUSED") return "Em pausa";
  return "Aguardando a vez";
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

type GroupLobbyPageClientProps = Readonly<{
  sessionId: string;
}>;

export function GroupLobbyPageClient({ sessionId }: GroupLobbyPageClientProps) {
  const { status: authStatus, user } = useAuthSession();
  const [lobby, setLobby] = useState<GroupLobbySnapshot | null>(null);
  const [status, setStatus] = useState("Carregando lobby...");
  const [saving, setSaving] = useState(false);
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
        onError: () => setStatus("Não foi possível sincronizar o lobby agora."),
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
          setStatus(`${syncedCount} evento(s) locais sincronizado(s).`);
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

  return (
    <main className="wt-page wt-page-grid max-w-5xl" id="main-content">
      <div className="w-full space-y-4">
        <Card elevated className="space-y-3 p-5 sm:p-7">
          <p className="wt-kicker">Treino acompanhado</p>
          <h1 className="wt-section-title">Preparem o treino</h1>
          <p className="wt-text-body text-wt-text-secondary">
            {readyCount} de {lobby?.participants.length ?? 0} pessoas prontas · estimativa prévia{" "}
            {formatDuration(duration)}
          </p>
          <p className="wt-text-caption text-wt-text-secondary">
            Conexão:{" "}
            {connectionState === "RECONNECTING"
              ? "reconectando"
              : connectionState === "BACKGROUND"
                ? "em segundo plano"
                : connectionState === "OFFLINE"
                  ? "offline"
                  : "online"}
            {pendingSyncCount > 0
              ? ` · ${pendingSyncCount} série(s) guardada(s) neste aparelho`
              : ""}
          </p>
          <LiveRegion politeness="assertive">{status}</LiveRegion>
        </Card>

        <Card className="space-y-4 p-5 sm:p-7">
          <h2 className="text-xl font-extrabold tracking-[-0.03em]">Participantes</h2>
          <ul className="space-y-3">
            {lobby?.participants.map((participant) => (
              <li
                key={participant.uid}
                className="flex items-center justify-between gap-3 rounded-wt-md border border-wt-border bg-wt-surface p-4"
              >
                <div>
                  <p className="wt-text-body font-medium">
                    {participant.displaySnapshot.displayName}
                  </p>
                  <p className="wt-text-caption text-wt-text-secondary">
                    {participant.role === "HOST" ? "Host" : "Participante"} ·{" "}
                    {getParticipantOperationalLabel(participant, lobby?.session.status)}
                  </p>
                </div>
                <span aria-hidden="true">
                  {participant.operationalState === "PERFORMING_SET" ? "●" : "✓"}
                </span>
              </li>
            ))}
          </ul>
          {lobby?.session.status === "LOBBY" &&
          ownParticipant &&
          ["INVITED", "READY"].includes(ownParticipant.status) ? (
            <Button loading={saving} onClick={() => void updateReady()}>
              {ownParticipant.status === "READY" ? "Ainda não estou pronto" : "Estou pronto"}
            </Button>
          ) : null}
        </Card>

        {isHost && lobby?.session.status === "LOBBY" ? (
          <Card className="space-y-4 p-5 sm:p-7">
            <div>
              <h2 className="text-xl font-semibold">Configuração compartilhada</h2>
              <p className="wt-text-body text-wt-text-secondary">
                Essas opções só ajustam logística e tempo; cargas e adaptações continuam
                individuais.
              </p>
            </div>
            <label className="grid gap-2 text-wt-label" htmlFor="shared-equipment-mode">
              Vocês compartilham aparelhos?
              <select
                id="shared-equipment-mode"
                className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 text-wt-body"
                value={sharedEquipmentMode}
                onChange={(event) =>
                  setSharedEquipmentMode(
                    event.target.value as GroupLobbyConfiguration["sharedEquipmentMode"],
                  )
                }
              >
                <option value="FULL">Sim</option>
                <option value="PARTIAL">Parcialmente</option>
                <option value="NONE">Não</option>
              </select>
            </label>
            <label className="grid gap-2 text-wt-label" htmlFor="station-mode">
              Modo de estação
              <select
                id="station-mode"
                className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 text-wt-body"
                value={stationMode}
                onChange={(event) =>
                  setStationMode(event.target.value as GroupLobbyConfiguration["stationMode"])
                }
              >
                <option value="ROTATION_SHARED_STATION">Revezamento no mesmo aparelho</option>
                <option value="PARALLEL_SAME_EXERCISE">Mesmo exercício em paralelo</option>
                <option value="INDEPENDENT_STATIONS">Estações independentes</option>
              </select>
            </label>
            <label className="grid gap-2 text-wt-label" htmlFor="weight-change-mode">
              Troca de carga
              <select
                id="weight-change-mode"
                className="min-h-11 rounded-wt-md border border-wt-border bg-wt-surface px-3 text-wt-body"
                value={weightChangeMode}
                onChange={(event) =>
                  setWeightChangeMode(
                    event.target.value as GroupLobbyConfiguration["weightChangeMode"],
                  )
                }
              >
                <option value="FAST">Rápida · ~10 s</option>
                <option value="NORMAL">Normal · ~20 s</option>
                <option value="SLOW">Demorada · ~35 s</option>
                <option value="CUSTOM">Personalizada</option>
              </select>
            </label>
            {weightChangeMode === "CUSTOM" ? (
              <Input
                label="Segundos para trocar a carga"
                inputMode="numeric"
                min={1}
                max={120}
                type="number"
                value={customWeightChangeSeconds}
                onChange={(event) => setCustomWeightChangeSeconds(event.target.value)}
              />
            ) : null}
            <Button loading={saving} onClick={() => void saveConfiguration()}>
              Salvar configuração
            </Button>
          </Card>
        ) : null}

        {lobby?.session.status === "COUNTDOWN" || lobby?.session.status === "LOBBY" ? (
          <Card className="p-5 sm:p-7">
            {lobby?.session.status === "COUNTDOWN" && countdownSeconds !== null ? (
              <div className="space-y-2" aria-live="assertive">
                <h2 className="text-xl font-semibold">
                  {countdownSeconds > 0 ? countdownSeconds : "VAMOS!"}
                </h2>
                <p className="wt-text-body text-wt-text-secondary">
                  Todos os dispositivos usam o mesmo horário de início.
                </p>
              </div>
            ) : isHost ? (
              <div className="space-y-3">
                <p className="wt-text-body text-wt-text-secondary">
                  {everyoneReady
                    ? "Todos estão prontos. Inicie a contagem sincronizada."
                    : "O início sincronizado será liberado quando todos estiverem prontos."}
                </p>
                <Button
                  disabled={!everyoneReady}
                  loading={saving}
                  onClick={() => void startSession()}
                >
                  Começar treino
                </Button>
              </div>
            ) : (
              <p className="wt-text-body text-wt-text-secondary">
                Aguarde o host iniciar quando todos estiverem prontos. Nenhum dado de saúde,
                acessibilidade ou carga individual é exibido no lobby.
              </p>
            )}
          </Card>
        ) : null}

        {lobby?.session.status === "ACTIVE" &&
        ownParticipant &&
        ["ACTIVE", "PAUSED"].includes(ownParticipant.status) ? (
          <Card className="space-y-3 p-5 sm:p-7">
            <div>
              <h2 className="text-xl font-semibold">Status do treino</h2>
              <p className="wt-text-body text-wt-text-secondary">
                Compartilhe somente seu estado operacional. Carga, repetições, RIR e dados pessoais
                continuam privados.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={saving}
                variant="secondary"
                onClick={() => void updateOperationalState("PERFORMING_SET")}
              >
                Estou executando
              </Button>
              <Button
                disabled={saving}
                variant="secondary"
                onClick={() => void updateOperationalState("RESTING")}
              >
                Estou descansando
              </Button>
              <Button
                disabled={saving}
                variant="secondary"
                onClick={() => void updateOperationalState("WAITING_TURN")}
              >
                Aguardando minha vez
              </Button>
              <Button disabled={saving} onClick={() => void completeParticipation()}>
                Concluir meu treino
              </Button>
              <Button disabled={saving} variant="danger" onClick={() => void leaveSession()}>
                Sair deste treino
              </Button>
            </div>
          </Card>
        ) : ownParticipant?.status === "COMPLETED" ? (
          <Card className="space-y-2 p-5">
            <h2 className="text-xl font-semibold">Você concluiu este treino</h2>
            <p className="wt-text-body text-wt-text-secondary">
              Suas séries continuam registradas na sua conta. Quem ainda está treinando segue sem
              interrupção.
            </p>
          </Card>
        ) : lobby?.session.status === "ACTIVE" && ownParticipant?.status === "LEFT" ? (
          <Card className="space-y-2 p-5">
            <h2 className="text-xl font-semibold">Você saiu deste treino</h2>
            <p className="wt-text-body text-wt-text-secondary">
              Sua participação foi encerrada sem apagar o treino do grupo.
            </p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
