import { z } from "zod";

import type { Exercise } from "./exercise";

export const workoutGoalOptions = [
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

export const workoutExperienceOptions = [
  "iniciante",
  "intermediario",
  "avancado",
  "retornando",
  "nunca_treinei",
] as const;

export const workoutCardioStatusOptions = ["optional", "recommended", "program_required"] as const;

export const workoutStationModeOptions = [
  "rotation_shared_station",
  "parallel_same_exercise",
  "independent_stations",
] as const;

export const workoutPlanStatusOptions = ["draft", "published", "archived"] as const;

export const workoutBlockKindOptions = [
  "warmup",
  "strength",
  "accessory",
  "cardio",
  "cooldown",
] as const;

export const workoutCompatibilityStatusOptions = [
  "compatible",
  "adaptation_required",
  "review_required",
  "not_recommended",
] as const;

export const workoutCompatibilityReasonCodeOptions = [
  "movement_restricted",
  "equipment_missing",
  "experience_gap",
  "functional_review",
  "accessibility_support",
  "recovery_limit",
] as const;

const workoutPrescriptionSchema = z.object({
  exerciseId: z.string().trim().min(1).max(120),
  exerciseName: z.string().trim().min(1).max(140),
  loadStrategy: z.enum(["last_used", "manual", "estimated"]).default("last_used"),
  notes: z.string().trim().max(500).nullable().default(null),
  repsMax: z.number().int().positive(),
  repsMin: z.number().int().positive(),
  restSeconds: z.number().int().positive(),
  rirTarget: z.number().int().min(0).max(10).nullable().default(null),
  sets: z.number().int().positive(),
});

export const workoutBlockSchema = z.object({
  id: z.string().trim().min(1).max(120),
  kind: z.enum(workoutBlockKindOptions),
  order: z.number().int().nonnegative(),
  prescriptions: z.array(workoutPrescriptionSchema).default([]),
  title: z.string().trim().min(1).max(140),
});

export const workoutPlanVersionSchema = z.object({
  activeParticipantCount: z.number().int().positive().default(1),
  basedOnVersionId: z.string().trim().min(1).max(120).nullable().default(null),
  blocks: z.array(workoutBlockSchema).min(1),
  cardioSeconds: z.number().int().nonnegative().default(0),
  cardioStatus: z.enum(workoutCardioStatusOptions).default("optional"),
  createdAt: z.unknown().optional(),
  durationSeconds: z.number().int().positive(),
  generatedBy: z.literal("deterministic").default("deterministic"),
  id: z.string().trim().min(1).max(120),
  planId: z.string().trim().min(1).max(120),
  stationMode: z.enum(workoutStationModeOptions).default("independent_stations"),
  sourceExerciseIds: z.array(z.string().trim().min(1).max(120)).min(1),
  summary: z.string().trim().min(1).max(500),
  versionNumber: z.number().int().positive(),
});

export const workoutPlanSchema = z.object({
  activeVersionId: z.string().trim().min(1).max(120),
  createdAt: z.unknown().optional(),
  experience: z.enum(workoutExperienceOptions).nullable().default(null),
  goal: z.enum(workoutGoalOptions),
  id: z.string().trim().min(1).max(120),
  ownerUid: z.string().trim().min(1).max(120),
  status: z.enum(workoutPlanStatusOptions).default("draft"),
  updatedAt: z.unknown().optional(),
  versions: z.array(workoutPlanVersionSchema).min(1),
});

export type WorkoutGoal = (typeof workoutGoalOptions)[number];
export type WorkoutExperience = (typeof workoutExperienceOptions)[number];
export type WorkoutCardioStatus = (typeof workoutCardioStatusOptions)[number];
export type WorkoutStationMode = (typeof workoutStationModeOptions)[number];
export type WorkoutPlanStatus = (typeof workoutPlanStatusOptions)[number];
export type WorkoutBlockKind = (typeof workoutBlockKindOptions)[number];
export type WorkoutCompatibilityStatus = (typeof workoutCompatibilityStatusOptions)[number];
export type WorkoutCompatibilityReasonCode = (typeof workoutCompatibilityReasonCodeOptions)[number];

export type WorkoutPrescription = z.infer<typeof workoutPrescriptionSchema>;
export type WorkoutBlock = z.infer<typeof workoutBlockSchema>;
export type WorkoutPlanVersion = z.infer<typeof workoutPlanVersionSchema>;
export type WorkoutPlan = z.infer<typeof workoutPlanSchema>;

export interface ExerciseCompatibilityInput {
  accessibilityNeeds?: readonly string[];
  experienceLevel: WorkoutExperience | null;
  exercise: Exercise;
  functionalChallenges?: string | null;
  movementRestrictions?: readonly string[];
  availableEquipment?: readonly string[];
  avoidExercises?: readonly string[];
}

export interface WorkoutDurationInput {
  cardioSeconds?: number;
  cooldownSeconds?: number;
  exercises: readonly WorkoutPrescription[];
  equipmentTransitionSeconds?: number;
  participantCount?: number;
  stationMode?: WorkoutStationMode;
  warmupSeconds?: number;
  weightChangeSeconds?: number;
}

export interface WorkoutGeneratorInput {
  accessibilityNeeds?: readonly string[];
  availableEquipment: readonly string[];
  availableMinutes: number;
  cardioStatus?: WorkoutCardioStatus;
  experience: WorkoutExperience | null;
  functionalChallenges?: string | null;
  goal: WorkoutGoal;
  movementRestrictions?: readonly string[];
  ownerUid: string;
  participantCount?: number;
  stationMode?: WorkoutStationMode;
}

export interface WorkoutCompatibilityResult {
  operationalAdaptation?: string;
  reasonCodes: readonly WorkoutCompatibilityReasonCode[];
  status: WorkoutCompatibilityStatus;
}

export interface WorkoutDurationBreakdown {
  cardioSeconds: number;
  cooldownSeconds: number;
  effectiveRestSeconds: number;
  totalSeconds: number;
  transitionSeconds: number;
  warmupSeconds: number;
  workSeconds: number;
}

export interface WorkoutValidationResult {
  issues: readonly string[];
  valid: boolean;
}

function sanitizePlanIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function experienceRank(experience: WorkoutExperience | null): number {
  switch (experience) {
    case "nunca_treinei":
      return 0;
    case "iniciante":
      return 1;
    case "retornando":
      return 1;
    case "intermediario":
      return 2;
    case "avancado":
      return 3;
    case null:
      return 1;
  }
}

function exerciseExperienceRank(experience: Exercise["experienceLevel"]): number {
  switch (experience) {
    case "beginner":
      return 1;
    case "all_levels":
      return 1;
    case "intermediate":
      return 2;
    case "advanced":
      return 3;
  }
}

function goalMatches(goal: WorkoutGoal, exercise: Exercise): number {
  if (goal === "ganhar_massa" || goal === "forca" || goal === "performance") {
    return ["push_horizontal", "pull_horizontal", "squat", "hinge"].includes(
      exercise.movementPattern,
    )
      ? 30
      : 0;
  }

  if (goal === "condicionamento" || goal === "perder_peso" || goal === "resistencia") {
    return ["squat", "pull_horizontal", "conditioning", "locomotion"].includes(
      exercise.movementPattern,
    )
      ? 25
      : 10;
  }

  if (goal === "mobilidade") {
    return exercise.movementPattern === "mobility" ? 40 : 5;
  }

  if (goal === "voltar_a_treinar" || goal === "habito" || goal === "saude") {
    return exercise.experienceLevel === "beginner" || exercise.experienceLevel === "all_levels"
      ? 25
      : 10;
  }

  return 10;
}

function buildPrescription(
  exercise: Exercise,
  sets: number,
  repsMin: number,
  repsMax: number,
): WorkoutPrescription {
  return workoutPrescriptionSchema.parse({
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    loadStrategy: "last_used",
    notes: null,
    repsMax,
    repsMin,
    restSeconds: exercise.defaultRestMin,
    rirTarget: 2,
    sets,
  });
}

export function evaluateExerciseCompatibility(
  input: ExerciseCompatibilityInput,
): WorkoutCompatibilityResult {
  const reasonCodes: WorkoutCompatibilityReasonCode[] = [];
  const lowerAvailableEquipment = new Set(
    (input.availableEquipment ?? []).map((item) => item.toLowerCase()),
  );
  const lowerAvoidExercises = new Set(
    (input.avoidExercises ?? []).map((item) => item.toLowerCase()),
  );

  const exerciseEquipmentMissing = input.exercise.equipment.some(
    (equipment) => !lowerAvailableEquipment.has(equipment.toLowerCase()),
  );

  if (
    lowerAvoidExercises.has(input.exercise.id.toLowerCase()) ||
    lowerAvoidExercises.has(input.exercise.slug.toLowerCase())
  ) {
    return {
      reasonCodes: ["movement_restricted"],
      status: "not_recommended",
      operationalAdaptation: "Substitua por uma alternativa compatível.",
    };
  }

  if ((input.movementRestrictions ?? []).includes(input.exercise.movementPattern)) {
    reasonCodes.push("movement_restricted");
  }

  if (exerciseEquipmentMissing && input.exercise.equipment.length > 0) {
    reasonCodes.push("equipment_missing");
  }

  if ((input.accessibilityNeeds ?? []).length > 0) {
    reasonCodes.push("accessibility_support");
  }

  if (input.functionalChallenges?.trim()) {
    reasonCodes.push("functional_review");
  }

  const requestedExperienceRank = experienceRank(input.experienceLevel);
  const exerciseRank = exerciseExperienceRank(input.exercise.experienceLevel);
  if (requestedExperienceRank < exerciseRank) {
    reasonCodes.push("experience_gap");
  }

  const uniqueReasonCodes = [...new Set(reasonCodes)];
  if (uniqueReasonCodes.includes("movement_restricted")) {
    return {
      reasonCodes: uniqueReasonCodes,
      status: "not_recommended",
      operationalAdaptation: "Troque por regressão ou movimento equivalente com menos risco.",
    };
  }

  if (uniqueReasonCodes.includes("equipment_missing")) {
    return {
      reasonCodes: uniqueReasonCodes,
      status: "adaptation_required",
      operationalAdaptation: "Use equipamento disponível ou variação sem esse implemento.",
    };
  }

  if (
    uniqueReasonCodes.includes("accessibility_support") ||
    uniqueReasonCodes.includes("functional_review")
  ) {
    return {
      reasonCodes: uniqueReasonCodes,
      status: "adaptation_required",
      operationalAdaptation:
        "Use versão adaptada ou apoio estável, mantendo o resultado operacional.",
    };
  }

  if (uniqueReasonCodes.includes("experience_gap")) {
    return {
      reasonCodes: uniqueReasonCodes,
      status: "review_required",
      operationalAdaptation: "Mantenha a versão mais simples e confirme a progressão depois.",
    };
  }

  return {
    reasonCodes: [],
    status: "compatible",
  };
}

export function estimateWorkoutDuration(input: WorkoutDurationInput): WorkoutDurationBreakdown {
  const participantCount = Math.max(1, input.participantCount ?? 1);
  const stationMode = input.stationMode ?? "independent_stations";
  const warmupSeconds = Math.max(0, input.warmupSeconds ?? 180);
  const cooldownSeconds = Math.max(0, input.cooldownSeconds ?? 120);
  const equipmentTransitionSeconds = Math.max(0, input.equipmentTransitionSeconds ?? 20);
  const weightChangeSeconds = Math.max(0, input.weightChangeSeconds ?? 15);

  let workSeconds = warmupSeconds + cooldownSeconds;
  let effectiveRestSeconds = 0;
  let transitionSeconds = 0;

  for (const prescription of input.exercises) {
    const sharedRecoverySeconds =
      participantCount > 1 && stationMode === "rotation_shared_station"
        ? Math.min(
            prescription.restSeconds,
            (participantCount - 1) *
              (prescription.restSeconds + equipmentTransitionSeconds + weightChangeSeconds) *
              0.5,
          )
        : participantCount > 1 && stationMode === "parallel_same_exercise"
          ? Math.min(
              prescription.restSeconds,
              (participantCount - 1) * prescription.restSeconds * 0.25,
            )
          : 0;

    const prescriptionRestSeconds = Math.max(0, prescription.restSeconds - sharedRecoverySeconds);
    const prescriptionTransitionSeconds =
      participantCount > 1 && stationMode === "rotation_shared_station"
        ? equipmentTransitionSeconds + weightChangeSeconds
        : participantCount > 1 && stationMode === "parallel_same_exercise"
          ? weightChangeSeconds
          : 0;

    workSeconds += prescription.sets * prescription.repsMax * 2;
    effectiveRestSeconds += prescription.sets * prescriptionRestSeconds;
    transitionSeconds += prescription.sets * prescriptionTransitionSeconds;
  }

  const cardioSeconds = Math.max(0, input.cardioSeconds ?? 0);
  const totalSeconds = workSeconds + effectiveRestSeconds + transitionSeconds + cardioSeconds;

  return {
    cardioSeconds,
    cooldownSeconds,
    effectiveRestSeconds,
    totalSeconds,
    transitionSeconds,
    warmupSeconds,
    workSeconds,
  };
}

export function generateWorkoutPlan(
  input: WorkoutGeneratorInput,
  catalog: readonly Exercise[],
): WorkoutPlan {
  const availableSeconds = Math.max(0, input.availableMinutes * 60);
  const targetExerciseCount =
    input.availableMinutes <= 20 ? 2 : input.availableMinutes <= 35 ? 2 : 3;
  const cardioSeconds =
    input.cardioStatus === "program_required"
      ? Math.min(600, Math.max(0, availableSeconds * 0.15))
      : input.cardioStatus === "recommended"
        ? Math.min(300, Math.max(0, availableSeconds * 0.1))
        : 0;

  const scoredExercises = catalog
    .map((exercise) => {
      const compatibility = evaluateExerciseCompatibility({
        accessibilityNeeds: input.accessibilityNeeds,
        availableEquipment: input.availableEquipment,
        experienceLevel: input.experience,
        exercise,
        functionalChallenges: input.functionalChallenges,
        movementRestrictions: input.movementRestrictions,
      });

      const compatibilityScore =
        compatibility.status === "compatible"
          ? 100
          : compatibility.status === "adaptation_required"
            ? 75
            : compatibility.status === "review_required"
              ? 50
              : -1000;

      const experienceScore = input.experience
        ? 15 -
          Math.abs(
            experienceRank(input.experience) - exerciseExperienceRank(exercise.experienceLevel),
          ) *
            4
        : 8;
      const goalScore = goalMatches(input.goal, exercise);
      const equipmentScore = exercise.equipment.every((item) =>
        input.availableEquipment.includes(item),
      )
        ? 10
        : 0;

      return {
        compatibility,
        exercise,
        score: compatibilityScore + experienceScore + goalScore + equipmentScore,
      };
    })
    .filter((entry) => entry.score > -1000)
    .sort((left, right) => right.score - left.score);

  const selectedExercises = scoredExercises
    .slice(0, targetExerciseCount)
    .map((entry) => entry.exercise);
  const setCount =
    input.availableMinutes <= 20
      ? 2
      : input.experience === "iniciante" || input.experience === "nunca_treinei"
        ? 2
        : 3;
  const repsMin = input.goal === "forca" ? 5 : input.goal === "mobilidade" ? 8 : 8;
  const repsMax =
    input.goal === "forca"
      ? 8
      : input.goal === "mobilidade"
        ? 10
        : input.goal === "condicionamento"
          ? 15
          : 12;

  const prescriptions = selectedExercises.map((exercise) =>
    buildPrescription(exercise, setCount, repsMin, repsMax),
  );
  const strengthDuration = estimateWorkoutDuration({
    cardioSeconds,
    exercises: prescriptions,
    participantCount: input.participantCount,
    stationMode: input.stationMode,
  });

  const planId = `plan-${sanitizePlanIdPart(input.ownerUid)}-${sanitizePlanIdPart(input.goal)}-${input.availableMinutes}`;
  const versionId = "v1";

  const version = workoutPlanVersionSchema.parse({
    activeParticipantCount: Math.max(1, input.participantCount ?? 1),
    basedOnVersionId: null,
    blocks: [
      workoutBlockSchema.parse({
        id: "strength-main",
        kind: "strength",
        order: 1,
        prescriptions,
        title: "Bloco principal",
      }),
    ],
    cardioSeconds,
    cardioStatus: input.cardioStatus ?? "optional",
    durationSeconds: strengthDuration.totalSeconds,
    generatedBy: "deterministic",
    id: versionId,
    planId,
    stationMode: input.stationMode ?? "independent_stations",
    sourceExerciseIds: selectedExercises.map((exercise) => exercise.id),
    summary: `Plano ${input.goal} com ${selectedExercises.length} exercícios para ${input.availableMinutes} minutos.`,
    versionNumber: 1,
  });

  return workoutPlanSchema.parse({
    activeVersionId: version.id,
    goal: input.goal,
    id: planId,
    ownerUid: input.ownerUid,
    status: "draft",
    versions: [version],
  });
}

export function validateWorkoutPlan(plan: WorkoutPlan): WorkoutValidationResult {
  const issues: string[] = [];
  const parsedPlan = workoutPlanSchema.safeParse(plan);

  if (!parsedPlan.success) {
    issues.push(...parsedPlan.error.issues.map((issue) => issue.message));
    return {
      issues,
      valid: false,
    };
  }

  const activeVersion = parsedPlan.data.versions.find(
    (version) => version.id === parsedPlan.data.activeVersionId,
  );
  if (!activeVersion) {
    issues.push("Versão ativa não encontrada no plano.");
  }

  const versionIds = new Set<string>();
  let expectedVersionNumber = 1;

  for (const version of parsedPlan.data.versions) {
    if (versionIds.has(version.id)) {
      issues.push(`Versão duplicada: ${version.id}`);
    }
    versionIds.add(version.id);

    if (version.versionNumber !== expectedVersionNumber) {
      issues.push(`Numeração de versão fora de ordem em ${version.id}`);
    }
    expectedVersionNumber += 1;

    const duration = estimateWorkoutDuration({
      cardioSeconds: version.cardioSeconds,
      cooldownSeconds: 120,
      exercises: version.blocks.flatMap((block) => block.prescriptions),
      participantCount: version.activeParticipantCount,
      stationMode: version.stationMode,
      warmupSeconds: 180,
    });

    if (duration.totalSeconds !== version.durationSeconds) {
      issues.push(`Duração inconsistente na versão ${version.id}`);
    }

    for (const block of version.blocks) {
      if (block.kind === "cardio") {
        issues.push("O plano base ainda não deve criar bloco cardio separado.");
      }

      for (const prescription of block.prescriptions) {
        if (prescription.repsMin > prescription.repsMax) {
          issues.push(`Faixa de reps inválida em ${prescription.exerciseId}`);
        }
      }
    }
  }

  return {
    issues,
    valid: issues.length === 0,
  };
}

export function appendWorkoutPlanVersion(
  plan: WorkoutPlan,
  nextVersion: Omit<
    WorkoutPlanVersion,
    "basedOnVersionId" | "generatedBy" | "id" | "versionNumber"
  > &
    Partial<Pick<WorkoutPlanVersion, "basedOnVersionId" | "generatedBy" | "id">>,
): WorkoutPlan {
  const lastVersion = plan.versions[plan.versions.length - 1];
  const versionId = nextVersion.id ?? `v${lastVersion.versionNumber + 1}`;
  const versionNumber = lastVersion.versionNumber + 1;

  const parsedVersion = workoutPlanVersionSchema.parse({
    ...nextVersion,
    basedOnVersionId: nextVersion.basedOnVersionId ?? lastVersion.id,
    generatedBy: "deterministic",
    id: versionId,
    planId: plan.id,
    versionNumber,
  });

  return workoutPlanSchema.parse({
    ...plan,
    activeVersionId: parsedVersion.id,
    status: "published",
    versions: [...plan.versions, parsedVersion],
  });
}
