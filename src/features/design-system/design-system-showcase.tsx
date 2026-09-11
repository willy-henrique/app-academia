"use client";

import { CircleCheck, Dumbbell, Mail, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/logo";
import { PageHeader, SectionHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Dialog } from "@/components/ui/dialog";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";
import { Metric, MetricGrid } from "@/components/ui/metric";
import { NumberStepper } from "@/components/ui/number-stepper";
import { OptionCards } from "@/components/ui/option-cards";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import type { WorkoutSession } from "@/domain/workout/session";
import { ExerciseQueue } from "@/features/workout/exercise-queue";
import { RestTimer } from "@/features/workout/rest-timer";
import { WorkoutCompletion } from "@/features/workout/workout-completion";

const colorTokens = [
  ["background", "Fundo"],
  ["surface", "Superfície"],
  ["surface-elevated", "Superfície secundária"],
  ["border", "Borda"],
  ["text-primary", "Texto"],
  ["text-secondary-strong", "Texto secundário"],
  ["accent", "Primária (marca)"],
  ["accent-hover", "Primária (CTA)"],
  ["accent-subtle", "Primária suave"],
  ["success", "Sucesso"],
  ["warning", "Descanso / atenção"],
  ["danger", "Erro / risco"],
  ["info", "Informação"],
] as const;

const typeScale = [
  ["wt-text-display", "Mais movimento."],
  ["wt-text-h1", "Título de página"],
  ["wt-text-h2", "Título de seção"],
  ["wt-text-h3", "Título de card"],
  ["wt-text-body", "Texto corrido do produto."],
  ["wt-text-label", "Rótulo de campo"],
  ["wt-text-caption", "Legenda e apoio"],
  ["wt-text-metric", "24 kg"],
] as const;

/** Fila de exemplo (dados fictícios, só para a vitrine). */
const sampleQueue = [
  { completed: 3, name: "Supino reto com barra", sets: 3 },
  { completed: 1, name: "Remada unilateral com halter", sets: 3 },
  { completed: 0, name: "Agachamento livre", sets: 3 },
].map((item, index) => ({
  blockId: "strength-main",
  blockKind: "strength",
  blockOrder: 1,
  blockTitle: "Bloco principal",
  completedSets: item.completed,
  exerciseId: `sample-${index}`,
  exerciseName: item.name,
  lastSetCompletedAt: null,
  order: index + 1,
  prescription: {
    exerciseId: `sample-${index}`,
    exerciseName: item.name,
    loadStrategy: "last_used" as const,
    notes: null,
    repsMax: 12,
    repsMin: 8,
    restSeconds: 90,
    rirTarget: 2,
    sets: item.sets,
  },
  replacementExerciseId: null,
  replacementExerciseName: null,
  restExpectedEndAt: null,
  restStartedAt: null,
  restTargetSeconds: 0,
  status: "pending" as const,
  swapReason: null,
})) satisfies WorkoutSession["exerciseQueue"];

function ToastDemo() {
  const { showToast } = useToast();

  return (
    <Button
      variant="secondary"
      onClick={() =>
        showToast({ id: `demo-${Date.now()}`, title: "Treino salvo.", variant: "success" })
      }
    >
      Mostrar toast
    </Button>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="space-y-4">
      <SectionHeader title={title} />
      {children}
    </section>
  );
}

export function DesignSystemShowcase() {
  const [load, setLoad] = useState("22.5");
  const [modality, setModality] = useState<"RUN" | "BIKE" | "WALK">("RUN");
  const [equipment, setEquipment] = useState<string[]>(["dumbbell"]);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <ToastProvider>
      <main className="wt-page max-w-[var(--wt-container-wide)] space-y-12" id="main-content">
        <PageHeader
          actions={<Logo />}
          description="Referência viva dos tokens e componentes. Fonte de verdade: src/app/globals.css e docs/DESIGN_SYSTEM.md."
          eyebrow="Interno"
          title="WillTreino Design System"
        />

        <Section title="Cores">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {colorTokens.map(([token, label]) => (
              <li className="space-y-2" key={token}>
                <span
                  className="block h-14 rounded-wt-lg border border-wt-border"
                  style={{ background: `var(--wt-color-${token})` }}
                />
                <span className="block text-wt-label font-semibold">{label}</span>
                <code className="block text-xs text-wt-text-secondary-strong">{token}</code>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Tipografia">
          <Card className="space-y-4 p-5">
            {typeScale.map(([className, sample]) => (
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1" key={className}>
                <code className="w-40 shrink-0 text-xs text-wt-text-secondary-strong">
                  {className}
                </code>
                <span className={className}>{sample}</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Botões">
          <div className="flex flex-wrap gap-3">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="tonal">Tonal</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="success">Sucesso</Button>
            <Button variant="danger">Excluir</Button>
            <Button disabled>Desabilitado</Button>
            <Button loading loadingLabel="Salvando">
              Salvar
            </Button>
            <Button size="xl">Concluir série</Button>
            <Button aria-label="Treino" size="icon" variant="secondary">
              <Dumbbell aria-hidden="true" className="size-5" />
            </Button>
          </div>
        </Section>

        <Section title="Campos">
          <div className="grid gap-6 md:grid-cols-2">
            <Input hint="Usado só para login." label="E-mail" type="email" />
            <Input
              error="Informe um valor entre 20 e 400."
              label="Peso"
              unit="kg"
              value="5"
              readOnly
            />
            <Select
              label="Tipo de cardio"
              options={[
                { label: "Opcional", value: "o" },
                { label: "Recomendado", value: "r" },
              ]}
            />
            <Textarea label="Observação" placeholder="Ex.: senti o ombro na descida" />
            <NumberStepper
              decimals={1}
              label="Carga"
              size="large"
              step={2.5}
              unit="kg"
              value={load}
              onValueChange={setLoad}
            />
            <SegmentedControl
              label="Modalidade"
              options={[
                { label: "Corrida", value: "RUN" },
                { label: "Bicicleta", value: "BIKE" },
                { label: "Caminhada", value: "WALK" },
              ]}
              value={modality}
              onValueChange={setModality}
            />
            <ChoiceChips
              label="Equipamentos"
              options={[
                { label: "Halteres", value: "dumbbell" },
                { label: "Barra", value: "barbell" },
                { label: "Banco", value: "bench" },
              ]}
              values={equipment}
              onValuesChange={setEquipment}
            />
            <OptionCards
              label="Objetivo"
              name="ds-goal"
              options={[
                { description: "Mais volume por grupo.", label: "Ganhar massa", value: "a" },
                { description: "Constância acima de tudo.", label: "Saúde", value: "b" },
              ]}
            />
          </div>
        </Section>

        <Section title="Feedback e estado">
          <div className="flex flex-wrap gap-2">
            <Badge>Neutro</Badge>
            <Badge tone="accent">Em andamento</Badge>
            <Badge icon={<CircleCheck />} tone="success">
              Concluído
            </Badge>
            <Badge tone="warning">Descansando</Badge>
            <Badge tone="danger">Não sincronizado</Badge>
            <Badge tone="info">Estimativa</Badge>
          </div>
          <ProgressBar label="Exemplo" max={6} size="md" value={4} valueText="4 de 6" />
          <div className="grid gap-4 md:grid-cols-3">
            <EmptyState
              action={<Button>Criar treino</Button>}
              description="Seu primeiro treino começa aqui."
              icon={<Dumbbell />}
              title="Nenhum treino criado"
            />
            <ErrorState
              description="Seus dados continuam salvos."
              title="Não conseguimos carregar seus treinos."
              onRetry={() => undefined}
            />
            <LoadingState label="Carregando exemplo" lines={3} />
          </div>
          <div className="flex flex-wrap gap-3">
            <ToastDemo />
            <Dialog
              description="Esta ação não pode ser desfeita."
              title="Excluir treino?"
              trigger={<Button variant="secondary">Abrir diálogo</Button>}
            >
              <div className="flex justify-end gap-2">
                <Button variant="secondary">Cancelar</Button>
                <Button variant="danger">Excluir</Button>
              </div>
            </Dialog>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Abrir bottom sheet
            </Button>
          </div>
          <Disclosure icon={<Mail />} summary="Revelação progressiva">
            <p className="text-wt-body-sm text-wt-text-secondary-strong">
              Conteúdo secundário fica aqui até a pessoa pedir.
            </p>
          </Disclosure>
        </Section>

        <Section title="Métricas">
          <Card className="p-5">
            <MetricGrid className="grid-cols-2 sm:grid-cols-4">
              <Metric context="de 5 planejados" label="Treinos" value={4} />
              <Metric label="Tempo total" value="3h42" />
              <Metric icon={<TrendingUp />} label="Volume" unit="kg" value="32.450" />
              <Metric label="Séries" value={127} />
            </MetricGrid>
          </Card>
          <div className="flex items-center gap-3">
            <Avatar name="Willy Henrique" />
            <Avatar name="Pedro" size="sm" />
            <Avatar name="Joana Lima" size="lg" />
          </div>
        </Section>

        <Section title="Treino (exemplos com dados fictícios)">
          <div className="grid gap-6 lg:grid-cols-2">
            <RestTimer
              elapsedSeconds={33}
              nextLabel="série 2 de 3 · Supino reto com barra"
              remainingSeconds={57}
              onAdjust={() => undefined}
              onSkip={() => undefined}
            />
            <Card as="div" className="p-2">
              <ExerciseQueue activeIndex={1} queue={sampleQueue} />
            </Card>
          </div>
          <div className="max-w-2xl">
            <WorkoutCompletion
              cardioCompleted={false}
              message="Treino finalizado sem cardio. Estatística semanal atualizada."
              overview={{
                completedExercises: 6,
                completedSets: 18,
                durationSeconds: 2880,
                estimatedMinutes: 45,
                exerciseCount: 6,
                status: "completed",
                title: "Treino de força",
                totalReps: 176,
                totalSets: 18,
                totalVolumeKg: 23450,
              }}
              recoveryFeedback=""
              onRecoveryFeedbackChange={() => undefined}
            />
          </div>
        </Section>

        <Sheet
          description="No celular abre de baixo; no desktop, centralizado."
          open={sheetOpen}
          title="Bottom sheet"
          onOpenChange={setSheetOpen}
        >
          <p className="text-wt-body-sm text-wt-text-secondary-strong">
            Ações contextuais: editar série, filtros, sequência do treino.
          </p>
        </Sheet>
      </main>
    </ToastProvider>
  );
}
