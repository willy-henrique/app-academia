"use client";

import { useState, type ReactNode } from "react";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";

import { authCopy } from "./auth-copy";
import { logoutFromFirebase } from "./logout";

type LogoutButtonProps = Readonly<{
  children?: ReactNode;
  className?: string;
  onLogout?: () => Promise<void>;
}>;

export function LogoutButton({
  children = "Sair",
  className,
  onLogout = logoutFromFirebase,
}: LogoutButtonProps) {
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);
    setMessage(undefined);

    try {
      await onLogout();
      setMessage("Você saiu da conta.");
    } catch {
      setMessage(authCopy.genericLogoutFailure);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button className={className} loading={isSubmitting} onClick={handleLogout} type="button">
        {children}
      </Button>
      {message ? (
        <LiveRegion politeness="assertive" visible>
          {message}
        </LiveRegion>
      ) : null}
    </>
  );
}
