"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  groupParticipantSetSchema,
  type GroupParticipantSet,
} from "@/domain/group/group-participant-set";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

export async function saveGroupParticipantSet(set: GroupParticipantSet): Promise<void> {
  const parsedSet = groupParticipantSetSchema.parse(set);
  const { auth, firestore } = getFirebaseClientServices();
  const authenticatedUid = auth.currentUser?.uid;

  if (!authenticatedUid) {
    throw new Error("É necessário entrar na conta para registrar uma série em grupo.");
  }

  if (authenticatedUid !== parsedSet.uid) {
    throw new Error("Uma pessoa só pode registrar as próprias séries em grupo.");
  }

  const setRef = doc(
    firestore,
    "groupSessions",
    parsedSet.groupSessionId,
    "participants",
    parsedSet.uid,
    "sets",
    parsedSet.eventId,
  );

  await setDoc(setRef, {
    ...parsedSet,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
