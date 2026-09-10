// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listRecentExerciseResults, useAuthSession } = vi.hoisted(() => ({
  listRecentExerciseResults: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("./history-repository", () => ({
  listRecentExerciseResults,
}));

import { ProgressCharts } from "./progress-charts";

const results = [
  {
    completedAt: "2026-09-01T12:00:00.000Z",
    exerciseId: "bench-press",
    loadKg: 60,
    reps: 10,
    rir: 2,
    sessionId: "s1",
    setIndex: 1,
    uid: "alice",
  },
  {
    completedAt: "2026-09-08T12:00:00.000Z",
    exerciseId: "bench-press",
    loadKg: 65,
    reps: 12,
    rir: 3,
    sessionId: "s2",
    setIndex: 1,
    uid: "alice",
  },
];

describe("ProgressCharts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({ status: "authenticated", user: { uid: "alice" } });
  });

  it("shows the volume series as an accessible table and the personal record", async () => {
    listRecentExerciseResults.mockResolvedValue(results);

    render(<ProgressCharts />);

    await waitFor(() => {
      // O id técnico ("bench-press") vira nome legível.
      expect(screen.getByText("Bench press")).toBeTruthy();
    });
    expect(listRecentExerciseResults).toHaveBeenCalledWith("alice", 8);
    expect(screen.getByText("Volume por sessão, da mais antiga para a mais recente")).toBeTruthy();
    expect(screen.getByText("01/09/2026")).toBeTruthy();
    expect(screen.queryByText("bench-press")).toBeNull();
    // Comparação só com dados reais: 600 kg → 780 kg.
    expect(screen.getByText(/30% de volume em relação ao treino anterior/)).toBeTruthy();
    expect(screen.getByText("780 kg")).toBeTruthy();
    expect(screen.getByText(/Recorde: 65 kg × 12 repetições/)).toBeTruthy();
  });

  it("offers a confirmable suggestion and never applies it by itself", async () => {
    listRecentExerciseResults.mockResolvedValue(results);

    render(<ProgressCharts />);

    await waitFor(() => {
      expect(screen.getByText(/Sugestão: aumentar a carga/)).toBeTruthy();
    });
    expect(screen.getByText(/nada é alterado automaticamente/)).toBeTruthy();
  });

  it("stays honest when there is no history", async () => {
    listRecentExerciseResults.mockResolvedValue([]);

    render(<ProgressCharts />);

    await waitFor(() => {
      expect(screen.getByText("Conclua um treino para ver sua evolução aqui.")).toBeTruthy();
    });
    expect(screen.getByText("Nenhum recorde registrado ainda.")).toBeTruthy();
  });
});
