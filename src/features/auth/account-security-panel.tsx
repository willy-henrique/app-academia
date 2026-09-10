"use client";

import { Mail } from "lucide-react";

import { SectionHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

import { useAuthSession } from "./auth-session-provider";
import { GoogleLinkButton } from "./google-link-button";
import { LogoutButton } from "./logout-button";

export function AccountSecurityPanel() {
  const { mode, user } = useAuthSession();

  return (
    <section aria-labelledby="account-security-title" className="space-y-3">
      <SectionHeader
        description="Vincule seu Google ou encerre a sessão com segurança."
        id="account-security-title"
        title="Acesso"
      />
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-wt-md bg-wt-surface-elevated text-wt-text-secondary-strong"
          >
            <Mail className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="wt-text-caption font-semibold text-wt-text-secondary-strong">
              Email de acesso
            </p>
            <p className="text-wt-body-sm break-all">{user?.email ?? "Conta autenticada"}</p>
          </div>
        </div>
        {mode === "firebase" ? (
          <GoogleLinkButton />
        ) : (
          <p className="rounded-wt-lg bg-wt-accent-subtle px-4 py-3 text-wt-body-sm text-wt-accent-text">
            Esta é uma sessão local de desenvolvimento. Vinculação Google e dados de conta só são
            habilitados no Firebase.
          </p>
        )}
        <LogoutButton className="w-full" />
      </Card>
    </section>
  );
}
