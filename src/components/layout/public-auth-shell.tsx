import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
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
      <header className="relative mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link aria-label="WillTreino, início" className="flex items-center rounded-wt-md" href="/">
          <Logo />
        </Link>
        {action ? (
          <Link
            className="inline-flex min-h-11 items-center rounded-wt-md px-3 text-sm font-semibold text-wt-accent-text transition-colors hover:bg-wt-accent-subtle"
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
              <h1 className="wt-text-h1">{title}</h1>
              {description ? (
                <p className="text-wt-body-sm text-wt-text-secondary-strong sm:text-wt-body">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}
          {children}
        </Card>
      </section>
    </main>
  );
}
