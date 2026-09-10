"use client";

import { useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

import { authCopy } from "./auth-copy";
import {
  GoogleLinkConflictError,
  GoogleLinkRequiresRecentLoginError,
  linkGoogleAccount,
  type GoogleLinkResult,
} from "./google-link";

type GoogleLinkButtonProps = {
  onSuccess?: (result: GoogleLinkResult) => void;
  linkAccount?: () => Promise<GoogleLinkResult>;
};

export function GoogleLinkButton({
  onSuccess,
  linkAccount = linkGoogleAccount,
}: GoogleLinkButtonProps) {
  const [message, setMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    setMessage(undefined);

    try {
      const result = await linkAccount();
      if (result === "REDIRECT_STARTED") {
        setMessage("Redirecionando para o Google.");
      } else {
        setMessage("Google vinculada à sua conta.");
      }
      onSuccess?.(result);
    } catch (error) {
      if (error instanceof GoogleLinkRequiresRecentLoginError) {
        setMessage(authCopy.googleLinkRequiresRecentLogin);
      } else if (error instanceof GoogleLinkConflictError) {
        setMessage(authCopy.googleLinkConflict);
      } else {
        setMessage(authCopy.genericLinkFailure);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" loading={isLoading} onClick={handleClick} variant="outline">
        Vincular Google
      </Button>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </div>
  );
}
