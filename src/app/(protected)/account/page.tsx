import { Accessibility, Apple, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { AccountSecurityPanel } from "@/features/auth/account-security-panel";
import { AccountTrainingInvites } from "@/features/group/account-training-invites";
import { AccountPrivacyPanel } from "@/features/profile/account-privacy-panel";
import { MeasurementsPanel } from "@/features/profile/measurements-panel";
import { PublicProfileCard } from "@/features/profile/public-profile-card";

export const metadata: Metadata = {
  title: "Conta · WillTreino",
};

const preferenceLinks = [
  {
    description: "Objetivo, rotina, local e equipamentos",
    href: "/onboarding",
    icon: SlidersHorizontal,
    label: "Preferências de treino",
  },
  {
    description: "Adaptações e cuidados de segurança",
    href: "/onboarding",
    icon: Accessibility,
    label: "Acessibilidade",
  },
  {
    description: "Diário privado e catálogo de alimentos",
    href: "/food",
    icon: Apple,
    label: "Alimentação",
  },
] as const;

/**
 * Conta em categorias: identidade pública primeiro (o que se compartilha),
 * depois preferências, dados privados e, por último, acesso e privacidade.
 */
export default function AccountPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        description="Sua identidade pública, preferências e dados privados — sem expor nada sensível a parceiros de treino."
        title="Conta"
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="space-y-8">
          <PublicProfileCard />
          <AccountTrainingInvites />
          <section aria-labelledby="preferences-title" className="space-y-3">
            <SectionHeader id="preferences-title" title="Preferências" />
            <ul className="divide-y divide-wt-border overflow-hidden rounded-wt-card border border-wt-border bg-wt-surface">
              {preferenceLinks.map(({ description, href, icon: Icon, label }) => (
                <li key={label}>
                  <Link
                    className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-wt-surface-elevated"
                    href={href}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-wt-md bg-wt-surface-elevated text-wt-text-secondary-strong"
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-wt-label font-semibold">{label}</span>
                      <span className="block text-xs text-wt-text-secondary-strong">
                        {description}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-4 text-wt-text-secondary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="space-y-8">
          <MeasurementsPanel />
          <AccountSecurityPanel />
          <AccountPrivacyPanel />
        </div>
      </div>
    </main>
  );
}
