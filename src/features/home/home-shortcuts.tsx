import { Apple, ChartNoAxesColumn, ChevronRight, HeartPulse, UsersRound } from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/layout/page-header";

const shortcuts = [
  {
    description: "Opcional, no seu ritmo",
    href: "/cardio",
    icon: HeartPulse,
    label: "Cardio",
  },
  {
    description: "Recordes e volume",
    href: "/progress",
    icon: ChartNoAxesColumn,
    label: "Evolução",
  },
  {
    description: "Diário e catálogo",
    href: "/food",
    icon: Apple,
    label: "Alimentação",
  },
  {
    description: "Convites e WillTreino ID",
    href: "/account#convites",
    icon: UsersRound,
    label: "Treinar com alguém",
  },
] as const;

/** Atalhos úteis e secundários: linhas simples, sem competir com o treino de hoje. */
export function HomeShortcuts() {
  return (
    <section aria-labelledby="shortcuts-title" className="space-y-3">
      <SectionHeader id="shortcuts-title" title="Atalhos" />
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ description, href, icon: Icon, label }) => (
          <li key={href}>
            <Link
              className="group flex min-h-16 items-center gap-3 rounded-wt-lg border border-wt-border bg-wt-surface px-4 py-3 transition-colors duration-150 hover:border-wt-accent-border hover:bg-wt-accent-subtle/40"
              href={href}
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-wt-md bg-wt-surface-elevated text-wt-text-secondary-strong group-hover:text-wt-accent-text"
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-wt-label font-semibold text-wt-text-primary">
                  {label}
                </span>
                <span className="block truncate text-xs text-wt-text-secondary-strong">
                  {description}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-wt-text-secondary" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
