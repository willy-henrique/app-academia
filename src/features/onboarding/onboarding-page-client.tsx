"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoadingState } from "@/components/ui/states";
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
          setError(
            "Não conseguimos carregar suas respostas anteriores. Você pode começar agora — o que preencher será salvo quando a conexão voltar.",
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
  }, [status, user]);

  if (status !== "authenticated") {
    return (
      <main className="wt-page" id="main-content">
        <p className="wt-text-body text-wt-text-secondary-strong">
          Você precisa entrar para continuar.
        </p>
      </main>
    );
  }

  if (isLoading || !draft) {
    return (
      <main className="wt-page max-w-[var(--wt-container-form)]" id="main-content">
        <LoadingState label="Carregando suas respostas…" lines={4} />
      </main>
    );
  }

  return (
    <main className="wt-page" id="main-content">
      {error ? (
        <p
          className="mx-auto mb-6 max-w-[var(--wt-container-form)] rounded-wt-lg bg-wt-warning-subtle px-4 py-3 text-wt-body-sm text-wt-warning-text"
          role="status"
        >
          {error}
        </p>
      ) : null}
      <OnboardingWizard
        initialDraft={draft}
        onComplete={() => router.push("/workout")}
        onSaveDraft={persistDraft}
      />
    </main>
  );
}
