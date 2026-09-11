import { seedExercises } from "./exercise-seed";
import type { WorkoutSession } from "./session";

const muscleGroupMapping: Record<string, string> = {
  "peitoral maior": "Peito",
  "peitoral": "Peito",
  "latíssimo do dorso": "Costas",
  "dorsal": "Costas",
  "romboides": "Costas",
  "trapézio médio": "Costas",
  "trapézio superior": "Ombros",
  "deltoide anterior": "Ombros",
  "deltoide lateral": "Ombros",
  "deltoide posterior": "Ombros",
  "deltoide": "Ombros",
  "bíceps": "Bíceps",
  "tríceps": "Tríceps",
  "quadríceps": "Pernas",
  "glúteo máximo": "Glúteos e Pernas",
  "glúteo": "Glúteos",
  "isquiotibiais": "Posterior de Coxa",
  "gastrocnêmio": "Panturrilhas",
  "core": "Abdômen e Core",
};

export function resolveMuscleFocusFromExercises(exerciseIds: readonly string[]): string {
  if (exerciseIds.length === 0) {
    return "Treino de Força";
  }

  const detectedGroups = new Set<string>();

  for (const id of exerciseIds) {
    const found = seedExercises.find((ex) => ex.id === id);
    if (!found) continue;

    for (const m of found.primaryMuscles) {
      const clean = m.toLowerCase().trim();
      const mapped = muscleGroupMapping[clean];
      if (mapped) {
        detectedGroups.add(mapped);
      } else {
        detectedGroups.add(clean[0].toUpperCase() + clean.slice(1));
      }
    }
  }

  const list = Array.from(detectedGroups);
  if (list.length === 0) {
    return "Treino de Força";
  }

  if (list.length === 1) {
    return `Treino de ${list[0]}`;
  }

  if (list.length === 2) {
    return `Treino de ${list[0]} & ${list[1]}`;
  }

  return `Treino de ${list.slice(0, 2).join(", ")} e outros`;
}

export function resolveDynamicWorkoutTitle(session: WorkoutSession): string {
  const blockTitle = session.exerciseQueue[0]?.blockTitle?.trim();
  if (blockTitle && blockTitle.toLowerCase() !== "bloco principal") {
    return blockTitle;
  }

  const exerciseIds = session.exerciseQueue.map((item) => item.exerciseId);
  return resolveMuscleFocusFromExercises(exerciseIds);
}
