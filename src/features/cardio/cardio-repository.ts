"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { z } from "zod";

import { cardioSessionSchema, type CardioSession } from "@/domain/cardio/cardio";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const cardioSessionCollection = "cardioSessions";

const recordCardioCompletionResultSchema = z.object({
  cardioSessionId: z.string().trim().min(1),
  credited: z.boolean(),
  weekKey: z.string().trim().min(1),
});

export type RecordCardioCompletionResult = z.infer<typeof recordCardioCompletionResultSchema>;

export async function saveCardioSession(session: CardioSession): Promise<CardioSession> {
  const parsed = cardioSessionSchema.parse(session);
  const { auth, firestore } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para registrar cardio.");
  }

  if (uid !== parsed.ownerUid) {
    throw new Error("Uma pessoa só registra o próprio cardio.");
  }

  await setDoc(doc(firestore, cardioSessionCollection, parsed.id), {
    ...parsed,
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  return parsed;
}

export async function loadCardioSession(cardioSessionId: string): Promise<CardioSession | null> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, cardioSessionCollection, cardioSessionId));

  if (!snapshot.exists()) {
    return null;
  }

  const parsed = cardioSessionSchema.safeParse(snapshot.data());
  return parsed.success ? parsed.data : null;
}

/** Own cardio history, newest first. Cardio lives on its own axis. */
export async function listCardioSessions(uid: string, limit: number): Promise<CardioSession[]> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDocs(
    query(
      collection(firestore, cardioSessionCollection),
      where("ownerUid", "==", uid),
      orderBy("createdAt", "desc"),
      queryLimit(Math.max(1, limit)),
    ),
  );

  return snapshot.docs
    .map((document) => cardioSessionSchema.safeParse(document.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}

export async function recordCardioCompletionRequest(
  cardioSessionId: string,
): Promise<RecordCardioCompletionResult> {
  const { functions } = getFirebaseClientServices();
  const callable = httpsCallable<{ cardioSessionId: string }, unknown>(
    functions,
    "recordCardioCompletion",
  );
  const result = await callable({ cardioSessionId });
  return recordCardioCompletionResultSchema.parse(result.data);
}
