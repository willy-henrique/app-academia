// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OnboardingDraft } from "@/domain/onboarding/onboarding";
import type { WorkoutSession } from "@/domain/workout/session";

const {
  flushPendingWorkoutSets,
  getWorkoutSyncStatus,
  listRecentExerciseResults,
  loadActiveWorkoutSession,
  loadOnboardingDraft,
  loadWorkoutSession,
  persistActiveWorkoutSession,
  recordWorkoutCompletionRequest,
  saveWorkoutSetWithOfflineFallback,
  saveWorkoutSession,
  saveWorkoutSet,
  useAuthSession,
  onboardingDraft,
} = vi.hoisted(() => {
  const onboardingDraft: OnboardingDraft = {
    accessibility: {
      needAcknowledgement: "no",
      needs: [],
    },
    cardioPreference: "optional",
    completedStepIds: [],
    currentStepId: "summary",
    equipment: ["bodyweight", "mat"],
    experience: "iniciante",
    functionalAbilities: {},
    goal: "saude",
    groupTrainingPreference: "alone",
    location: "academia",
    nutritionBudgetCents: null,
    physicalProfile: {
      heightCm: null,
      weightKg: null,
    },
    presentationAcknowledged: true,
    routine: {
      daysPerWeek: 3,
      sessionMinutes: 30,
    },
    safetyNotes: "",
    summaryAcknowledged: false,
    timezone: "America/Sao_Paulo",
    trainingObjective: "",
  };

  return {
    flushPendingWorkoutSets: vi.fn(),
    getWorkoutSyncStatus: vi.fn(),
    listRecentExerciseResults: vi.fn(),
    loadActiveWorkoutSession: vi.fn(),
    loadOnboardingDraft: vi.fn(),
    loadWorkoutSession: vi.fn(),
    onboardingDraft,
    persistActiveWorkoutSession: vi.fn(),
    recordWorkoutCompletionRequest: vi.fn(),
    saveWorkoutSetWithOfflineFallback: vi.fn(),
    saveWorkoutSession: vi.fn(),
    saveWorkoutSet: vi.fn(),
    useAuthSession: vi.fn(),
  };
});

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("@/features/onboarding/onboarding-repository", () => ({
  loadOnboardingDraft,
}));

vi.mock("@/features/progression/weekly-stats-repository", () => ({
  recordWorkoutCompletionRequest,
}));

vi.mock("@/features/progression/history-repository", () => ({
  listRecentExerciseResults,
}));

vi.mock("./offline-workout-store", () => ({
  flushPendingWorkoutSets,
  getWorkoutSyncStatus,
  loadActiveWorkoutSession,
  persistActiveWorkoutSession,
  saveWorkoutSetWithOfflineFallback,
}));

vi.mock("./workout-repository", () => ({
  loadWorkoutSession,
  saveWorkoutSession,
  saveWorkoutSet,
}));

import { WorkoutPageClient } from "./workout-page-client";
import { createWorkoutInit } from "./workout-flow";

