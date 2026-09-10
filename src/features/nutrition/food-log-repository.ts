import {
  collection,
  doc,
  getDocs,
  limit as queryLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { foodLogEntrySchema, type FoodLogEntry } from "@/domain/nutrition/food-log";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const foodLogsCollection = "foodLogs";

function entriesCollection(uid: string) {
  const { firestore } = getFirebaseClientServices();
  return collection(firestore, foodLogsCollection, uid, "entries");
}

/** Creates an owner-only food-log entry; it never accepts another account's UID. */
export async function createFoodLogEntryRequest(entry: FoodLogEntry): Promise<FoodLogEntry> {
  const parsed = foodLogEntrySchema.parse(entry);
  const { auth } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para registrar uma refeição.");
  }

  if (uid !== parsed.ownerUid) {
    throw new Error("Uma pessoa só pode registrar a própria alimentação.");
  }

  await setDoc(doc(entriesCollection(uid), parsed.id), {
    ...parsed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return parsed;
}

/** Reads only the signed-in person's entries, newest consumption first. */
export async function listFoodLogEntries(uid: string, maximum = 20): Promise<FoodLogEntry[]> {
  const { auth } = getFirebaseClientServices();
  if (auth.currentUser?.uid !== uid) {
    throw new Error("Uma pessoa só pode consultar o próprio diário alimentar.");
  }

  const snapshot = await getDocs(
    query(entriesCollection(uid), orderBy("consumedAt", "desc"), queryLimit(Math.max(1, maximum))),
  );

  return snapshot.docs
    .map((item) => foodLogEntrySchema.safeParse(item.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}
