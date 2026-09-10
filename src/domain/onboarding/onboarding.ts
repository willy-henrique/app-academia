import { z } from "zod";

export const onboardingGoalOptions = [
  "ganhar_massa",
  "perder_peso",
  "forca",
  "condicionamento",
  "recomposicao",
  "mobilidade",
  "resistencia",
  "saude",
  "voltar_a_treinar",
  "habito",
  "performance",
  "outro",
] as const;

export const onboardingExperienceOptions = [
  "iniciante",
  "intermediario",
  "avancado",
  "retornando",
  "nunca_treinei",
] as const;

export const onboardingCardioOptions = ["optional", "recommended", "program_required"] as const;

export const onboardingStepIds = [
  "presentation",
  "goal",
  "physical_profile",
  "experience",
  "routine",
  "location",
  "equipment",
  "accessibility",
  "functional_abilities",
  "safety",
  "cardio",
  "group_training",
  "nutrition_budget",
  "summary",
] as const;

export type OnboardingStepId = (typeof onboardingStepIds)[number];

export const accessibilityNeedOptions = [
  "mobilidade_reduzida",
  "cadeira_de_rodas",
  "dificuldade_em_pe",
  "amputacao",
  "proteses",
  "limite_membro_superior",
  "limite_membro_inferior",
  "equilibrio",
  "coordenacao",
  "baixa_visao",
  "cegueira",
  "perda_auditiva",
  "surdez",
  "instrucao_simplificada",
  "outra",
] as const;

export type OnboardingGoal = (typeof onboardingGoalOptions)[number];
export type OnboardingExperience = (typeof onboardingExperienceOptions)[number];
export type OnboardingCardioPreference = (typeof onboardingCardioOptions)[number];
export type AccessibilityNeed = (typeof accessibilityNeedOptions)[number];

/**
 * Rótulos legíveis para cada opção. Ficam ao lado do enum de propósito: os
 * `Record` completos fazem o TypeScript recusar um valor novo sem tradução,
 * em vez de deixar o identificador cru ("ganhar_massa") aparecer na tela.
 */
export const onboardingGoalLabels: Record<OnboardingGoal, string> = {
  ganhar_massa: "Ganhar massa muscular",
  perder_peso: "Perder peso",
  forca: "Ficar mais forte",
  condicionamento: "Melhorar o condicionamento",
  recomposicao: "Recomposição corporal",
  mobilidade: "Ganhar mobilidade",
  resistencia: "Aumentar a resistência",
  saude: "Cuidar da saúde",
  voltar_a_treinar: "Voltar a treinar",
  habito: "Criar o hábito de treinar",
  performance: "Performance esportiva",
  outro: "Outro objetivo",
};

/** Uma linha por objetivo: o cartão explica o que muda no plano. */
export const onboardingGoalDescriptions: Record<OnboardingGoal, string> = {
  ganhar_massa: "Mais volume por grupo muscular.",
  perder_peso: "Gasto calórico com força preservada.",
  forca: "Cargas maiores, menos repetições.",
  condicionamento: "Menos descanso, mais ritmo.",
  recomposicao: "Ganhar músculo e perder gordura junto.",
  mobilidade: "Amplitude e controle de movimento.",
  resistencia: "Séries longas e aguentar mais.",
  saude: "Constância acima de intensidade.",
  voltar_a_treinar: "Retomada gradual, sem estourar.",
  habito: "Sessões curtas e fáceis de manter.",
  performance: "Treino a serviço do seu esporte.",
  outro: "Você detalha na próxima etapa.",
};

export const onboardingExperienceDescriptions: Record<OnboardingExperience, string> = {
  iniciante: "Menos de 6 meses de treino.",
  intermediario: "Treina com regularidade há mais de um ano.",
  avancado: "Anos de treino e domínio da técnica.",
  retornando: "Já treinou antes e parou por um tempo.",
  nunca_treinei: "Começando do zero, com calma.",
};

export const onboardingExperienceLabels: Record<OnboardingExperience, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
  retornando: "Estou retornando depois de uma pausa",
  nunca_treinei: "Nunca treinei",
};

export const onboardingCardioLabels: Record<OnboardingCardioPreference, string> = {
  optional: "Opcional — faço se der vontade",
  recommended: "Recomendado — quero ser lembrado",
  program_required: "Faz parte do programa",
};

export const accessibilityNeedLabels: Record<AccessibilityNeed, string> = {
  mobilidade_reduzida: "Mobilidade reduzida",
  cadeira_de_rodas: "Uso cadeira de rodas",
  dificuldade_em_pe: "Dificuldade para ficar em pé",
  amputacao: "Amputação",
  proteses: "Uso prótese",
  limite_membro_superior: "Limitação em membro superior",
  limite_membro_inferior: "Limitação em membro inferior",
  equilibrio: "Equilíbrio",
  coordenacao: "Coordenação",
  baixa_visao: "Baixa visão",
  cegueira: "Cegueira",
  perda_auditiva: "Perda auditiva",
  surdez: "Surdez",
  instrucao_simplificada: "Prefiro instruções simplificadas",
  outra: "Outra",
};