describe("WorkoutPageClient", () => {
  beforeEach(() => {
    getWorkoutSyncStatus.mockReturnValue({ pendingCount: 0, state: "SYNCED" });
    listRecentExerciseResults.mockResolvedValue([]);
    loadActiveWorkoutSession.mockReturnValue(null);
    flushPendingWorkoutSets.mockResolvedValue({ pendingCount: 0, state: "SYNCED", syncedCount: 0 });
    saveWorkoutSetWithOfflineFallback.mockResolvedValue({
      pendingCount: 0,
      state: "SYNCED",
      status: "SYNCED",
    });
  });

  it("loads onboarding, starts a workout and autosaves set progress", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    loadWorkoutSession.mockResolvedValue(null);
    saveWorkoutSession.mockResolvedValue(undefined);
    saveWorkoutSet.mockResolvedValue(undefined);

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir série" })).toBeTruthy();
    });

    expect(saveWorkoutSession).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Carga"), {
      target: { value: "40" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Concluir série" }));

    await waitFor(() => {
      expect(saveWorkoutSetWithOfflineFallback).toHaveBeenCalled();
    });

    // Confirmação visível e curta, além do anúncio para leitor de tela.
    expect(screen.getByText("Série 1 concluída")).toBeTruthy();
    expect(screen.getByText(/Série 1 concluída para/)).toBeTruthy();
  });

  it("exposes the accompanied-workout flow from the active session", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    loadWorkoutSession.mockResolvedValue(null);
    saveWorkoutSession.mockResolvedValue(undefined);

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Treinar com alguém" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Treinar com alguém" }));

    expect(await screen.findByRole("dialog", { name: "Convidar parceiro" })).toBeTruthy();
    expect(screen.getByLabelText("WillTreino ID")).toBeTruthy();
  });

  it("offers a valid completion choice after the final strength exercise", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    const initialSession = createWorkoutInit("alice", onboardingDraft).session;
    const strengthCompleteSession: WorkoutSession = {
      ...initialSession,
      currentExerciseIndex: initialSession.exerciseQueue.length,
      currentWorkoutExerciseId: null,
      currentWorkoutExerciseName: null,
      status: "PAUSED",
    };
    loadWorkoutSession.mockResolvedValue(strengthCompleteSession);
    saveWorkoutSession.mockResolvedValue(undefined);
    recordWorkoutCompletionRequest.mockResolvedValue({
      credited: true,
      sessionId: initialSession.id,
      weekKey: "2026-09-07",
    });

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir sem cardio" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Concluir sem cardio" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Treino concluído" })).toBeTruthy();
    });

    // A conclusão pede o crédito ao servidor; a projeção nunca é escrita pelo cliente.
    await waitFor(() => {
      expect(recordWorkoutCompletionRequest).toHaveBeenCalledWith(initialSession.id);
    });
    expect(screen.getByText(/Estatística semanal atualizada/)).toBeTruthy();
  });

  it("keeps the workout finished when the weekly credit cannot be requested", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    const initialSession = createWorkoutInit("alice", onboardingDraft).session;
    loadWorkoutSession.mockResolvedValue({
      ...initialSession,
      currentExerciseIndex: initialSession.exerciseQueue.length,
      currentWorkoutExerciseId: null,
      currentWorkoutExerciseName: null,
      status: "PAUSED",
    });
    saveWorkoutSession.mockResolvedValue(undefined);
    recordWorkoutCompletionRequest.mockRejectedValue(new Error("offline"));

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir sem cardio" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Concluir sem cardio" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Treino concluído" })).toBeTruthy();
    });
    expect(screen.getByText(/assim que houver conexão/)).toBeTruthy();
  });
  it("keeps the set on the device and says so when the network fails", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    loadWorkoutSession.mockResolvedValue(null);
    saveWorkoutSession.mockResolvedValue(undefined);
    saveWorkoutSetWithOfflineFallback.mockResolvedValue({
      pendingCount: 1,
      state: "PENDING",
      status: "QUEUED",
    });

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir série" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Carga"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Concluir série" }));

    await waitFor(() => {
      expect(screen.getByText(/salva neste aparelho/)).toBeTruthy();
    });
    expect(screen.getAllByText(/1 série guardada neste aparelho/).length).toBeGreaterThan(0);
    expect(persistActiveWorkoutSession).toHaveBeenCalled();
  });

  it("recovers the session stored on the device when the network is down", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    const offlineSession = createWorkoutInit("alice", onboardingDraft).session;
    loadWorkoutSession.mockRejectedValue(new Error("offline"));
    loadActiveWorkoutSession.mockReturnValue(offlineSession);

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(
        screen.getByText("Sessão recuperada deste aparelho enquanto a conexão não volta."),
      ).toBeTruthy();
    });
  });

  it("ends the strength part after the last prescribed set instead of logging extra sets", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    const initialSession = createWorkoutInit("alice", onboardingDraft).session;
    const lastIndex = initialSession.exerciseQueue.length - 1;
    // Estado real depois de `advanceWorkoutExercise` no último exercício: o
    // índice continua nele, com todas as séries feitas, e a sessão fica PAUSED.
    const allSetsDone: WorkoutSession = {
      ...initialSession,
      currentExerciseIndex: lastIndex,
      exerciseQueue: initialSession.exerciseQueue.map((item) => ({
        ...item,
        completedSets: item.prescription.sets,
        status: "completed" as const,
      })),
      status: "PAUSED",
    };
    loadWorkoutSession.mockResolvedValue(allSetsDone);
    saveWorkoutSession.mockResolvedValue(undefined);

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Concluir sem cardio" })).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: "Concluir série" })).toBeNull();
  });

  it("starts from the last result of the exercise and lets the person repeat it", async () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadOnboardingDraft.mockResolvedValue(onboardingDraft);
    const initialSession = createWorkoutInit("alice", onboardingDraft).session;
    const firstExerciseId = initialSession.exerciseQueue[0].exerciseId;
    loadWorkoutSession.mockResolvedValue(initialSession);
    saveWorkoutSession.mockResolvedValue(undefined);
    listRecentExerciseResults.mockResolvedValue([
      {
        completedAt: "2026-09-01T10:00:00.000Z",
        exerciseId: firstExerciseId,
        loadKg: 22.5,
        reps: 9,
        rir: 2,
        sessionId: "previous",
        setIndex: 1,
        uid: "alice",
      },
    ]);

    render(<WorkoutPageClient autosaveDelayMs={0} />);

    await waitFor(() => {
      expect(screen.getByText(/Última vez/)).toBeTruthy();
    });
    // A carga começa pela última usada (`loadStrategy: last_used`)...
    expect((screen.getByLabelText("Carga") as HTMLInputElement).value).toBe("22.5");
    expect((screen.getByLabelText("Repetições") as HTMLInputElement).value).toBe("9");
    expect(screen.queryByRole("button", { name: "Repetir" })).toBeNull();

    // ...e, se a pessoa mudar, um toque volta ao último resultado.
    fireEvent.click(screen.getByRole("button", { name: "Aumentar carga" }));
    expect((screen.getByLabelText("Carga") as HTMLInputElement).value).toBe("25");
    fireEvent.click(screen.getByRole("button", { name: "Repetir" }));
    expect((screen.getByLabelText("Carga") as HTMLInputElement).value).toBe("22.5");
  });
});
