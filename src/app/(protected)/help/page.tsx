import {
  Apple,
  BookOpenCheck,
  ChartNoAxesColumn,
  CircleHelp,
  Dumbbell,
  HeartPulse,
  PlayCircle,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";

export const metadata: Metadata = {
  title: "Ajuda · WillTreino",
};

const quickStarts = [
  {
    description:
      "Escolha objetivo, rotina, equipamentos e adaptações para receber uma experiência alinhada ao seu momento.",
    href: "/onboarding",
    icon: BookOpenCheck,
    label: "1. Ajuste suas preferências",
  },
  {
    description:
      "Abra o treino do dia, registre séries e use “Como executar” para assistir a demonstração de cada exercício.",
    href: "/workout",
    icon: Dumbbell,
    label: "2. Faça seu primeiro treino",
  },
  {
    description:
      "Acompanhe consistência, medidas e evolução sem transformar um dia isolado em cobrança.",
    href: "/progress",
    icon: ChartNoAxesColumn,
    label: "3. Veja sua evolução",
  },
] as const;

const featureGuides = [
  {
    description:
      "Registre duração, esforço e observações do cardio para manter o histórico completo.",
    href: "/cardio",
    icon: HeartPulse,
    label: "Cardio",
  },
  {
    description:
      "Monte um diário alimentar privado com os alimentos e porções que fazem sentido para sua rotina.",
    href: "/food",
    icon: Apple,
    label: "Alimentação",
  },
  {
    description:
      "Convide alguém pelo WillTreino ID e acompanhem uma sessão compartilhada com dados separados.",
    href: "/account#convites",
    icon: UsersRound,
    label: "Treinar com alguém",
  },
] as const;

export default function HelpPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        description="Um caminho curto para começar, entender os recursos e treinar com segurança no seu ritmo."
        eyebrow="Central de ajuda"
        title="Como usar o WillTreino"
      />

      <section aria-labelledby="quick-start-title" className="space-y-3">
        <SectionHeader
          description="Siga esta ordem na primeira vez; cada etapa permanece disponível para você revisar depois."
          id="quick-start-title"
          title="Comece em três passos"
        />
        <ol className="grid gap-3 lg:grid-cols-3">
          {quickStarts.map(({ description, href, icon: Icon, label }) => (
            <li key={label}>
              <Link
                className="block h-full rounded-wt-card focus:outline-none focus:ring-2 focus:ring-wt-accent-focus focus:ring-offset-2"
                href={href}
              >
                <Card className="h-full transition-colors hover:bg-wt-surface-elevated">
                  <Icon aria-hidden="true" className="mb-4 size-6 text-wt-accent-text" />
                  <h2 className="text-wt-label font-semibold">{label}</h2>
                  <p className="mt-1 text-wt-body-sm text-wt-text-secondary-strong">
                    {description}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="videos-title" className="space-y-3">
        <SectionHeader
          description="As demonstrações ficam no contexto do exercício, para que você não precise procurar orientação fora do treino."
          id="videos-title"
          title="Vídeos de execução"
        />
        <Card className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-text"
          >
            <PlayCircle className="size-6" />
          </span>
          <div>
            <h2 className="text-wt-label font-semibold">Assista antes de iniciar a série</h2>
            <p className="mt-1 text-wt-body-sm text-wt-text-secondary-strong">
              Em cada exercício, abra <strong>Como executar</strong>. O vídeo usa o domínio com
              privacidade aprimorada do YouTube e vem acompanhado de instruções, cuidados e
              descrição acessível.
            </p>
          </div>
          <Link className="wt-button wt-button-secondary" href="/workout">
            Abrir treino
          </Link>
        </Card>
      </section>

      <section aria-labelledby="guides-title" className="space-y-3">
        <SectionHeader id="guides-title" title="Guias por recurso" />
        <div className="grid gap-3 md:grid-cols-3">
          {featureGuides.map(({ description, href, icon: Icon, label }) => (
            <Link
              className="rounded-wt-card focus:outline-none focus:ring-2 focus:ring-wt-accent-focus focus:ring-offset-2"
              href={href}
              key={label}
            >
              <Card className="h-full transition-colors hover:bg-wt-surface-elevated">
                <Icon aria-hidden="true" className="mb-3 size-5 text-wt-text-secondary-strong" />
                <h2 className="text-wt-label font-semibold">{label}</h2>
                <p className="mt-1 text-wt-body-sm text-wt-text-secondary-strong">{description}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="questions-title" className="space-y-3">
        <SectionHeader id="questions-title" title="Dúvidas rápidas" />
        <div className="space-y-3">
          <Disclosure icon={<CircleHelp />} summary="Posso adaptar ou pular um exercício?">
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Sim. Priorize conforto e técnica. Consulte as adaptações e alternativas do exercício;
              se houver dor aguda, interrompa e procure orientação profissional.
            </p>
          </Disclosure>
          <Disclosure icon={<ShieldCheck />} summary="Quem consegue ver meus dados?">
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Seus dados de saúde, alimentação, medidas e séries são privados. Em treino
              compartilhado, a outra pessoa vê somente o necessário para a sessão.
            </p>
          </Disclosure>
        </div>
      </section>
    </main>
  );
}
