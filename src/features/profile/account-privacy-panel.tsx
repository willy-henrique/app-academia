"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";

import { Download, TriangleAlert } from "lucide-react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { SectionHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
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
    <section aria-labelledby="privacy-title" className="space-y-3">
      <SectionHeader
        description="Baixe uma cópia dos seus dados ou apague sua conta (LGPD)."
        id="privacy-title"
        title="Privacidade e seus dados"
      />
      <Card className="space-y-5 p-5">
        <div className="space-y-3">
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            Dados de saúde, medidas e adaptações são privados por padrão e nunca aparecem para
            parceiros de treino.
          </p>
          <Button disabled={busy} variant="secondary" onClick={() => void exportData()}>
            <Download aria-hidden="true" className="size-4" />
            Baixar meus dados
          </Button>
        </div>

        <Disclosure
          className="border-wt-danger/40"
          icon={<TriangleAlert />}
          summary="Excluir minha conta"
        >
          <div className="space-y-3">
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Esta ação é permanente. Remove seus dados pessoais e mantém o treino de quem
              participou das mesmas sessões. Digite {deletionConfirmation} para confirmar.
            </p>
            <Input
              autoCapitalize="characters"
              autoComplete="off"
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
        </Disclosure>

        <LiveRegion politeness="polite" visible={status !== "Seus dados pertencem a você."}>
          {status}
        </LiveRegion>
      </Card>
    </section>
  );
}
