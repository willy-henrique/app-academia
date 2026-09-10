"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/features/onboarding/onboarding-repository";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { createDefaultOnboardingDraft, type OnboardingDraft } from "@/domain/onboarding/onboarding";

export function OnboardingPageClient() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistDraft = useCallback(
    async (nextDraft: OnboardingDraft) => {
      if (!user) {
        return;
      }

      await saveOnboardingDraft(user.uid, nextDraft);
    },
    [user],
  );

  useEffect(() => {
    let isActive = true;

    async function run() {
      if (status !== "authenticated" || !user) {
        return;
      }

      try {
        setIsLoading(true);
        const loadedDraft = await loadOnboardingDraft(user.uid);
        if (!isActive) {
          return;
        }
        setDraft(loadedDraft);
        setError(null);
      } catch {
        if (isActive) {
          setDraft(createDefaultOnboardingDraft());
          setError("Não foi possível carregar o rascunho do onboarding agora.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      isActive = false;
    };
  }, [status, user]);

  if (status !== "authenticated") {
    return (
      <main className="wt-page wt-page-grid flex max-w-3xl items-center">
        <Card className="p-6">
          <p className="wt-text-body text-wt-text-secondary">Você precisa entrar para continuar.</p>
        </Card>
      </main>
    );
  }

  if (isLoading || !draft) {
    return (
      <main className="wt-page wt-page-grid flex max-w-3xl items-center">
        <Card className="p-6">
          <p className="wt-text-body text-wt-text-secondary">Carregando onboarding...</p>
          {error ? <p className="mt-2 wt-text-body text-wt-danger">{error}</p> : null}
        </Card>
      </main>
    );
  }

  return (
    <main className="wt-page wt-page-grid max-w-4xl">
      <div className="w-full space-y-4">
        {error ? (
          <Card className="border-wt-danger p-4 wt-text-body text-wt-danger">{error}</Card>
        ) : null}
        <OnboardingWizard initialDraft={draft} onSaveDraft={persistDraft} onComplete={() => router.push("/workout")} />
      </div>
    </main>
  );
}
