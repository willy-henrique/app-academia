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
