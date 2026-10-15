"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ErrorState, LoadingState } from "@/components/ui/states";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import {
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/features/onboarding/onboarding-repository";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { type OnboardingDraft } from "@/domain/onboarding/onboarding";

export function OnboardingPageClient() {
  const router = useRouter();
  const { user, status } = useAuthSession();
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);

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
          setDraft(null);
          setError(
            "Não conseguimos carregar suas respostas anteriores. Elas não foram alteradas; tente novamente quando a conexão voltar.",
          );
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
  }, [loadAttempt, status, user]);

  if (status !== "authenticated") {
    return (
      <main className="wt-page" id="main-content">
        <p className="wt-text-body text-wt-text-secondary-strong">
          Você precisa entrar para continuar.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="wt-page max-w-[var(--wt-container-form)]" id="main-content">
        <LoadingState label="Carregando suas respostas…" lines={4} />
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="wt-page max-w-[var(--wt-container-form)]" id="main-content">
        <ErrorState
          description={error ?? "Não conseguimos carregar suas respostas agora."}
          title="Não foi possível abrir seu questionário"
          onRetry={() => {
            setError(null);
            setIsLoading(true);
            setLoadAttempt((attempt) => attempt + 1);
          }}
        />
      </main>
    );
  }

  return (
    <main className="wt-page" id="main-content">
      <OnboardingWizard
        initialDraft={draft}
        onComplete={() => router.push("/workout")}
        onSaveDraft={persistDraft}
      />
    </main>
  );
}
