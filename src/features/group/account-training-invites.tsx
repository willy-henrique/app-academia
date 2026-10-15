"use client";

import { useRouter } from "next/navigation";

import { SectionHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { TrainingInviteInbox } from "./training-invite-inbox";

export function AccountTrainingInvites() {
  const router = useRouter();
  const { mode, user } = useAuthSession();

  // O modo local não possui Firestore nem Functions. Não iniciar a assinatura
  // nessa condição evita uma exceção de configuração e explica claramente o
  // que será liberado quando a pessoa conectar o Firebase.
  if (mode === "local") {
    return (
      <section aria-labelledby="local-training-title" className="space-y-3" id="convites">
        <SectionHeader
          description="Convites e salas em dupla usam a conta Firebase para sincronizar os dois participantes."
          id="local-training-title"
          title="Treinar com alguém"
        />
        <Card className="p-5 text-wt-body-sm text-wt-text-secondary-strong">
          Convites de treino ficam disponíveis quando o Firebase estiver conectado.
        </Card>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <TrainingInviteInbox
      uid={user.uid}
      onAccepted={(groupSessionId) => router.push(`/group/${groupSessionId}`)}
    />
  );
}
