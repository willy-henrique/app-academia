import { describe, expect, it } from "vitest";

import {
  accessibilityNeedLabels,
  accessibilityNeedOptions,
  createDefaultOnboardingDraft,
  detectTimezone,
  formatTimezoneLabel,
  onboardingCardioLabels,
  onboardingCardioOptions,
  onboardingDraftSchema,
  onboardingExperienceLabels,
  onboardingExperienceOptions,
  onboardingGoalLabels,
  onboardingGoalOptions,
  toSelectOptions,
} from "./onboarding";

describe("onboarding domain", () => {
  it("creates a stable default draft", () => {
    const draft = createDefaultOnboardingDraft();

    expect(draft.currentStepId).toBe("presentation");
    expect(draft.completedStepIds).toEqual([]);
    expect(draft.goal).toBeNull();
    expect(draft.accessibility.needAcknowledgement).toBe("prefer_not_to_answer");
    expect(draft.equipment).toEqual([]);
  });

  it("accepts a valid partial draft payload", () => {
    const parsedDraft = onboardingDraftSchema.parse({
      cardioPreference: "recommended",
      currentStepId: "goal",
      goal: "ganhar_massa",
      equipment: ["halteres", "banco"],
      experience: "iniciante",
      groupTrainingPreference: "with_someone",
      location: "Academia",
      nutritionBudgetCents: 60000,
      physicalProfile: {
        heightCm: 180,
        weightKg: 82.5,
      },
      presentationAcknowledged: true,
      routine: {
        daysPerWeek: 4,
        sessionMinutes: 60,
      },
      summaryAcknowledged: false,
      timezone: "America/Sao_Paulo",
    });

    expect(parsedDraft.goal).toBe("ganhar_massa");
    expect(parsedDraft.equipment).toEqual(["halteres", "banco"]);
    expect(parsedDraft.physicalProfile.heightCm).toBe(180);
  });
});

describe("rótulos das opções", () => {
  it("traduz toda opção e nunca deixa o identificador cru aparecer", () => {
    const tabelas = [
      [onboardingGoalOptions, onboardingGoalLabels],
      [onboardingExperienceOptions, onboardingExperienceLabels],
      [onboardingCardioOptions, onboardingCardioLabels],
      [accessibilityNeedOptions, accessibilityNeedLabels],
    ] as const;

    for (const [opcoes, rotulos] of tabelas) {
      for (const opcao of opcoes) {
        const rotulo = (rotulos as Record<string, string>)[opcao];

        expect(rotulo, `sem rótulo para "${opcao}"`).toBeTruthy();
        // Um rótulo igual ao enum significa que o valor cru chegaria à tela.
        expect(rotulo).not.toBe(opcao);
        expect(rotulo).not.toMatch(/_/);
      }
    }
  });

  it("monta opções de select preservando o valor armazenado", () => {
    const opcoes = toSelectOptions(onboardingGoalOptions, onboardingGoalLabels);

    expect(opcoes).toContainEqual({ label: "Perder peso", value: "perder_peso" });
    expect(opcoes).toHaveLength(onboardingGoalOptions.length);
  });
});

describe("fuso horário", () => {
  it("vem do ambiente em vez de ser digitado", () => {
    const fuso = detectTimezone();

    expect(fuso).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(fuso).toMatch(/^[A-Za-z]+\/[A-Za-z_+\-0-9/]+$|^UTC$/);
  });

  it("mostra cidade e deslocamento em vez do identificador do sistema", () => {
    const rotulo = formatTimezoneLabel("America/Sao_Paulo");

    expect(rotulo).toContain("Sao Paulo");
    expect(rotulo).not.toContain("_");
    expect(rotulo).not.toContain("America/");
    expect(rotulo).toMatch(/GMT/);
  });

  it("não quebra sem fuso ou com um identificador inválido", () => {
    expect(formatTimezoneLabel(null)).toBe("não identificado");
    expect(formatTimezoneLabel("Fuso/Inexistente")).toBe("Inexistente");
  });
});
