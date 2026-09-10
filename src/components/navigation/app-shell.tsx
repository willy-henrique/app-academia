"use client";

import { Apple, ChartNoAxesColumn, Dumbbell, HeartPulse, House, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SkipLink } from "@/components/accessibility/skip-link";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { DesktopNav, type NavigationSection } from "./desktop-nav";
import { MobileNav, type NavigationItem } from "./mobile-nav";

const homeItem: NavigationItem = { href: "/dashboard", icon: House, label: "Início" };
const workoutItem: NavigationItem = {
  href: "/workout",
  icon: Dumbbell,
  label: "Treino",
  matches: ["/group"],
};
const cardioItem: NavigationItem = { href: "/cardio", icon: HeartPulse, label: "Cardio" };
const progressItem: NavigationItem = {
  href: "/progress",
  icon: ChartNoAxesColumn,
  label: "Evolução",
};
const foodItem: NavigationItem = { href: "/food", icon: Apple, label: "Alimentação" };
const accountItem: NavigationItem = {
  href: "/account",
  icon: UserRound,
  label: "Conta",
  matches: ["/onboarding"],
};

/** Desktop: tudo visível, agrupado por intenção. */
export const desktopNavigationSections: readonly NavigationSection[] = [
  { items: [homeItem, workoutItem, cardioItem], label: "Treinar" },
  { items: [progressItem, foodItem], label: "Acompanhar" },
];
export const desktopFooterItems: readonly NavigationItem[] = [accountItem];

/**
 * Mobile: cinco destinos de uso frequente. Alimentação continua a um toque
 * pelos atalhos do Início e pela Conta — não some, só sai da barra.
 */
export const mobileNavigationItems: readonly NavigationItem[] = [
  homeItem,
  workoutItem,
  cardioItem,
  progressItem,
  accountItem,
];

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Casca das áreas autenticadas: sidebar no desktop e barra inferior até tablet.
 * O conteúdo reserva a altura da barra fixa (mais a área segura) para que o
 * último elemento da página continue alcançável no celular.
 */
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname() ?? "/";
  const { mode } = useAuthSession();

  return (
    <div className="min-h-dvh bg-wt-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <SkipLink />
      <DesktopNav
        currentPath={pathname}
        footerItems={desktopFooterItems}
        sections={desktopNavigationSections}
      />
      <div className="min-w-0">
        {mode === "local" ? (
          <aside className="border-b border-wt-accent-border bg-wt-accent-subtle px-5 py-2 text-center text-xs font-semibold text-wt-accent-text">
            Modo local de desenvolvimento — dados não são enviados ao Firebase.
          </aside>
        ) : null}
        <div className="pb-[calc(var(--wt-mobile-nav-height)+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>
      <MobileNav currentPath={pathname} items={mobileNavigationItems} />
    </div>
  );
}
