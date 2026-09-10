"use client";

import { useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

import { authCopy } from "./auth-copy";
import { isLocalDevelopmentAuthEnabled } from "./local-development-auth";
import {
  GoogleAccountConflictError,
  signInWithGoogle,
  type GoogleSignInResult,
} from "./google-auth";

type GoogleSignInButtonProps = {
  onSuccess?: (result: GoogleSignInResult) => void;
  signIn?: () => Promise<GoogleSignInResult>;
};

export function GoogleSignInButton({
  onSuccess,
  signIn = signInWithGoogle,
}: GoogleSignInButtonProps) {
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setMessage(undefined);

    try {
      const result = await signIn();
      if (result === "REDIRECT_STARTED") {
        setMessage("Redirecionando para o Google.");
      }
      onSuccess?.(result);
    } catch (error) {
      setMessage(
        error instanceof GoogleAccountConflictError
          ? authCopy.googleConflictGuidance
          : authCopy.genericGoogleFailure,
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isLocalDevelopmentAuthEnabled()) {
    return (
      <p className="rounded-wt-md border border-wt-accent/25 bg-wt-accent/8 px-3 py-2 text-sm text-wt-text-secondary">
        Modo local ativo: entre com email e uma senha de ao menos 6 caracteres. O Google só fica
        disponível quando o Firebase Auth estiver configurado.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" loading={isLoading} onClick={handleClick} variant="outline">
        <span aria-hidden="true" className="font-bold">
          G
        </span>
        Continuar com Google
      </Button>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </div>
  );
}
