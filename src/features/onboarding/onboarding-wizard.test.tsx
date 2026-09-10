// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createDefaultOnboardingDraft } from "@/domain/onboarding/onboarding";

import { OnboardingWizard } from "./onboarding-wizard";

describe("OnboardingWizard", () => {
  it("autosaves draft changes and advances between steps", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingWizard
        initialDraft={createDefaultOnboardingDraft()}
        onSaveDraft={onSaveDraft}
        saveDelayMs={0}
      />,
    );

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalled();
    });
    onSaveDraft.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Começar" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Qual é o seu objetivo principal?" })).toBeTruthy();
    });

    // O objetivo virou um grupo de cartões selecionáveis (radio de verdade),
    // então a interação é um clique na opção, não a troca de um select.
    fireEvent.click(screen.getByRole("radio", { name: /Ganhar massa muscular/ }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: "ganhar_massa",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
  });

  it("restores a later step from a saved draft", () => {
    render(
      <OnboardingWizard
        initialDraft={{
          ...createDefaultOnboardingDraft(),
          currentStepId: "equipment",
          equipment: ["halteres"],
        }}
        onSaveDraft={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByRole("heading", { name: "Quais equipamentos você tem à mão?" })).toBeTruthy();
    expect(screen.getByDisplayValue("halteres")).toBeTruthy();
  });
});
