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
const activeCardioStorageKey = "willtreino.cardio-active-session.v1";

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function persistActiveCardioLocal(session: CardioSession | null): void {
  const s = storage();
  if (!s) return;
  if (!session || session.status === "COMPLETED" || session.status === "SKIPPED") {
    s.removeItem(activeCardioStorageKey);
  } else {
    s.setItem(activeCardioStorageKey, JSON.stringify(session));
  }
}

export function loadActiveCardioLocal(): CardioSession | null {
  const raw = storage()?.getItem(activeCardioStorageKey);
  if (!raw) return null;
  try {
    const parsed = cardioSessionSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.status !== "COMPLETED" && parsed.data.status !== "SKIPPED") {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

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

  persistActiveCardioLocal(parsed);
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

/** Retorna a sessão ativa/pendente mais recente do usuário se existir */
export async function findActiveCardioSession(uid: string): Promise<CardioSession | null> {
  // Primeiro checa cache local para resposta instantânea
  const local = loadActiveCardioLocal();
  if (local && local.ownerUid === uid) {
    return local;
  }

  try {
    const { firestore } = getFirebaseClientServices();
    const snapshot = await getDocs(
      query(
        collection(firestore, cardioSessionCollection),
        where("ownerUid", "==", uid),
        where("status", "in", ["ACTIVE", "PLANNED", "RESCHEDULED"]),
        orderBy("createdAt", "desc"),
        queryLimit(1),
      ),
    );

    if (!snapshot.empty) {
      const parsed = cardioSessionSchema.safeParse(snapshot.docs[0].data());
      if (parsed.success) {
        persistActiveCardioLocal(parsed.data);
        return parsed.data;
      }
    }
    return null;
  } catch {
    return local;
  }
}

/** Own cardio history, newest first. Cardio lives on its own axis. */
export async function listCardioSessions(uid: string, limit: number): Promise<CardioSession[]> {
  try {
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
  } catch (err) {
    console.error("[cardio-repository] falha ao listar cardios:", err);
    return [];
  }
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
