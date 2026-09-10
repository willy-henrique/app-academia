import type { Exercise } from "@/domain/workout/exercise";

export interface ExerciseProvider {
  getById(id: string): Promise<Exercise | null>;
  getBySlug(slug: string): Promise<Exercise | null>;
  list(): Promise<readonly Exercise[]>;
}
