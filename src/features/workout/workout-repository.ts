"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { privateProfileSchema } from "@/domain/identity/private-profile";
import {
  workoutSessionSchema,
  type WorkoutSession,
  type WorkoutSet,
} from "@/domain/workout/session";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const workoutSessionCollection = "workoutSessions";
const privateProfileCollection = "privateProfiles";

/**
 * Id determinístico da série: derivado do exercício, do índice e do instante de
 * conclusão. Reenviar a mesma série grava no mesmo documento, então retry e
 * fila offline nunca duplicam histórico.
 */
export function buildWorkoutSetDocumentId(session: WorkoutSession, set: WorkoutSet): string {
  const exercisePart = set.exerciseId || session.currentWorkoutExerciseId || "exercise";
  return `${exercisePart}-${set.setIndex}-${set.completedAt ?? "pending"}`;
}

export async function workoutSetExists(sessionId: string, setId: string): Promise<boolean> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, workoutSessionCollection, sessionId, "sets", setId));
  return snapshot.exists();
}

export async function loadWorkoutSession(uid: string): Promise<WorkoutSession | null> {
  const { firestore } = getFirebaseClientServices();
  const profileSnapshot = await getDoc(doc(firestore, privateProfileCollection, uid));

  if (!profileSnapshot.exists()) {
    return null;
  }

  const profileResult = privateProfileSchema.safeParse(profileSnapshot.data());
  if (!profileResult.success) {
    return null;
  }

  const sessionId = profileResult.data.activeWorkoutSessionId;
  if (!sessionId) {
    return null;
  }

  const sessionSnapshot = await getDoc(doc(firestore, workoutSessionCollection, sessionId));
  if (!sessionSnapshot.exists()) {
    return null;
  }

  const sessionResult = workoutSessionSchema.safeParse(sessionSnapshot.data());
  if (!sessionResult.success) {
    return null;
  }

  return sessionResult.data;
}

export async function saveWorkoutSession(
  uid: string,
  session: WorkoutSession,
): Promise<WorkoutSession> {
  const { firestore } = getFirebaseClientServices();
  const parsedSession = workoutSessionSchema.parse(session);
  const sessionRef = doc(firestore, workoutSessionCollection, parsedSession.id);
  const privateProfileRef = doc(firestore, privateProfileCollection, uid);

  await setDoc(
    sessionRef,
    {
      ...parsedSession,
      updatedAt: new Date().toISOString(),
      createdAt: parsedSession.createdAt ?? new Date().toISOString(),
    },
    { merge: true },
  );

  await setDoc(
    privateProfileRef,
    {
      activeWorkoutPlanId: parsedSession.planId,
      activeWorkoutSessionId: parsedSession.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return parsedSession;
}

export async function saveWorkoutSet(
  uid: string,
  session: WorkoutSession,
  set: WorkoutSet,
): Promise<void> {
  const { firestore } = getFirebaseClientServices();
  const sessionRef = doc(firestore, workoutSessionCollection, session.id);
  const setId = buildWorkoutSetDocumentId(session, set);

  await setDoc(
    doc(sessionRef, "sets", setId),
    {
      ...set,
      updatedAt: new Date().toISOString(),
      createdAt: set.createdAt ?? new Date().toISOString(),
    },
    { merge: true },
  );

  await setDoc(
    doc(firestore, privateProfileCollection, uid),
    {
      activeWorkoutPlanId: session.planId,
      activeWorkoutSessionId: session.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
