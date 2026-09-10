"use client";

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
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { measurementSchema, type Measurement } from "@/domain/profile/measurement";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

function itemsPath(uid: string): [string, string, string] {
  return ["measurements", uid, "items"];
}

export async function saveMeasurement(measurement: Measurement): Promise<Measurement> {
  const parsed = measurementSchema.parse(measurement);
  const { auth, firestore } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para registrar medidas.");
  }

  if (uid !== parsed.ownerUid) {
    throw new Error("Uma pessoa só registra as próprias medidas.");
  }

  await setDoc(doc(firestore, ...itemsPath(uid), parsed.id), {
    ...parsed,
    createdAt: parsed.createdAt ?? new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });

  return parsed;
}

/** Own measurement history, newest first. Never readable by anyone else. */
export async function listMeasurements(uid: string, limit: number): Promise<Measurement[]> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDocs(
    query(
      collection(firestore, ...itemsPath(uid)),
      orderBy("takenAt", "desc"),
      queryLimit(Math.max(1, limit)),
    ),
  );

  return snapshot.docs
    .map((document) => measurementSchema.safeParse(document.data()))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data);
}

export type ProgressPhotoUpload = Readonly<{
  path: string;
  url: string;
}>;

/**
 * Progress photos live in the private `progress/{uid}` Storage folder: only the
 * owner can upload and read them, and the download URL is fetched on demand.
 */
export async function uploadProgressPhoto(file: File): Promise<ProgressPhotoUpload> {
  const { auth, storage } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para enviar fotos de progresso.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Envie uma imagem para a foto de progresso.");
  }

  const path = `progress/${uid}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });

  return { path, url: await getDownloadURL(storageRef) };
}
