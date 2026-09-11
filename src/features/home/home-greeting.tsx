"use client";

import { PageHeader } from "@/components/layout/page-header";
import { useAuthSession } from "@/features/auth/auth-session-provider";

export function resolveGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) {
    return "Bom dia";
  }

  if (hour >= 12 && hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

function firstName(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first && first.length > 0
    ? `${first[0].toLocaleUpperCase("pt-BR")}${first.slice(1)}`
    : null;
}

type HomeGreetingProps = Readonly<{ now?: Date }>;

/**
 * Cabeçalho do Início. Renderiza só no cliente (a área autenticada espera a
 * sessão), então a saudação por horário usa o relógio da pessoa sem risco de
 * divergir da hidratação.
 */
export function HomeGreeting({ now }: HomeGreetingProps) {
  const { user } = useAuthSession();
  const date = now ?? new Date();
  const name = firstName(user?.displayName);
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);

  return (
    <PageHeader
      description={`${today[0].toLocaleUpperCase("pt-BR")}${today.slice(1)}`}
      title={
        name ? `${resolveGreeting(date.getHours())}, ${name}` : resolveGreeting(date.getHours())
      }
    />
  );
}