/** Como `toSelectOptions`, mas levando a descrição de cada cartão junto. */
export function toCardOptions<Value extends string>(
  values: readonly Value[],
  labels: Record<Value, string>,
  descriptions: Record<Value, string>,
): readonly { description: string; label: string; value: Value }[] {
  return values.map((value) => ({
    description: descriptions[value],
    label: labels[value],
    value,
  }));
}

/**
 * O fuso é usado para fechar a semana no lugar certo (o painel mostra "semana
 * de …" e a adesão semanal). É dado do ambiente, não uma pergunta: digitar
 * "America/Sao_Paulo" à mão só cria erro de digitação.
 */
export function detectTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * "America/Sao_Paulo" é identificador de sistema, não texto de interface.
 * Mostra a cidade com o deslocamento — "Sao Paulo (GMT-3)" — para a pessoa
 * conseguir conferir num relance se o fuso detectado é o dela.
 */
export function formatTimezoneLabel(timezone: string | null): string {
  if (!timezone) {
    return "não identificado";
  }

  const city = timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;

  try {
    const offset = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;

    return offset ? `${city} (${offset})` : city;
  } catch {
    return city;
  }
}

/** Monta as opções de um `Select` a partir do enum e dos seus rótulos. */
export function toSelectOptions<Value extends string>(
  values: readonly Value[],
  labels: Record<Value, string>,
): readonly { label: string; value: Value }[] {
  return values.map((value) => ({ label: labels[value], value }));
}

export const onboardingDraftSchema = z.object({
  accessibility: z
    .object({
      needAcknowledgement: z
        .enum(["no", "yes", "prefer_not_to_answer"])
        .default("prefer_not_to_answer"),
      needs: z.array(z.enum(accessibilityNeedOptions)).default([]),
    })
    .default({
      needAcknowledgement: "prefer_not_to_answer",
      needs: [],
    }),
  cardioPreference: z.enum(onboardingCardioOptions).default("optional"),
  completedStepIds: z.array(z.enum(onboardingStepIds)).default([]),
  currentStepId: z.enum(onboardingStepIds).default("presentation"),
  equipment: z.array(z.string().trim().min(1).max(100)).default([]),
  functionalAbilities: z
    .object({
      comfortableMovements: z.string().trim().max(2000).optional(),
      difficultMovements: z.string().trim().max(2000).optional(),
      preferredAvoidances: z.string().trim().max(2000).optional(),
      professionalGuidance: z.string().trim().max(2000).optional(),
      supportAvailable: z.string().trim().max(2000).optional(),
    })
    .default({}),
  goal: z.enum(onboardingGoalOptions).nullable().default(null),
  experience: z.enum(onboardingExperienceOptions).nullable().default(null),
  groupTrainingPreference: z
    .enum(["alone", "with_someone", "prefer_not_to_answer"])
    .default("prefer_not_to_answer"),
  location: z.string().trim().max(200).nullable().default(null),
  nutritionBudgetCents: z.number().int().nonnegative().nullable().default(null),
  physicalProfile: z
    .object({
      heightCm: z.number().int().positive().nullable().default(null),
      weightKg: z.number().positive().nullable().default(null),
    })
    .default({
      heightCm: null,
      weightKg: null,
    }),
  presentationAcknowledged: z.boolean().default(false),
  routine: z
    .object({
      daysPerWeek: z.number().int().min(0).max(7).nullable().default(null),
      sessionMinutes: z.number().int().min(5).max(240).nullable().default(null),
    })
    .default({
      daysPerWeek: null,
      sessionMinutes: null,
    }),
  safetyNotes: z.string().trim().max(2000).optional(),
  summaryAcknowledged: z.boolean().default(false),
  trainingObjective: z.string().trim().max(200).optional(),
  timezone: z.string().trim().min(1).max(64).nullable().default(null),
  updatedAt: z.unknown().optional(),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export function createDefaultOnboardingDraft(): OnboardingDraft {
  return onboardingDraftSchema.parse({
    accessibility: {
      needAcknowledgement: "prefer_not_to_answer",
      needs: [],
    },
    cardioPreference: "optional",
    completedStepIds: [],
    currentStepId: "presentation",
    equipment: [],
    functionalAbilities: {},
    goal: null,
    experience: null,
    groupTrainingPreference: "prefer_not_to_answer",
    location: null,
    nutritionBudgetCents: null,
    physicalProfile: {
      heightCm: null,
      weightKg: null,
    },
    presentationAcknowledged: false,
    routine: {
      daysPerWeek: null,
      sessionMinutes: null,
    },
    safetyNotes: "",
    summaryAcknowledged: false,
    trainingObjective: "",
    timezone: null,
  });
}
