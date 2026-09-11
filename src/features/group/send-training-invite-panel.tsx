"use client";

import { CircleCheck, Search, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PublicProfilePreview } from "@/domain/identity/public-profile";
import { isPublicUserId, normalizePublicUserId } from "@/domain/identity/public-user-id";
import { resolvePublicUserId } from "@/features/identity/resolve-public-user-id";

import { TrainingInvitePreviewCard } from "./training-invite-preview-card";
import { sendTrainingInviteRequest } from "./training-invite-repository";

type SendTrainingInvitePanelProps = Readonly<{
  /** Dentro de um Sheet/Dialog que já tem título: sem cartão nem cabeçalho próprios. */
  embedded?: boolean;
  workoutPlanId: string;
  workoutPlanVersionId: string;
}>;

type PanelStep = "idle" | "resolving" | "previewing" | "sending" | "sent";

function formatWhileTyping(value: string): string {
  const normalized = normalizePublicUserId(value).slice(0, 10);
  if (normalized.length <= 2) {
    return normalized;
  }

  const rest = normalized.slice(2);
  return ["WT", rest.slice(0, 4), rest.slice(4, 8)].filter(Boolean).join("-");
}

export function SendTrainingInvitePanel({
  embedded = false,
  workoutPlanId,
  workoutPlanVersionId,
}: SendTrainingInvitePanelProps) {
  const inputId = useId();
  const [rawId, setRawId] = useState("");
  const [step, setStep] = useState<PanelStep>("idle");
  const [preview, setPreview] = useState<PublicProfilePreview | null>(null);
  const [message, setMessage] = useState("Digite o WillTreino ID do parceiro.");
  const [error, setError] = useState<string | null>(null);

  const candidate = formatWhileTyping(rawId);
  const canResolve = isPublicUserId(candidate);
  const busy = step === "resolving" || step === "sending";

  async function handleResolve() {
    setError(null);
    setStep("resolving");
    setMessage("Procurando parceiro...");

    try {
      const found = await resolvePublicUserId({ publicUserId: candidate });
      setPreview(found);
      setStep("previewing");
      setMessage(`Parceiro encontrado: ${found.displayName}.`);
    } catch {
      setPreview(null);
      setStep("idle");
      setError("Não encontramos esse WillTreino ID. Confira e tente de novo.");
      setMessage("Nenhum parceiro encontrado.");
    }
  }

  async function handleSend() {
    if (!preview) {
      return;
    }

    setError(null);
    setStep("sending");
    setMessage("Enviando convite...");

    try {
      await sendTrainingInviteRequest({
        receiverPublicUserId: preview.publicUserId,
        workoutPlanId,
        workoutPlanVersionId,
      });
      setStep("sent");
      setMessage(`Convite enviado para ${preview.displayName}.`);
    } catch {
      setStep("previewing");
      setError("Não foi possível enviar o convite agora. Tente novamente em instantes.");
      setMessage("Falha ao enviar o convite.");
    }
  }

  function handleReset() {
    setRawId("");
    setPreview(null);
    setStep("idle");
    setError(null);
    setMessage("Digite o WillTreino ID do parceiro.");
  }

  const content = (
    <div className="space-y-5">
      {step === "sent" && preview ? (
        <div className="wt-pop-in space-y-4 rounded-wt-lg bg-wt-success-subtle p-4">
          <p className="flex items-center gap-2 wt-text-h3 text-wt-success-text">
            <CircleCheck aria-hidden="true" className="size-5" />
            Convite enviado para {preview.displayName}
          </p>
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            O convite expira em 48 horas se <strong>{preview.displayName}</strong> não responder.
            Quando aceitar, a sala de treino é criada para vocês dois.
          </p>
          <Button variant="secondary" onClick={handleReset}>
            Convidar outra pessoa
          </Button>
        </div>
      ) : (
        <>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (canResolve && !busy) {
                void handleResolve();
              }
            }}
          >
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono uppercase tracking-wider"
              error={error ?? undefined}
              hint="Peça o ID para a pessoa: ele fica na Conta dela."
              id={inputId}
              inputMode="text"
              label="WillTreino ID"
              placeholder="WT-7FK3-Q9LP"
              spellCheck={false}
              value={candidate}
              onChange={(event) => {
                setRawId(event.target.value);
                setError(null);
                if (step === "previewing") {
                  setStep("idle");
                  setPreview(null);
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!canResolve}
                loading={step === "resolving"}
                loadingLabel="Buscando"
                type="submit"
                variant={preview ? "secondary" : "primary"}
              >
                <Search aria-hidden="true" className="size-4" />
                Buscar parceiro
              </Button>
              {step !== "idle" ? (
                <Button type="button" variant="ghost" onClick={handleReset}>
                  Limpar
                </Button>
              ) : null}
            </div>
          </form>

          {preview && (step === "previewing" || step === "sending") ? (
            <TrainingInvitePreviewCard
              preview={preview}
              actions={
                <Button
                  className="w-full sm:w-auto"
                  loading={step === "sending"}
                  loadingLabel="Enviando"
                  type="button"
                  onClick={() => void handleSend()}
                >
                  Convidar para este treino
                </Button>
              }
            />
          ) : null}
        </>
      )}

      <p className="flex items-start gap-2 wt-text-caption text-wt-text-secondary-strong">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Vocês só veem nome e WillTreino ID um do outro. Cargas, saúde e medidas continuam privadas.
      </p>

      <LiveRegion politeness="polite">{error ?? message}</LiveRegion>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="space-y-1">
        <h2 className="wt-text-h2">Convidar parceiro</h2>
        <p className="text-wt-body-sm text-wt-text-secondary-strong">
          Busque pelo WillTreino ID. Você vê apenas nome e ID público antes de convidar.
        </p>
      </div>
      {content}
    </Card>
  );
}
