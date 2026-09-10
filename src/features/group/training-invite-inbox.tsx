"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { TrainingInvite } from "@/domain/group/training-invite";

import {
  respondToTrainingInviteRequest,
  subscribeToIncomingTrainingInvites,
  type TrainingInviteResponseAction,
} from "./training-invite-repository";

type TrainingInviteInboxProps = Readonly<{
  onAccepted?: (groupSessionId: string) => void;
  uid: string;
}>;

const actionLabels: Record<Extract<TrainingInviteResponseAction, "ACCEPT" | "DECLINE">, string> = {
  ACCEPT: "Aceitar",
  DECLINE: "Recusar",
};

export function TrainingInviteInbox({ onAccepted, uid }: TrainingInviteInboxProps) {
  const [invites, setInvites] = useState<TrainingInvite[]>([]);
  const [status, setStatus] = useState("Carregando convites...");
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
  const previousCount = useRef(0);

  useEffect(() => {
    if (!uid) {
      return;
    }

    const unsubscribe = subscribeToIncomingTrainingInvites(
      uid,
      (next) => {
        setInvites(next);
        if (next.length > previousCount.current) {
          setStatus("Você recebeu um novo convite de treino.");
        } else if (next.length === 0) {
          setStatus("Nenhum convite pendente.");
        } else {
          setStatus(`${next.length} convite(s) pendente(s).`);
        }
        previousCount.current = next.length;
      },
      {
        onError: () => setStatus("Não foi possível carregar seus convites agora."),
      },
    );

    return unsubscribe;
  }, [uid]);

  const heading = useMemo(
    () => (invites.length > 0 ? `Convites de treino (${invites.length})` : "Convites de treino"),
    [invites.length],
  );

  async function respond(inviteId: string, action: "ACCEPT" | "DECLINE") {
    setPendingInviteId(inviteId);
    try {
      const result = await respondToTrainingInviteRequest(inviteId, action);
      setInvites((current) => current.filter((invite) => invite.id !== inviteId));
      if (result.status === "ACCEPTED" && result.groupSessionId) {
        setStatus("Convite aceito. Sala de treino criada.");
        onAccepted?.(result.groupSessionId);
      } else {
        setStatus("Convite recusado.");
      }
    } catch {
      setStatus("Não foi possível responder ao convite. Tente novamente.");
    } finally {
      setPendingInviteId(null);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="wt-text-title">{heading}</h2>
        <p className="wt-text-body text-wt-text-secondary">
          Parceiros só veem seu nome público e status durante o treino.
        </p>
      </div>

      {invites.length === 0 ? (
        <p className="wt-text-body text-wt-text-secondary">Nenhum convite pendente.</p>
      ) : (
        <ul className="space-y-3">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="space-y-3 rounded-wt-md border border-wt-border bg-wt-surface p-4"
            >
              <div className="space-y-1">
                <p className="wt-text-body">
                  <strong>{invite.senderDisplayName}</strong> convidou você para treinar.
                </p>
                <p className="wt-text-caption text-wt-text-secondary">
                  WillTreino ID {invite.senderPublicUserId}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {(["ACCEPT", "DECLINE"] as const).map((action) => (
                  <Button
                    key={action}
                    loading={pendingInviteId === invite.id}
                    variant={action === "ACCEPT" ? "primary" : "outline"}
                    onClick={() => void respond(invite.id, action)}
                  >
                    {actionLabels[action]}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <LiveRegion politeness="assertive">{status}</LiveRegion>
    </Card>
  );
}
