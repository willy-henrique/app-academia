"use client";

import { Mail } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
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
          setStatus(`${next.length} ${next.length === 1 ? "convite pendente" : "convites pendentes"}.`);
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
    <section aria-labelledby="training-invites-title" className="space-y-3" id="convites">
      <SectionHeader
        description="Parceiros só veem seu nome público e seu status durante o treino."
        id="training-invites-title"
        title={heading}
      />

      {invites.length === 0 ? (
        <EmptyState
          description="Quando alguém convidar você pelo seu WillTreino ID, o convite aparece aqui."
          icon={<Mail />}
          title="Nenhum convite pendente."
        />
      ) : (
        <Card as="div" className="p-2">
          <ul className="divide-y divide-wt-border">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={invite.senderDisplayName} />
                  <div className="min-w-0">
                    <p className="text-wt-body-sm">
                      <strong className="font-semibold">{invite.senderDisplayName}</strong> convidou
                      você para treinar.
                    </p>
                    <p className="font-mono text-xs text-wt-text-secondary-strong">
                      WillTreino ID {invite.senderPublicUserId}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(["ACCEPT", "DECLINE"] as const).map((action) => (
                    <Button
                      className="flex-1 sm:flex-none"
                      key={action}
                      loading={pendingInviteId === invite.id}
                      variant={action === "ACCEPT" ? "primary" : "secondary"}
                      onClick={() => void respond(invite.id, action)}
                    >
                      {actionLabels[action]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <LiveRegion politeness="assertive">{status}</LiveRegion>
    </section>
  );
}
