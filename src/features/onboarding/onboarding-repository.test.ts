import { describe, expect, it, vi, beforeEach } from "vitest";

const { getFirebaseClientServices, getDoc, setDoc, doc, serverTimestamp } = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

import { createDefaultOnboardingDraft } from "@/domain/onboarding/onboarding";

import { loadOnboardingDraft, saveOnboardingDraft } from "./onboarding-repository";

describe("onboarding repository", () => {
  beforeEach(() => {
    getFirebaseClientServices.mockReset();
    doc.mockReset();
    getDoc.mockReset();
    setDoc.mockReset();
    serverTimestamp.mockReset();
  });

  it("returns the saved onboarding draft when present", async () => {
    getFirebaseClientServices.mockReturnValue({ firestore: "firestore" });
    doc.mockReturnValue("privateProfiles/alice");
    getDoc.mockResolvedValue({
      data: () => ({
        birthDate: null,
        locale: "pt-BR",
        onboarding: {
          ...createDefaultOnboardingDraft(),
          currentStepId: "goal",
        },
        onboardingVersion: 1,
        preferences: {
          simplifiedMode: false,
          weekStartsOn: "monday",
        },
        timezone: "America/Sao_Paulo",
      }),
      exists: () => true,
    });

    await expect(loadOnboardingDraft("alice")).resolves.toMatchObject({
      currentStepId: "goal",
    });
  });

  it("saves a normalized onboarding draft into the private profile", async () => {
    getFirebaseClientServices.mockReturnValue({ firestore: "firestore" });
    doc.mockReturnValue("privateProfiles/alice");
    serverTimestamp.mockReturnValue("server-timestamp");

    const draft = {
      ...createDefaultOnboardingDraft(),
      currentStepId: "goal" as const,
      goal: "ganhar_massa" as const,
    };

    await expect(saveOnboardingDraft("alice", draft)).resolves.toMatchObject({
      goal: "ganhar_massa",
      currentStepId: "goal",
    });
    expect(setDoc).toHaveBeenCalledWith(
      "privateProfiles/alice",
      expect.objectContaining({
        onboarding: expect.objectContaining({
          goal: "ganhar_massa",
        }),
        onboardingVersion: 1,
      }),
      { merge: true },
    );
  });
});
