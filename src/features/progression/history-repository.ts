import {
  collection,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { exerciseSetResultSchema, type ExerciseSetResult } from "@/domain/progression/progression";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const workoutSessionCollection = "workoutSessions";

/**
 * Reads the person's own recent history. The fan-out is bounded by
 * `sessionLimit` sessions - the app never scans the whole history - and the
 * query is scoped to the caller, so nobody reads someone else's results.
 */
export async function listRecentExerciseResults(
  uid: string,
  sessionLimit: number,
): Promise<ExerciseSetResult[]> {
  try {
    const { firestore } = getFirebaseClientServices();
    const sessions = await getDocs(
      query(
        collection(firestore, workoutSessionCollection),
        where("ownerUid", "==", uid),
        where("status", "==", "COMPLETED"),
        orderBy("completedAt", "desc"),
        queryLimit(Math.max(1, sessionLimit)),
      ),
    );

    const results: ExerciseSetResult[] = [];

    for (const session of sessions.docs) {
      const sets = await getDocs(collection(session.ref, "sets"));

      for (const set of sets.docs) {
        const parsed = exerciseSetResultSchema.safeParse({
          ...set.data(),
          sessionId: session.id,
        });

        if (parsed.success && parsed.data.uid === uid) {
          results.push(parsed.data);
        }
      }
    }

    return results.sort((left, right) => left.completedAt.localeCompare(right.completedAt));
  } catch (error) {
    console.error("[history-repository] falha ao buscar histórico de exercícios:", error);
    return [];
  }
}
