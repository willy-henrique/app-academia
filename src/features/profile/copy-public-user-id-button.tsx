"use client";

import { useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

type CopyPublicUserIdButtonProps = {
  publicUserId: string;
};

export function CopyPublicUserIdButton({ publicUserId }: CopyPublicUserIdButtonProps) {
  const [message, setMessage] = useState<string>();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUserId);
      setMessage("WillTreino ID copiado.");
    } catch {
      setMessage("Não foi possível copiar automaticamente. Copie o ID manualmente.");
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={handleCopy} type="button" variant="ghost">
        Copiar ID
      </Button>
      <p className="wt-text-label text-wt-text-secondary break-all">{publicUserId}</p>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </div>
  );
}
