import { ShieldCheck } from "lucide-react";

import { AccountSecurityPanel } from "@/features/auth/account-security-panel";
import { AccountTrainingInvites } from "@/features/group/account-training-invites";
import { AccountPrivacyPanel } from "@/features/profile/account-privacy-panel";
import { MeasurementsPanel } from "@/features/profile/measurements-panel";
import { PublicProfileCard } from "@/features/profile/public-profile-card";

export default function AccountPage() {
  return (
    <main className="wt-page wt-page-grid flex max-w-5xl flex-col gap-5" id="main-content">
      <section className="flex flex-col gap-4 rounded-wt-lg border border-wt-border bg-wt-surface/65 p-5 shadow-[var(--wt-shadow-surface)] sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <p className="wt-kicker">Seu espaço</p>
          <h1 className="wt-section-title mt-3">Conta e privacidade</h1>
          <p className="mt-3 max-w-xl wt-text-body text-wt-text-secondary">
            Gerencie sua identidade pública e dados pessoais sem expor informações sensíveis a
            parceiros de treino.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-wt-md border border-wt-accent/20 bg-wt-accent/8 px-4 py-3 text-sm text-wt-text-secondary">
          <span className="grid size-9 place-items-center rounded-full bg-wt-accent/15 text-wt-accent">
            <ShieldCheck aria-hidden="true" size={18} />
          </span>
          <span>Dados privados por padrão</span>
        </div>
      </section>
      <PublicProfileCard />
      <AccountTrainingInvites />
      <MeasurementsPanel />
      <AccountSecurityPanel />
      <AccountPrivacyPanel />
    </main>
  );
}
