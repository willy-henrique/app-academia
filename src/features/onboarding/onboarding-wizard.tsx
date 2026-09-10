"use client";

import { ArrowLeft, Check, CircleCheck, Clock3, CloudOff, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { LiveRegion } from "@/components/accessibility/live-region";
import { Button } from "@/components/ui/button";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { OptionCards } from "@/components/ui/option-cards";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import {
  accessibilityNeedLabels,
  accessibilityNeedOptions,
  createDefaultOnboardingDraft,
  detectTimezone,
  formatTimezoneLabel,
  onboardingCardioLabels,
  onboardingCardioOptions,
  onboardingDraftSchema,
  onboardingExperienceDescriptions,
  onboardingExperienceLabels,
  onboardingExperienceOptions,
  onboardingGoalDescriptions,
  onboardingGoalLabels,
  onboardingGoalOptions,
  onboardingStepIds,
  toCardOptions,
  toSelectOptions,
  type AccessibilityNeed,
  type OnboardingDraft,
  type OnboardingStepId,
} from "@/domain/onboarding/onboarding";
import { equipmentOptions } from "@/domain/workout/exercise";
import { equipmentLabels, isKnownEquipment, type Equipment } from "@/features/workout/exercise-labels";

type OnboardingWizardProps = Readonly<{
  initialDraft?: OnboardingDraft;
  /** Chamado depois que o rascunho final foi salvo com sucesso. */
  onComplete?: () => void;
  saveDelayMs?: number;
  onSaveDraft: (draft: OnboardingDraft) => Promise<void>;
}>;

type OnboardingStepDefinition = Readonly<{
  description: string;
  id: OnboardingStepId;
  /** Nome curto da etapa (resumo e progresso). */
  label: string;
  /** A pergunta da etapa: uma por tela. */
  title: string;
}>;

const onboardingSteps: OnboardingStepDefinition[] = [
  {
    description: "Leva uns 3 minutos. Tudo é salvo sozinho e dá para mudar depois.",
    id: "presentation",
    label: "Boas-vindas",
    title: "Vamos montar seu treino",
  },
  {
    description: "Isso define o foco do plano. Dá para mudar depois, sem refazer tudo.",
    id: "goal",
    label: "Objetivo",
    title: "Qual é o seu objetivo principal?",
  },
  {
    description:
      "Ajudam a sugerir cargas iniciais. Não usamos IMC para decidir seu treino — e ninguém mais vê esses dados.",
    id: "physical_profile",
    label: "Altura e peso",
    title: "Altura e peso",
  },
  {
    description: "Ajusta a carga inicial e o ritmo de progressão.",
    id: "experience",
    label: "Experiência",
    title: "Qual é a sua experiência com treino?",
  },
  {
    description: "Seu plano cabe na sua semana, não o contrário.",
    id: "routine",
    label: "Rotina",
    title: "Quantos dias e quanto tempo você tem?",
  },
  {
    description: "Assim sugerimos exercícios que fazem sentido no seu espaço.",
    id: "location",
    label: "Local",
    title: "Onde você costuma treinar?",
  },
  {
    description: "Marque tudo o que você consegue usar. Sem nada? Peso do corpo resolve.",
    id: "equipment",
    label: "Equipamentos",
    title: "Quais equipamentos você tem à mão?",
  },
  {
    description:
      "Serve para filtrar exercícios e oferecer alternativas. Fica privado: parceiros de treino nunca veem.",
    id: "accessibility",
    label: "Adaptações",
    title: "Precisa de alguma adaptação?",
  },
  {
    description: "Opcional. Conte o que é confortável, difícil ou que você prefere evitar.",
    id: "functional_abilities",
    label: "Movimentos",
    title: "Como seu corpo responde aos movimentos?",
  },
  {
    description:
      "Opcional. Dores, alertas médicos ou limitações temporárias. O WillTreino não faz diagnóstico.",
    id: "safety",
    label: "Segurança",
    title: "Algum cuidado de segurança?",
  },
  {
    description: "Cardio é independente do treino de força: dá para pular sem quebrar o plano.",
    id: "cardio",
    label: "Cardio",
    title: "Como você quer lidar com cardio?",
  },
  {
    description: "Treinar acompanhado é opcional e cada pessoa mantém o próprio registro.",
    id: "group_training",
    label: "Companhia",
    title: "Você costuma treinar com alguém?",
  },
  {
    description: "Opcional. Usado só na área de Alimentação, para sugestões dentro do seu bolso.",
    id: "nutrition_budget",
    label: "Orçamento",
    title: "Quer registrar um orçamento para alimentação?",
  },
  {
    description: "Revise suas respostas. Você pode editar qualquer uma.",
    id: "summary",
    label: "Resumo",
    title: "Tudo certo?",
  },
];

const locationOptions = [
  { label: "Academia", value: "academia" },
  { label: "Em casa", value: "casa" },
  { label: "Academia e casa", value: "academia_e_casa" },
  { label: "Ao ar livre", value: "ar_livre" },
  { label: "Outro lugar", value: "outro" },
] as const;

const locationLabels: Record<string, string> = Object.fromEntries(
  locationOptions.map((option) => [option.value, option.label]),
);

const selectableEquipment = equipmentOptions.filter((value) => value !== "other");
const equipmentChips = selectableEquipment.map((value) => ({
  label: equipmentLabels[value],
  value,
}));
const accessibilityChips = accessibilityNeedOptions.map((value) => ({
  label: accessibilityNeedLabels[value],
  value,
}));

const goalCardOptions = toCardOptions(
  onboardingGoalOptions,
  onboardingGoalLabels,
  onboardingGoalDescriptions,
);
const experienceCardOptions = toCardOptions(
  onboardingExperienceOptions,
  onboardingExperienceLabels,
  onboardingExperienceDescriptions,
);
const cardioSelectOptions = toSelectOptions(onboardingCardioOptions, onboardingCardioLabels);

const accessibilityAcknowledgementOptions = [
  { label: "Não", value: "no" },
  { label: "Sim", value: "yes" },
  { label: "Prefiro não responder", value: "prefer_not_to_answer" },
] as const;

const groupTrainingSelectOptions = [
  { label: "Sozinho", value: "alone" },
  { label: "Com alguém", value: "with_someone" },
  { label: "Prefiro não responder", value: "prefer_not_to_answer" },
] as const;

const groupTrainingSummaryLabels: Record<string, string> = Object.fromEntries(
  groupTrainingSelectOptions.map((option) => [option.value, option.label]),
);

const dayOptions = ["1", "2", "3", "4", "5", "6", "7"].map((value) => ({ label: value, value }));

function clampStepIndex(stepId: OnboardingStepId): number {
  const index = onboardingStepIds.indexOf(stepId);
  return index < 0 ? 0 : index;
}

function getStepIdByIndex(index: number): OnboardingStepId {
  return onboardingStepIds[Math.min(Math.max(index, 0), onboardingStepIds.length - 1)];
}

function splitList(text: string): string[] {
  return text
    .split(/[\n,;]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatBudgetInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "";
  }

  const reais = cents / 100;
  return Number.isInteger(reais) ? String(reais) : reais.toFixed(2).replace(".", ",");
}

function parseBudgetToCents(text: string): number | null {
  const normalized = text.replace(/\./g, "").replace(",", ".").trim();
  if (!normalized) {
    return null;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(cents / 100);
}

type SummaryItem = Readonly<{ label: string; stepId: OnboardingStepId; value: string }>;

function buildSummary(draft: OnboardingDraft): SummaryItem[] {
  const notInformed = "Não informado";
  const knownEquipment = draft.equipment.filter(isKnownEquipment);
  const otherEquipment = draft.equipment.filter((item) => !isKnownEquipment(item));

  return [
    {
      label: "Objetivo",
      stepId: "goal",
      value: draft.goal ? onboardingGoalLabels[draft.goal] : notInformed,
    },
    {
      label: "Altura e peso",
      stepId: "physical_profile",
      value:
        [
          draft.physicalProfile.heightCm ? `${draft.physicalProfile.heightCm} cm` : null,
          draft.physicalProfile.weightKg ? `${draft.physicalProfile.weightKg} kg` : null,
        ]
          .filter(Boolean)
          .join(" · ") || notInformed,
    },
    {
      label: "Experiência",
      stepId: "experience",
      value: draft.experience ? onboardingExperienceLabels[draft.experience] : notInformed,
    },
    {
      label: "Rotina",
      stepId: "routine",
      value:
        [
          draft.routine.daysPerWeek ? `${draft.routine.daysPerWeek}× por semana` : null,
          draft.routine.sessionMinutes ? `${draft.routine.sessionMinutes} min por treino` : null,
        ]
          .filter(Boolean)
          .join(" · ") || notInformed,
    },
    {
      label: "Local",
      stepId: "location",
      value: draft.location ? (locationLabels[draft.location] ?? draft.location) : notInformed,
    },
    {
      label: "Equipamentos",
      stepId: "equipment",
      value:
        [...knownEquipment.map((item) => equipmentLabels[item]), ...otherEquipment].join(", ") ||
        "Peso do corpo",
    },
    {
      label: "Adaptações",
      stepId: "accessibility",
      value:
        draft.accessibility.needAcknowledgement === "yes"
          ? draft.accessibility.needs.map((need) => accessibilityNeedLabels[need]).join(", ") ||
            "Sim, sem detalhes"
          : draft.accessibility.needAcknowledgement === "no"
            ? "Nenhuma"
            : "Prefiro não responder",
    },
    {
      label: "Cardio",
      stepId: "cardio",
      value: onboardingCardioLabels[draft.cardioPreference],
    },
    {
      label: "Companhia",
      stepId: "group_training",
      value: groupTrainingSummaryLabels[draft.groupTrainingPreference] ?? notInformed,
    },
    {
      label: "Orçamento",
      stepId: "nutrition_budget",
      value:
        draft.nutritionBudgetCents !== null && Number.isFinite(draft.nutritionBudgetCents)
          ? `${formatCurrency(draft.nutritionBudgetCents)} por mês`
          : notInformed,
    },
  ];
}

export function OnboardingWizard({
  initialDraft = createDefaultOnboardingDraft(),
  onComplete,
  saveDelayMs = 450,
  onSaveDraft,
}: OnboardingWizardProps) {
  const { control, getValues, register, reset, setValue } = useForm<OnboardingDraft>({
    defaultValues: initialDraft,
    mode: "onChange",
  });
  const watchedDraft = useWatch({ control });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [saveAnnouncement, setSaveAnnouncement] = useState("Pronto para começar.");
  const [finishing, setFinishing] = useState(false);
  const [otherLocation, setOtherLocation] = useState(
    () =>
      Boolean(initialDraft.location) &&
      !locationOptions.some((option) => option.value === initialDraft.location),
  );
  const [otherEquipmentText, setOtherEquipmentText] = useState(() =>
    initialDraft.equipment.filter((item) => !isKnownEquipment(item)).join(", "),
  );
  const [budgetText, setBudgetText] = useState(() =>
    formatBudgetInput(initialDraft.nutritionBudgetCents),
  );
  const saveTimeout = useRef<number | undefined>(undefined);
  const hasHydratedRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStepRef = useRef<OnboardingStepId | null>(null);

  useEffect(() => {
    // O fuso entra aqui, já no cliente: no servidor `Intl` responde UTC e a
    // hidratação divergiria. Só preenche se o rascunho ainda não tiver um.
    reset({ ...initialDraft, timezone: initialDraft.timezone ?? detectTimezone() });
    hasHydratedRef.current = true;
  }, [initialDraft, reset]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    window.clearTimeout(saveTimeout.current);

    saveTimeout.current = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const parsedDraft = onboardingDraftSchema.parse(
          (watchedDraft ?? createDefaultOnboardingDraft()) as OnboardingDraft,
        );
        await onSaveDraft(parsedDraft);
        setSaveStatus("saved");
        setSaveAnnouncement("Rascunho sincronizado.");
      } catch {
        setSaveStatus("error");
        setSaveAnnouncement("Não foi possível salvar o rascunho agora.");
      } finally {
        setIsSaving(false);
      }
    }, saveDelayMs);

    return () => {
      window.clearTimeout(saveTimeout.current);
    };
  }, [onSaveDraft, saveDelayMs, watchedDraft]);

  const draft = (watchedDraft ?? initialDraft) as OnboardingDraft;
  const currentStepId = getValues("currentStepId");
  const currentStepIndex = clampStepIndex(currentStepId);
  const currentStep = onboardingSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === onboardingSteps.length - 1;
  const timezoneLabel = formatTimezoneLabel(getValues("timezone") ?? detectTimezone());
  const summary = useMemo(() => buildSummary(draft), [draft]);
  const knownEquipment = (draft.equipment ?? []).filter(isKnownEquipment);
  const selectedLocation = otherLocation ? "outro" : (draft.location ?? null);

  // Ao trocar de etapa, o foco vai para a nova pergunta: quem usa teclado ou
  // leitor de tela não fica "perdido" no botão que acabou de sumir.
  useEffect(() => {
    if (previousStepRef.current && previousStepRef.current !== currentStepId) {
      stepHeadingRef.current?.focus();
    }
    previousStepRef.current = currentStepId;
  }, [currentStepId]);

  function update<Path extends Parameters<typeof setValue>[0]>(
    path: Path,
    value: Parameters<typeof setValue<Path>>[1],
  ) {
    setValue(path, value, { shouldDirty: true, shouldTouch: true });
  }

  function markStepComplete(stepId: OnboardingStepId) {
    const completedStepIds = getValues("completedStepIds");
    if (!completedStepIds.includes(stepId)) {
      update("completedStepIds", [...completedStepIds, stepId]);
    }
  }

  function goToStep(targetIndex: number) {
    markStepComplete(getValues("currentStepId"));
    update("currentStepId", getStepIdByIndex(targetIndex));
  }

  function goNext() {
    if (currentStep.id === "presentation") {
      update("presentationAcknowledged", true);
    }
    goToStep(currentStepIndex + 1);
  }

  function goBack() {
    update("currentStepId", getStepIdByIndex(currentStepIndex - 1));
  }

  function setEquipment(known: readonly Equipment[], otherText: string) {
    update("equipment", [...known, ...splitList(otherText)]);
  }

  async function finish() {
    window.clearTimeout(saveTimeout.current);
    update("summaryAcknowledged", true);
    markStepComplete("summary");
    setFinishing(true);
    try {
      await onSaveDraft(onboardingDraftSchema.parse(getValues()));
      setSaveStatus("saved");
      setSaveAnnouncement("Perfil de treino salvo.");
      onComplete?.();
    } catch {
      setSaveStatus("error");
      setSaveAnnouncement("Não foi possível salvar agora. Suas respostas continuam aqui.");
    } finally {
      setFinishing(false);
    }
  }

  const saveIndicator = isSaving ? (
    <span className="text-wt-text-secondary-strong">Salvando…</span>
  ) : saveStatus === "saved" ? (
    <span className="inline-flex items-center gap-1 text-wt-success-text">
      <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      Salvo
    </span>
  ) : saveStatus === "error" ? (
    <span className="inline-flex items-center gap-1 text-wt-danger-text">
      <CloudOff aria-hidden="true" className="size-3.5" />
      Não sincronizado
    </span>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-[var(--wt-container-form)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-wt-label font-medium">
          <p className="text-wt-text-secondary-strong wt-tabular">
            Etapa {currentStepIndex + 1} de {onboardingSteps.length}
            <span className="sr-only"> · {currentStep.label}</span>
          </p>
          <div aria-hidden="true" className="text-xs font-semibold">
            {saveIndicator}
          </div>
        </div>
        <ProgressBar
          label="Progresso do onboarding"
          max={onboardingSteps.length}
          value={currentStepIndex + 1}
          valueText={`Etapa ${currentStepIndex + 1} de ${onboardingSteps.length}`}
        />
      </div>

      <LiveRegion>{saveAnnouncement}</LiveRegion>

      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) {
            void finish();
          } else {
            goNext();
          }
        }}
      >
        <section
          aria-labelledby="onboarding-step-title"
          className="wt-step-in space-y-6"
          key={currentStep.id}
        >
          <div className="space-y-2">
            {isFirstStep ? (
              <span
                aria-hidden="true"
                className="wt-brand-gradient mb-4 grid size-14 place-items-center rounded-wt-lg text-lg font-black text-wt-accent-foreground"
              >
                WT
              </span>
            ) : null}
            <h1
              className="wt-text-h1 outline-none"
              id="onboarding-step-title"
              ref={stepHeadingRef}
              tabIndex={-1}
            >
              {currentStep.title}
            </h1>
            <p className="text-wt-body-sm text-wt-text-secondary-strong sm:text-wt-body">
              {currentStep.description}
            </p>
          </div>

          {currentStep.id === "presentation" ? (
            <ul className="grid gap-3">
              {[
                { icon: Clock3, text: "Poucas perguntas, uma por vez." },
                { icon: CircleCheck, text: "Salva sozinho e continua de onde você parou." },
                {
                  icon: ShieldCheck,
                  text: "Dados de saúde e adaptações ficam privados por padrão.",
                },
              ].map(({ icon: Icon, text }) => (
                <li
                  className="flex items-center gap-3 rounded-wt-lg bg-wt-surface px-4 py-3 text-wt-body-sm shadow-[inset_0_0_0_1px_var(--wt-color-border)]"
                  key={text}
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-wt-accent-text" />
                  {text}
                </li>
              ))}
            </ul>
          ) : null}

          {currentStep.id === "goal" ? (
            <OptionCards label="Objetivo principal" options={goalCardOptions} {...register("goal")} />
          ) : null}

          {currentStep.id === "physical_profile" ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  autoComplete="off"
                  inputMode="numeric"
                  label="Altura"
                  min={50}
                  max={250}
                  type="number"
                  unit="cm"
                  {...register("physicalProfile.heightCm", { valueAsNumber: true })}
                />
                <Input
                  autoComplete="off"
                  inputMode="decimal"
                  label="Peso"
                  min={20}
                  max={400}
                  step="0.1"
                  type="number"
                  unit="kg"
                  {...register("physicalProfile.weightKg", { valueAsNumber: true })}
                />
              </div>
              <p className="wt-text-caption text-wt-text-secondary-strong">
                Fuso horário detectado: {timezoneLabel}. Serve só para fechar sua semana no
                horário certo.
              </p>
            </div>
          ) : null}

          {currentStep.id === "experience" ? (
            <OptionCards
              className="sm:grid-cols-1"
              label="Nível de experiência"
              options={experienceCardOptions}
              {...register("experience")}
            />
          ) : null}

          {currentStep.id === "routine" ? (
            <div className="grid gap-6">
              <SegmentedControl
                label="Dias de treino por semana"
                options={dayOptions}
                value={draft.routine?.daysPerWeek ? String(draft.routine.daysPerWeek) : null}
                onValueChange={(value) => update("routine.daysPerWeek", Number(value))}
              />
              <NumberStepper
                hint="Contando aquecimento. Dá para ajustar a qualquer momento."
                label="Minutos por treino"
                max={240}
                min={10}
                step={5}
                unit="min"
                value={draft.routine?.sessionMinutes ? String(draft.routine.sessionMinutes) : "45"}
                onValueChange={(value) => {
                  const minutes = Number.parseInt(value, 10);
                  update("routine.sessionMinutes", Number.isFinite(minutes) ? minutes : null);
                }}
              />
            </div>
          ) : null}

          {currentStep.id === "location" ? (
            <div className="grid gap-4">
              <OptionCards
                label="Onde você treina"
                name="location-choice"
                options={locationOptions}
                value={selectedLocation}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "outro") {
                    setOtherLocation(true);
                    update("location", "");
                  } else {
                    setOtherLocation(false);
                    update("location", value);
                  }
                }}
              />
              {otherLocation ? (
                <Input
                  label="Qual lugar?"
                  maxLength={200}
                  placeholder="Ex.: condomínio, clube, praça"
                  value={draft.location ?? ""}
                  onChange={(event) => update("location", event.target.value)}
                />
              ) : null}
            </div>
          ) : null}

          {currentStep.id === "equipment" ? (
            <div className="grid gap-5">
              <ChoiceChips
                label="Equipamentos disponíveis"
                options={equipmentChips}
                values={knownEquipment}
                onValuesChange={(values) => setEquipment(values, otherEquipmentText)}
              />
              <Input
                hint="Separe por vírgula."
                label="Outros equipamentos (opcional)"
                maxLength={300}
                value={otherEquipmentText}
                onChange={(event) => {
                  setOtherEquipmentText(event.target.value);
                  setEquipment(knownEquipment, event.target.value);
                }}
              />
            </div>
          ) : null}

          {currentStep.id === "accessibility" ? (
            <div className="grid gap-6">
              <OptionCards
                label="Precisa de alguma adaptação?"
                options={accessibilityAcknowledgementOptions}
                {...register("accessibility.needAcknowledgement")}
              />
              {draft.accessibility?.needAcknowledgement === "yes" ? (
                <ChoiceChips<AccessibilityNeed>
                  hint="Marque o que se aplica. Você pode mudar quando quiser."
                  label="O que devemos considerar?"
                  options={accessibilityChips}
                  values={(draft.accessibility.needs ?? []) as AccessibilityNeed[]}
                  onValuesChange={(values) => update("accessibility.needs", values)}
                />
              ) : null}
            </div>
          ) : null}

          {currentStep.id === "functional_abilities" ? (
            <div className="grid gap-4">
              <Textarea
                label="Movimentos confortáveis"
                maxLength={2000}
                placeholder="Ex.: empurrar sentado, caminhar"
                value={draft.functionalAbilities?.comfortableMovements ?? ""}
                onChange={(event) =>
                  update("functionalAbilities.comfortableMovements", event.target.value)
                }
              />
              <Textarea
                label="Movimentos difíceis"
                maxLength={2000}
                placeholder="Ex.: agachar fundo, levantar os braços acima da cabeça"
                value={draft.functionalAbilities?.difficultMovements ?? ""}
                onChange={(event) =>
                  update("functionalAbilities.difficultMovements", event.target.value)
                }
              />
              <Textarea
                label="Movimentos que prefere evitar"
                maxLength={2000}
                value={draft.functionalAbilities?.preferredAvoidances ?? ""}
                onChange={(event) =>
                  update("functionalAbilities.preferredAvoidances", event.target.value)
                }
              />
            </div>
          ) : null}

          {currentStep.id === "safety" ? (
            <Textarea
              label="Observações de segurança"
              maxLength={2000}
              placeholder="Ex.: dor no joelho esquerdo, liberado pelo médico com restrições"
              {...register("safetyNotes")}
            />
          ) : null}

          {currentStep.id === "cardio" ? (
            <OptionCards
              className="sm:grid-cols-1"
              label="Preferência de cardio"
              options={cardioSelectOptions}
              {...register("cardioPreference")}
            />
          ) : null}

          {currentStep.id === "group_training" ? (
            <OptionCards
              className="sm:grid-cols-1"
              label="Preferência de treino acompanhado"
              options={groupTrainingSelectOptions}
              {...register("groupTrainingPreference")}
            />
          ) : null}

          {currentStep.id === "nutrition_budget" ? (
            <Input
              autoComplete="off"
              hint="Valor aproximado por mês, em reais. Deixe em branco para pular."
              inputMode="decimal"
              label="Orçamento mensal"
              placeholder="0"
              unit="R$/mês"
              value={budgetText}
              onChange={(event) => {
                setBudgetText(event.target.value);
                update("nutritionBudgetCents", parseBudgetToCents(event.target.value));
              }}
            />
          ) : null}

          {currentStep.id === "summary" ? (
            <dl className="m-0 divide-y divide-wt-border rounded-wt-card border border-wt-border bg-wt-surface">
              {summary.map((item) => (
                <div className="flex items-center gap-3 px-4 py-3" key={item.stepId}>
                  <div className="min-w-0 flex-1">
                    <dt className="wt-text-caption font-semibold text-wt-text-secondary-strong">
                      {item.label}
                    </dt>
                    <dd className="m-0 text-wt-body-sm text-wt-text-primary">{item.value}</dd>
                  </div>
                  <Button
                    aria-label={`Editar ${item.label.toLocaleLowerCase("pt-BR")}`}
                    variant="ghost"
                    onClick={() => goToStep(clampStepIndex(item.stepId))}
                  >
                    Editar
                  </Button>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        {/* Ações ao alcance do polegar, acima da navegação inferior no celular. */}
        <div className="sticky bottom-[calc(var(--wt-mobile-nav-height)+env(safe-area-inset-bottom))] z-[var(--wt-z-sticky)] -mx-4 mt-8 flex gap-3 border-t border-wt-border bg-wt-background/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          {!isFirstStep ? (
            <Button size="large" variant="secondary" onClick={goBack}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </Button>
          ) : null}
          <Button
            className="flex-1 sm:flex-none sm:px-8"
            loading={finishing}
            loadingLabel="Salvando"
            size="large"
            type="submit"
          >
            {isFirstStep ? "Começar" : isLastStep ? "Concluir e ver meu treino" : "Próximo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
