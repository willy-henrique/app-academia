"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const deletionConfirmation = "EXCLUIR";

/**
 * Direitos da pessoa titular (LGPD): baixar os próprios dados e apagar a conta.
 * A exclusão exige confirmação literal e é executada pelo servidor, que
 * preserva o treino de quem participou das mesmas sessões.
 */
export function AccountPrivacyPanel() {
  const { status: authStatus } = useAuthSession();
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("Seus dados pertencem a você.");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    try {
      const { functions } = getFirebaseClientServices();
      const callable = httpsCallable<Record<string, never>, unknown>(
        functions,
        "exportAccountData",
      );
      const result = await callable({});
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `willtreino-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("Exportação concluída. O arquivo foi baixado neste aparelho.");
    } catch {
      setStatus("Não foi possível exportar seus dados agora.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (confirmation !== deletionConfirmation) {
      setStatus(`Digite ${deletionConfirmation} para confirmar a exclusão.`);
      return;
    }

    setBusy(true);
    try {
      const { functions } = getFirebaseClientServices();
      const callable = httpsCallable<{ confirmation: string }, unknown>(
        functions,
        "deleteAccountData",
      );
      await callable({ confirmation });
      setStatus("Conta excluída. Seus dados pessoais foram removidos.");
    } catch {
      setStatus("Não foi possível excluir a conta agora.");
    } finally {
      setBusy(false);
    }
  }

  if (authStatus !== "authenticated") {
    return null;
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-xl font-semibold">Privacidade e seus dados</h2>
        <p className="wt-text-body text-wt-text-secondary">
          Baixe uma cópia dos seus dados ou apague sua conta. A exclusão remove seus dados pessoais
          e mantém o treino de quem participou das mesmas sessões.
        </p>
      </div>

      <Button disabled={busy} variant="secondary" onClick={() => void exportData()}>
        Baixar meus dados
      </Button>

      <div className="space-y-2 rounded-wt-md border border-wt-danger p-4">
        <p className="wt-text-body font-medium">Excluir minha conta</p>
        <p className="wt-text-caption text-wt-text-secondary">
          Esta ação é permanente. Digite {deletionConfirmation} para confirmar.
        </p>
        <Input
          id="delete-confirmation"
          label={`Confirmação (${deletionConfirmation})`}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        <Button
          disabled={busy || confirmation !== deletionConfirmation}
          variant="danger"
          onClick={() => void deleteAccount()}
        >
          Excluir conta definitivamente
        </Button>
      </div>

      <LiveRegion politeness="polite">{status}</LiveRegion>
    </Card>
  );
}
