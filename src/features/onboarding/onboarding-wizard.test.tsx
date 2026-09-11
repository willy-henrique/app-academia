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
      expect(
        screen.getByRole("heading", { name: "Qual é o seu objetivo principal?" }),
      ).toBeTruthy();
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

  it("prevents advancing when height or weight is outside physiological range", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingWizard
        initialDraft={{
          ...createDefaultOnboardingDraft(),
          currentStepId: "physical_profile",
          physicalProfile: { heightCm: 175, weightKg: 75 },
        }}
        onSaveDraft={onSaveDraft}
        saveDelayMs={0}
      />,
    );

    const heightInput = screen.getByLabelText("Altura");
    fireEvent.change(heightInput, { target: { value: "-10" } });

    const form = screen.getByRole("heading", { name: "Altura e peso" }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("entre 50 cm e 250 cm");
    });

    expect(screen.getByRole("heading", { name: "Altura e peso" })).toBeTruthy();
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

    expect(
      screen.getByRole("heading", { name: "Quais equipamentos você tem à mão?" }),
    ).toBeTruthy();
    // Texto livre antigo é preservado no campo "Outros equipamentos".
    expect(screen.getByDisplayValue("halteres")).toBeTruthy();
  });

  it("stores canonical equipment values that the workout generator understands", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingWizard
        initialDraft={{ ...createDefaultOnboardingDraft(), currentStepId: "equipment" }}
        onSaveDraft={onSaveDraft}
        saveDelayMs={0}
      />,
    );

    // Antes era texto livre ("halteres"), que nunca batia com "dumbbell" no
    // gerador e ainda tirava o peso do corpo da lista.
    fireEvent.click(screen.getByRole("checkbox", { name: "Halteres" }));

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({ equipment: ["dumbbell"] }),
      );
    });
  });

  it("records accessibility needs as valid options instead of free text", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingWizard
        initialDraft={{
          ...createDefaultOnboardingDraft(),
          accessibility: { needAcknowledgement: "yes", needs: [] },
          currentStepId: "accessibility",
        }}
        onSaveDraft={onSaveDraft}
        saveDelayMs={0}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Baixa visão" }));

    // O texto livre anterior virava um enum inválido e o autosave falhava calado.
    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenLastCalledWith(
        expect.objectContaining({
          accessibility: { needAcknowledgement: "yes", needs: ["baixa_visao"] },
        }),
      );
    });
  });

  it("saves the final answers before leaving the summary", async () => {
    const onSaveDraft = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();

    render(
      <OnboardingWizard
        initialDraft={{ ...createDefaultOnboardingDraft(), currentStepId: "summary" }}
        onComplete={onComplete}
        onSaveDraft={onSaveDraft}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Concluir e ver meu treino" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ summaryAcknowledged: true }),
    );
  });

  it("does not leave the summary when saving fails", async () => {
    const onComplete = vi.fn();

    render(
      <OnboardingWizard
        initialDraft={{ ...createDefaultOnboardingDraft(), currentStepId: "summary" }}
        onComplete={onComplete}
        onSaveDraft={vi.fn().mockRejectedValue(new Error("offline"))}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Concluir e ver meu treino" }));

    await waitFor(() => {
      expect(screen.getByText(/Suas respostas continuam aqui/)).toBeTruthy();
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
