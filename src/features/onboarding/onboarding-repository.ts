"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  createDefaultOnboardingDraft,
  onboardingDraftSchema,
  type OnboardingDraft,
} from "@/domain/onboarding/onboarding";
import { privateProfileSchema } from "@/domain/identity/private-profile";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const onboardingFirestorePath = "privateProfiles";

export async function loadOnboardingDraft(uid: string): Promise<OnboardingDraft> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, onboardingFirestorePath, uid));

  if (!snapshot.exists()) {
    return createDefaultOnboardingDraft();
  }

  const profileResult = privateProfileSchema.safeParse(snapshot.data());
  if (!profileResult.success) {
    return createDefaultOnboardingDraft();
  }

  return profileResult.data.onboarding ?? createDefaultOnboardingDraft();
}

export async function saveOnboardingDraft(
  uid: string,
  draft: OnboardingDraft,
): Promise<OnboardingDraft> {
  const { firestore } = getFirebaseClientServices();
  const parsedDraft = onboardingDraftSchema.parse(draft);

  await setDoc(
    doc(firestore, onboardingFirestorePath, uid),
    {
      onboarding: parsedDraft,
      onboardingVersion: 1,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return parsedDraft;
}
