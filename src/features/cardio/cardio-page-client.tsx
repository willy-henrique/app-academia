"use client";

import { useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

const historyLimit = 5;

function formatMinutes(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
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
  const [session, setSession] = useState<CardioSession | null>(null);
  const [history, setHistory] = useState<CardioSession[]>([]);
  const [status, setStatus] = useState("Nenhum cardio em andamento.");
  const [saving, setSaving] = useState(false);

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
          setStatus("Não foi possível carregar seu histórico de cardio agora.");
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [user]);

  async function persist(next: CardioSession, message: string) {
    setSaving(true);
    try {
      await saveCardioSession(next);
      setSession(next);
      setStatus(message);
    } catch {
      setStatus("Não foi possível salvar o cardio agora.");
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

    await persist(startCardioSession(created), "Cardio iniciado.");
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
        setStatus("Cardio concluído e somado à sua semana.");
      } catch {
        setStatus("Cardio concluído. A semana será atualizada assim que houver conexão.");
      }
      setHistory((current) => [completed, ...current].slice(0, historyLimit));
    } catch {
      setStatus("Não foi possível concluir o cardio agora.");
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
      await persist(
        skipped,
        "Cardio pulado com o motivo registrado. Seu treino de força continua concluído.",
      );
      setHistory((current) => [skipped, ...current].slice(0, historyLimit));
    } catch {
      setStatus("Informe o motivo para pular o cardio.");
    }
  }

  async function reschedule() {
    if (!session) {
      return;
    }

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const rescheduled = rescheduleCardioSession(session, tomorrow);
    await persist(rescheduled, "Cardio reagendado. Ele continua pendente, não concluído.");
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  const pending =
    session !== null && session.status !== "COMPLETED" && session.status !== "SKIPPED";

  return (
    <main className="wt-page wt-page-grid flex max-w-5xl flex-col gap-5" id="main-content">
      <Card elevated className="space-y-5 p-5 sm:p-7">
        <div>
          <p className="wt-kicker">Movimento complementar</p>
          <h1 className="wt-section-title mt-3">Cardio</h1>
          <p className="mt-3 wt-text-body text-wt-text-secondary">
            O cardio é independente: você pode fazer, pular com motivo ou reagendar sem afetar o
            treino de força.
          </p>
        </div>

        <div className="grid gap-3">
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

          <Select
            id="cardio-modality"
            label="Modalidade"
            onChange={(event) => setModality(event.target.value as CardioModality)}
            options={cardioModalityOptions.map((option) => ({
              label: modalityLabels[option],
              value: option,
            }))}
            value={modality}
          />

          <Input
            id="cardio-minutes"
            inputMode="numeric"
            label="Duração (minutos)"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!pending ? (
            <Button disabled={saving} onClick={() => void start()}>
              Iniciar cardio
            </Button>
          ) : (
            <>
              <Button disabled={saving} onClick={() => void finish()}>
                Concluir cardio
              </Button>
              <Button disabled={saving} variant="secondary" onClick={() => void reschedule()}>
                Reagendar para amanhã
              </Button>
            </>
          )}
        </div>

        {pending ? (
          <div className="space-y-2">
            <Input
              id="cardio-skip-reason"
              label="Motivo para pular"
              value={skipReason}
              onChange={(event) => setSkipReason(event.target.value)}
            />
            <Button disabled={saving} variant="secondary" onClick={() => void skip()}>
              Pular cardio
            </Button>
          </div>
        ) : null}

        <LiveRegion politeness="polite">{status}</LiveRegion>
      </Card>

      <Card className="space-y-3 p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Seus cardios recentes</h2>
        {history.length === 0 ? (
          <p className="wt-text-body text-wt-text-secondary">Nenhum cardio registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-wt-md border border-wt-border bg-wt-surface p-4"
              >
                <span className="wt-text-body font-medium">
                  {modalityLabels[item.prescription.modality]}
                </span>
                <span className="wt-text-caption text-wt-text-secondary">
                  {item.status === "COMPLETED"
                    ? formatMinutes(item.durationSeconds)
                    : item.status === "SKIPPED"
                      ? "Pulado"
                      : "Pendente"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
