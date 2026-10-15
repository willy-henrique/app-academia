import { createDefaultOnboardingDraft, type OnboardingDraft } from "@/domain/onboarding/onboarding";
import { seedExercises } from "@/domain/workout/exercise-seed";
import {
  createWorkoutSessionFromPlan,
  finishWorkoutSession,
  startWorkoutSession,
  type WorkoutSession,
} from "@/domain/workout/session";
import {
  generateWorkoutPlan,
  type WorkoutCardioStatus,
  type WorkoutExperience,
  type WorkoutGeneratorInput,
  type WorkoutGoal,
  type WorkoutStationMode,
  type WorkoutPlan,
} from "@/domain/workout/workout";
import type { WorkoutOptionalCardioStatus } from "@/domain/workout/session";

export type WorkoutInitResult = Readonly<{
  plan: WorkoutPlan;
  session: WorkoutSession;
}>;

function resolveGoal(goal: OnboardingDraft["goal"]): WorkoutGoal {
  return goal ?? "saude";
}

function resolveExperience(experience: OnboardingDraft["experience"]): WorkoutExperience {
  return experience ?? "intermediario";
}

function resolveCardioStatus(
  cardioPreference: OnboardingDraft["cardioPreference"],
): WorkoutCardioStatus {
  if (cardioPreference === "program_required") {
    return "program_required";
  }

  if (cardioPreference === "recommended") {
    return "recommended";
  }

  return "optional";
}

function resolveAvailableEquipment(draft: OnboardingDraft): string[] {
  return draft.equipment.length > 0 ? draft.equipment : ["bodyweight", "mat"];
}

export function buildWorkoutGeneratorInput(
  uid: string,
  draft: OnboardingDraft,
): WorkoutGeneratorInput {
  const normalizedDraft = draft ?? createDefaultOnboardingDraft();

  return {
    accessibilityNeeds:
      normalizedDraft.accessibility.needAcknowledgement === "yes"
        ? normalizedDraft.accessibility.needs
        : [],
    availableEquipment: resolveAvailableEquipment(normalizedDraft),
    availableMinutes: normalizedDraft.routine.sessionMinutes ?? 45,
    cardioStatus: resolveCardioStatus(normalizedDraft.cardioPreference),
    experience: resolveExperience(normalizedDraft.experience),
    functionalChallenges:
      normalizedDraft.functionalAbilities.comfortableMovements ||
      normalizedDraft.functionalAbilities.difficultMovements ||
      normalizedDraft.functionalAbilities.preferredAvoidances ||
      null,
    goal: resolveGoal(normalizedDraft.goal),
    movementRestrictions:
      normalizedDraft.accessibility.needAcknowledgement === "yes"
        ? normalizedDraft.accessibility.needs
        : [],
    ownerUid: uid,
    participantCount: 1,
    stationMode: "independent_stations",
  };
}

export function createWorkoutInit(uid: string, draft: OnboardingDraft): WorkoutInitResult {
  const input = buildWorkoutGeneratorInput(uid, draft);
  const plan = generateWorkoutPlan(input, seedExercises);
  const session = startWorkoutSession(
    createWorkoutSessionFromPlan(plan, `workout-${uid}-${plan.id}`),
    new Date(),
  );

  return { plan, session };
}

export function finishStrengthSession(
  session: WorkoutSession,
  cardioStatus: WorkoutOptionalCardioStatus,
) {
  return finishWorkoutSession(
    session,
    new Date(),
    cardioStatus === "COMPLETED" ? "COMPLETED" : "SKIPPED",
  );
}

export function getWorkoutStationMode(): WorkoutStationMode {
  return "independent_stations";
}

import type { AiWorkoutDietPlan } from "@/application/ai/coach-service";

export function createWorkoutSessionFromAiPlan(
  uid: string,
  aiPlan: AiWorkoutDietPlan,
  sessionId?: string,
  now: Date = new Date(),
): WorkoutSession {
  const findMatchingExercise = (name: string) => {
    const norm = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Exact or contains match
    const exact = seedExercises.find(
      (e) =>
        e.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") === norm,
    );
    if (exact) return exact;

    const aliasMatch = seedExercises.find((e) =>
      e.aliases.some(
        (a) =>
          a
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") === norm,
      ),
    );
    if (aliasMatch) return aliasMatch;

    for (const ex of seedExercises) {
      const exNorm = ex.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const words = exNorm.split(/\s+/).filter((w) => w.length > 3);
      if (words.some((w) => norm.includes(w))) return ex;
    }

    return seedExercises[0];
  };

  const queue = aiPlan.workout.exercises.map((item, index) => {
    const matched = findMatchingExercise(item.name);
    const parsedReps = item.reps
      .split("-")
      .map((s) => parseInt(s.trim(), 10))
      .filter(Number.isFinite);
    const repsMin = parsedReps[0] || 8;
    const repsMax = parsedReps[1] || repsMin || 12;

    return {
      blockId: "ai-prescribed-block",
      blockKind: "hypertrophy",
      blockOrder: 1,
      blockTitle: aiPlan.workout.title,
      completedSets: 0,
      exerciseId: matched.id,
      exerciseName: item.name || matched.name,
      lastSetCompletedAt: null,
      order: index + 1,
      prescription: {
        exerciseId: matched.id,
        exerciseName: item.name || matched.name,
        loadStrategy: "manual" as const,
        notes: item.tip || null,
        repsMax,
        repsMin,
        restSeconds: item.restSeconds || 90,
        rirTarget: item.rir ?? 2,
        sets: item.sets || 3,
      },
      replacementExerciseId: null,
      replacementExerciseName: null,
      restExpectedEndAt: null,
      restStartedAt: null,
      restTargetSeconds: item.restSeconds || 90,
      status: "pending" as const,
      swapReason: null,
    };
  });

  const firstEx = queue[0];
  const isoNow = now.toISOString();

  const session: WorkoutSession = {
    completedAt: null,
    createdAt: isoNow,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    currentWorkoutExerciseId: firstEx?.exerciseId ?? null,
    currentWorkoutExerciseName: firstEx?.exerciseName ?? null,
    exerciseQueue: queue,
    id: sessionId ?? `ai-workout-${uid}-${Date.now()}`,
    lastSetCompletedAt: null,
    optionalCardioCompletedAt: null,
    optionalCardioSkippedAt: null,
    optionalCardioStatus: "NOT_STARTED",
    ownerUid: uid,
    planId: "ai-coach-plan",
    planVersionId: "v1",
    progress: {
      completedExercises: [],
      totalReps: 0,
      totalSets: 0,
      totalVolume: 0,
    },
    recoveryFeedback: null,
    restExpectedEndAt: null,
    restStartedAt: null,
    restTargetSeconds: 0,
    startedAt: isoNow,
    status: "ACTIVE",
    updatedAt: isoNow,
  };

  return session;
}
