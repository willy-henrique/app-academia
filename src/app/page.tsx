import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const productSignals = [
  "Carga anterior em um toque",
  "Descanso calculado por tempo real",
  "Treino individual ou sincronizado",
] as const;

const productPillars = [
  {
    description:
      "Uma sessão objetiva, com próxima ação, carga anterior, repetições e descanso no mesmo lugar.",
    icon: Dumbbell,
    label: "Treino sem atrito",
    number: "01",
  },
  {
    description:
      "Quando o treino é em grupo, cada pessoa mantém suas próprias cargas, séries e privacidade.",
    icon: UsersRound,
    label: "Sincronizado de verdade",
    number: "02",
  },
  {
    description:
      "Dados de saúde, acessibilidade e medidas são privados por padrão. Você decide o que compartilhar.",
    icon: ShieldCheck,
    label: "Privacidade é padrão",
    number: "03",
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden">
      <section className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] overflow-hidden">
          <div className="absolute -left-32 top-4 size-[24rem] rounded-full bg-wt-accent-subtle blur-3xl" />
          <div className="absolute right-0 top-16 size-56 rounded-full bg-wt-info-subtle blur-3xl" />
        </div>

        <header className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            className="flex items-center rounded-wt-md"
            href="/"
            aria-label="WillTreino, início"
          >
            <Logo />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="inline-flex min-h-11 items-center rounded-wt-md px-3 text-sm font-bold text-wt-text-secondary transition-colors hover:text-wt-text-primary"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-wt-md bg-wt-accent-hover px-4 text-sm font-extrabold text-wt-accent-foreground shadow-[var(--wt-shadow-surface)] transition-colors hover:bg-wt-accent-active"
              href="/signup"
            >
              Começar <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <p className="wt-kicker">Seu treino, no ritmo certo</p>
            <h1 className="wt-text-display mt-5 max-w-xl">
              Menos dúvida.
              <br />
              Mais <span className="wt-gradient-text">movimento.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-wt-text-secondary-strong sm:text-xl">
              WillTreino organiza o que fazer agora, quanto descansar e como evoluir. Sozinho ou
              acompanhado, sem transformar sua rotina em planilha.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-wt-md bg-wt-accent-hover px-5 text-base font-extrabold text-wt-accent-foreground shadow-[var(--wt-shadow-surface)] transition-colors hover:bg-wt-accent-active"
                href="/signup"
              >
                Criar minha conta <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <a
                className="inline-flex min-h-14 items-center justify-center rounded-wt-md border border-wt-border bg-wt-surface px-5 text-base font-bold text-wt-text-primary transition-colors hover:border-wt-accent-border hover:bg-wt-accent-subtle"
                href="#como-funciona"
              >
                Ver como funciona
              </a>
            </div>
            <ul className="mt-8 grid gap-3 text-sm font-semibold text-wt-text-secondary-strong sm:grid-cols-3">
              {productSignals.map((signal) => (
                <li key={signal} className="flex items-start gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-wt-success"
                    size={17}
                  />
                  {signal}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-4 -z-10 rounded-[2.5rem] bg-wt-accent-subtle blur-3xl" />
            <div className="wt-surface-glass rounded-[2rem] p-3 sm:p-5">
              <div className="rounded-[1.45rem] border border-wt-border bg-wt-surface p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="wt-kicker">Agora</p>
                    <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">Upper A</h2>
                    <p className="mt-1 text-sm text-wt-text-secondary-strong">
                      Força e hipertrofia · 45 min
                    </p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-active">
                    <Dumbbell aria-hidden="true" size={22} />
                  </span>
                </div>

                <div className="mt-7 rounded-wt-lg border border-wt-border bg-wt-surface-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-wt-text-secondary-strong">
                      Próxima ação
                    </p>
                    <span className="rounded-full bg-wt-accent-subtle px-2.5 py-1 text-xs font-extrabold text-wt-accent-active">
                      Série 2 de 3
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold tracking-[-0.035em]">Supino reto</h3>
                  <p className="mt-1 text-sm text-wt-text-secondary-strong">
                    Última vez: 24 kg × 10 · RIR 2
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="wt-stat p-3">
                      <p className="text-xs text-wt-text-secondary-strong">Carga</p>
                      <p className="mt-1 text-lg font-extrabold">24 kg</p>
                    </div>
                    <div className="wt-stat p-3">
                      <p className="text-xs text-wt-text-secondary-strong">Reps</p>
                      <p className="mt-1 text-lg font-extrabold">10</p>
                    </div>
                    <div className="wt-stat p-3">
                      <p className="text-xs text-wt-text-secondary-strong">RIR</p>
                      <p className="mt-1 text-lg font-extrabold">2</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-wt-md bg-wt-accent-hover px-4 py-3 text-sm font-extrabold text-wt-accent-foreground">
                    Concluir série <ArrowRight aria-hidden="true" size={17} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-3 rounded-wt-md border border-wt-border px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-wt-warning-subtle text-wt-warning">
                    <Clock3 aria-hidden="true" size={18} />
                  </span>
                  <p className="text-sm font-semibold">
                    Descanso calculado em tempo real
                    <span className="block text-xs font-normal text-wt-text-secondary-strong">
                      Sem reiniciar o timer ao voltar do app.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="como-funciona"
        className="border-y border-wt-border bg-wt-surface py-20 sm:py-28"
      >
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="wt-kicker">O essencial, bem resolvido</p>
            <h2 className="wt-section-title mt-4">Uma sessão clara do começo ao fim.</h2>
            <p className="mt-4 text-lg leading-relaxed text-wt-text-secondary-strong">
              O produto prioriza a próxima decisão útil. Nada de telas administrativas no meio do
              treino.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {productPillars.map(({ description, icon: Icon, label, number }) => (
              <article
                key={number}
                className="rounded-wt-lg border border-wt-border bg-wt-surface p-6 shadow-[var(--wt-shadow-surface)] transition-colors hover:border-wt-accent-border"
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-active">
                    <Icon aria-hidden="true" size={24} />
                  </span>
                  <span className="text-sm font-extrabold text-wt-text-secondary-strong">
                    {number}
                  </span>
                </div>
                <h3 className="mt-8 text-xl font-extrabold tracking-[-0.035em]">{label}</h3>
                <p className="mt-3 leading-relaxed text-wt-text-secondary-strong">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="rounded-wt-lg border border-wt-border bg-wt-surface p-6 shadow-[var(--wt-shadow-surface)] sm:p-8">
          <span className="grid size-12 place-items-center rounded-wt-md bg-wt-info-subtle text-wt-info">
            <HeartPulse aria-hidden="true" size={25} />
          </span>
          <p className="wt-kicker mt-7">Pessoa antes do plano</p>
          <h2 className="wt-section-title mt-4">O software se adapta ao seu momento.</h2>
          <p className="mt-4 leading-relaxed text-wt-text-secondary-strong">
            Tempo disponível, equipamento, preferências e adaptações orientam o treino. Informações
            sensíveis permanecem privadas e nunca viram explicação pública para outra pessoa.
          </p>
        </div>
        <div className="rounded-wt-lg border border-wt-border bg-wt-surface-elevated p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-active">
              <Sparkles aria-hidden="true" size={20} />
            </span>
            <p className="font-extrabold tracking-[-0.02em]">Contexto, não ruído</p>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="wt-stat">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-wt-text-secondary-strong">
                Pouco tempo
              </p>
              <p className="mt-2 text-xl font-extrabold">Treino express</p>
              <p className="mt-1 text-sm text-wt-text-secondary-strong">Prioriza o que importa.</p>
            </div>
            <div className="wt-stat">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-wt-text-secondary-strong">
                Treino em dupla
              </p>
              <p className="mt-2 text-xl font-extrabold">Sua vez, sem confusão</p>
              <p className="mt-1 text-sm text-wt-text-secondary-strong">
                Descanso real para cada pessoa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-wt-border bg-wt-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Logo size="sm" />
            <p className="mt-1 text-sm text-wt-text-secondary-strong">
              Treino claro, progresso real, privacidade por padrão.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-wt-accent-text hover:underline"
            href="/signup"
          >
            Começar agora <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </footer>
    </main>
  );
}
