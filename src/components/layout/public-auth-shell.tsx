import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type PublicAuthShellProps = {
  action?: Readonly<{ href: string; label: string }>;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  title?: string;
};

/** Estrutura compartilhada das rotas públicas de acesso, sem estado de autenticação. */
export function PublicAuthShell({
  action,
  children,
  description,
  eyebrow = "WillTreino",
  title,
}: PublicAuthShellProps) {
  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden bg-wt-background"
      id="main-content"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden"
      >
        <div className="absolute -left-28 -top-20 size-80 rounded-full bg-wt-accent-subtle blur-3xl" />
        <div className="absolute right-0 top-12 size-52 rounded-full bg-wt-info-subtle blur-3xl" />
      </div>

      <header className="relative mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          aria-label="WillTreino, início"
          className="flex items-center gap-2.5 text-wt-text-primary"
          href="/"
        >
          <span className="grid size-9 place-items-center rounded-[0.8rem] bg-wt-accent text-xs font-black text-wt-accent-foreground shadow-[0_0_0_5px_var(--wt-color-accent-subtle)]">
            WT
          </span>
          <span className="font-[family-name:var(--wt-font-family-display)] text-xl font-extrabold tracking-[-0.05em]">
            WillTreino
          </span>
        </Link>
        {action ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-wt-md px-3 text-sm font-bold text-wt-accent-active transition-colors hover:bg-wt-accent-subtle"
            href={action.href}
          >
            {action.label}
          </Link>
        ) : null}
      </header>

      <section className="relative mx-auto flex w-full max-w-md flex-1 items-center px-5 py-10 sm:px-0 sm:py-14">
        <Card className="w-full p-6 sm:p-8" elevated>
          {title ? (
            <div className="mb-7 space-y-3">
              <p className="wt-kicker">{eyebrow}</p>
              <h1 className="wt-text-heading">{title}</h1>
              {description ? (
                <p className="wt-text-body text-wt-text-secondary-strong">{description}</p>
              ) : null}
            </div>
          ) : null}
          {children}
        </Card>
      </section>
    </main>
  );
}
