"use client";

import { Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

type CopyPublicUserIdButtonProps = {
  publicUserId: string;
};

/**
 * WillTreino ID fácil de ver, copiar e compartilhar. O compartilhamento usa a
 * folha nativa do sistema quando o navegador oferece; sem ela, só aparece o
 * botão de copiar.
 */
export function CopyPublicUserIdButton({ publicUserId }: CopyPublicUserIdButtonProps) {
  const [message, setMessage] = useState<string>();
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUserId);
      setMessage("WillTreino ID copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Copie o ID manualmente.");
    }
  }

  async function handleShare() {
    try {
      await navigator.share({
        text: `Treina comigo no WillTreino? Meu WillTreino ID é ${publicUserId}.`,
        title: "Meu WillTreino ID",
      });
    } catch {
      // Cancelar a folha de compartilhamento não é erro.
    }
  }

  return (
    <div className="space-y-3">
      <p className="rounded-wt-lg bg-wt-surface-elevated px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.08em] text-wt-text-primary break-all">
        {publicUserId}
      </p>
      <div className="grid gap-2 sm:flex">
        <Button className="sm:flex-1" onClick={handleCopy} type="button" variant="tonal">
          <Copy aria-hidden="true" className="size-4" />
          Copiar ID
        </Button>
        {canShare ? (
          <Button className="sm:flex-1" onClick={handleShare} type="button" variant="secondary">
            <Share2 aria-hidden="true" className="size-4" />
            Compartilhar
          </Button>
        ) : null}
      </div>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </div>
  );
}
