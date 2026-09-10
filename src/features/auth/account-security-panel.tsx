"use client";

import { Card } from "@/components/ui/card";

import { useAuthSession } from "./auth-session-provider";
import { GoogleLinkButton } from "./google-link-button";
import { LogoutButton } from "./logout-button";

export function AccountSecurityPanel() {
  const { mode, user } = useAuthSession();

  return (
    <Card className="space-y-6" elevated>
      <div className="space-y-2">
        <h1 className="wt-text-heading">Conta</h1>
        <p className="wt-text-body text-wt-text-secondary">
          Vincule seu Google à conta atual ou encerre a sessão com segurança.
        </p>
      </div>
      <div className="space-y-1 rounded-wt-md border border-wt-border bg-wt-surface p-4">
        <p className="wt-text-label text-wt-text-secondary">Email de acesso</p>
        <p className="wt-text-body break-all">{user?.email ?? "Conta autenticada"}</p>
      </div>
      {mode === "firebase" ? (
        <GoogleLinkButton />
      ) : (
        <p className="rounded-wt-md border border-wt-accent/25 bg-wt-accent/8 p-3 text-sm text-wt-text-secondary">
          Esta é uma sessão local de desenvolvimento. Vinculação Google e dados de conta só são
          habilitados no Firebase.
        </p>
      )}
      <LogoutButton className="w-full" />
    </Card>
  );
}
