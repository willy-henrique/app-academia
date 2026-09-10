"use client";

import { useCallback, useEffect, useState } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

import {
  getEmailVerificationStatus,
  requestEmailVerification,
  type EmailVerificationRequestResult,
  type EmailVerificationStatus,
} from "./email-verification";
import { authCopy } from "./auth-copy";

const resendCooldownSeconds = 60;

type EmailVerificationCardProps = {
  getStatus?: () => Promise<EmailVerificationStatus>;
  requestVerification?: () => Promise<EmailVerificationRequestResult>;
};

export function EmailVerificationCard({
  getStatus = getEmailVerificationStatus,
  requestVerification = requestEmailVerification,
}: EmailVerificationCardProps) {
  const [status, setStatus] = useState<EmailVerificationStatus>();
  const [message, setMessage] = useState<string>();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await getStatus());
    } catch {
      setMessage(authCopy.verificationStatusFailure);
    }
  }, [getStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshStatus]);

  useEffect(() => {
    if (remainingSeconds === 0) {
      return;
    }

    const timer = window.setTimeout(() => setRemainingSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  async function handleRequest() {
    setIsRequesting(true);
    setMessage(undefined);

    try {
      const result = await requestVerification();
      if (result === "SENT") {
        setRemainingSeconds(resendCooldownSeconds);
        setMessage(authCopy.emailVerificationResent);
      } else {
        setStatus("VERIFIED");
        setMessage(authCopy.emailVerificationAlreadyVerified);
      }
    } catch {
      setMessage(authCopy.emailVerificationFailure);
    } finally {
      setIsRequesting(false);
    }
  }

  if (status === "VERIFIED") {
    return <LiveRegion visible>Seu email está verificado.</LiveRegion>;
  }

  if (status === "AUTH_REQUIRED") {
    return (
      <LiveRegion politeness="assertive" visible>
        {authCopy.emailVerificationAuthRequired}
      </LiveRegion>
    );
  }

  const resendBlocked = remainingSeconds > 0;
  return (
    <section aria-labelledby="verify-email-title" className="space-y-4">
      <div className="space-y-1">
        <h1 className="wt-text-heading" id="verify-email-title">
          Confirme seu email
        </h1>
        <p className="wt-text-body text-wt-text-secondary">
          Enviaremos um link para o endereço usado na sua conta.
        </p>
      </div>
      <Button disabled={resendBlocked} loading={isRequesting} onClick={handleRequest} type="button">
        {resendBlocked ? `Reenviar em ${remainingSeconds}s` : "Enviar link de verificação"}
      </Button>
      <Button onClick={refreshStatus} type="button" variant="ghost">
        Já confirmei meu email
      </Button>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </section>
  );
}
