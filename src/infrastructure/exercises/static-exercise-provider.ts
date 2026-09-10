import type { Exercise } from "@/domain/workout/exercise";
import { getSeedExerciseById, seedExercises } from "@/domain/workout/exercise-seed";

import type { ExerciseProvider } from "@/application/exercises/exercise-provider";

export class StaticExerciseProvider implements ExerciseProvider {
  constructor(private readonly exercises: readonly Exercise[] = seedExercises) {}

  async getById(id: string): Promise<Exercise | null> {
    return this.exercises.find((exercise) => exercise.id === id) ?? null;
  }

  async getBySlug(slug: string): Promise<Exercise | null> {
    return this.exercises.find((exercise) => exercise.slug === slug) ?? null;
  }

  async list(): Promise<readonly Exercise[]> {
    return [...this.exercises];
  }
}

export function createStaticExerciseProvider(
  exercises: readonly Exercise[] = seedExercises,
): ExerciseProvider {
  return new StaticExerciseProvider(exercises);
}

export function getSeedExercise(id: string): Exercise | null {
  return getSeedExerciseById(id);
}
