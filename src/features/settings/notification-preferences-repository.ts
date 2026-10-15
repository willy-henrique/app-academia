"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  defaultNotificationPreferences,
  notificationPreferencesSchema,
  type NotificationPreferences,
} from "@/domain/settings/notification-preferences";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

function settingsDocument(uid: string): [string, string] {
  return ["userSettings", uid];
}

/** Reads the account owner's in-app reminder choice, falling back safely for new accounts. */
export async function loadNotificationPreferences(uid: string): Promise<NotificationPreferences> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, ...settingsDocument(uid)));

  if (!snapshot.exists()) {
    return defaultNotificationPreferences;
  }

  const parsed = notificationPreferencesSchema.safeParse(snapshot.data()?.notificationPreferences);
  return parsed.success ? parsed.data : defaultNotificationPreferences;
}

/** Persists only the signed-in person's narrow, validated notification preference. */
export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const parsed = notificationPreferencesSchema.parse(preferences);
  const { auth, firestore } = getFirebaseClientServices();
  const uid = auth.currentUser?.uid;

  if (!uid) {
    throw new Error("É necessário entrar na conta para alterar os lembretes.");
  }

  await setDoc(
    doc(firestore, ...settingsDocument(uid)),
    {
      createdAt: serverTimestamp(),
      notificationPreferences: parsed,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return parsed;
}
