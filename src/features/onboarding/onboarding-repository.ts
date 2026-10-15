"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import {
  createDefaultOnboardingDraft,
  onboardingDraftSchema,
  type OnboardingDraft,
} from "@/domain/onboarding/onboarding";
import { getFirebaseClientServices } from "@/infrastructure/firebase/client";

const onboardingFirestorePath = "privateProfiles";

export async function loadOnboardingDraft(uid: string): Promise<OnboardingDraft> {
  const { firestore } = getFirebaseClientServices();
  const snapshot = await getDoc(doc(firestore, onboardingFirestorePath, uid));

  if (!snapshot.exists()) {
    return createDefaultOnboardingDraft();
  }

  // O onboarding é independente dos demais campos do perfil. Contas antigas
  // ou criadas antes do gatilho de perfil completo ainda precisam recuperar as
  // respostas já salvas, em vez de começar o questionário do zero.
  const onboardingResult = onboardingDraftSchema.safeParse(snapshot.data().onboarding);
  if (!onboardingResult.success) {
    return createDefaultOnboardingDraft();
  }

  return onboardingResult.data;
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
