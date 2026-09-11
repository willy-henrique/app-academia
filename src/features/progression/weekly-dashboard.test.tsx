// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  listWeeklyStatsHistory,
  loadWeekPreferences,
  loadWeeklyStats,
  rebuildWeeklyStatsRequest,
  useAuthSession,
} = vi.hoisted(() => ({
  listWeeklyStatsHistory: vi.fn(),
  loadWeekPreferences: vi.fn(),
  loadWeeklyStats: vi.fn(),
  rebuildWeeklyStatsRequest: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

vi.mock("./weekly-stats-repository", () => ({
  listWeeklyStatsHistory,
  loadWeekPreferences,
  loadWeeklyStats,
  rebuildWeeklyStatsRequest,
}));

import { WeeklyDashboard } from "./weekly-dashboard";

const now = new Date("2026-09-09T12:00:00.000Z");

describe("WeeklyDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({ status: "authenticated", user: { uid: "alice" } });
    loadWeekPreferences.mockResolvedValue({
      plannedTarget: 3,
      timeZone: "America/Sao_Paulo",
      weekStartsOn: "monday",
    });
  });

  it("shows the real numbers of the signed-in account for the current week", async () => {
    loadWeeklyStats.mockResolvedValue({
      cardioSessions: 1,
      completedWorkouts: 4,
      extraWorkouts: 2,
      groupWorkouts: 1,
      plannedTarget: 3,
      plannedWorkouts: 2,
      soloWorkouts: 3,
      timeZone: "America/Sao_Paulo",
      totalReps: 320,
      totalSets: 40,
      totalVolumeKg: 9600,
      uid: "alice",
      weekKey: "2026-09-07",
      weekStartsOn: "monday",
    });

    render(<WeeklyDashboard now={now} />);

    await waitFor(() => {
      expect(screen.getByText("Semana de 07/09/2026 · começa na segunda")).toBeTruthy();
    });
    // A semana pedida é a do fuso da pessoa, não a do relógio do servidor.
    expect(loadWeeklyStats).toHaveBeenCalledWith("alice", "2026-09-07");
    expect(screen.getByText("Treinos do plano").nextSibling?.textContent).toBe("2 de 3");
    expect(screen.getByText("Treinos extras").nextSibling?.textContent).toBe("+2");
    expect(screen.getByText("Treinos em grupo").nextSibling?.textContent).toBe("1");
    expect(screen.getByText(/Adesão ao plano: 67%/)).toBeTruthy();
    // Nada de identificador técnico (fuso IANA) na tela.
    expect(screen.queryByText(/America\/Sao_Paulo/)).toBeNull();
  });

  it("renders an empty week without inventing numbers", async () => {
    loadWeeklyStats.mockResolvedValue(null);

    render(<WeeklyDashboard now={now} />);

    await waitFor(() => {
      expect(screen.getByText("Treinos do plano").nextSibling?.textContent).toBe("0 de 3");
    });
    expect(screen.getByText(/Adesão ao plano: 0%/)).toBeTruthy();
  });

  it("lists previous weeks on demand", async () => {
    loadWeeklyStats.mockResolvedValue(null);
    listWeeklyStatsHistory.mockResolvedValue([
      {
        cardioSessions: 0,
        completedWorkouts: 3,
        extraWorkouts: 1,
        groupWorkouts: 0,
        plannedTarget: 3,
        plannedWorkouts: 2,
        soloWorkouts: 3,
        timeZone: "America/Sao_Paulo",
        totalReps: 200,
        totalSets: 25,
        totalVolumeKg: 5000,
        uid: "alice",
        weekKey: "2026-08-31",
        weekStartsOn: "monday",
      },
    ]);

    render(<WeeklyDashboard now={now} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ver semanas anteriores" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ver semanas anteriores" }));

    await waitFor(() => {
      expect(screen.getByText("Semana de 31/08/2026")).toBeTruthy();
    });
    expect(listWeeklyStatsHistory).toHaveBeenCalledWith("alice", 8);
  });

  it("keeps the home version light and points to Evolução", async () => {
    loadWeeklyStats.mockResolvedValue(null);

    render(<WeeklyDashboard compact now={now} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Evolução/ }).getAttribute("href")).toBe("/progress");
    });
    expect(screen.queryByRole("button", { name: "Recalcular esta semana" })).toBeNull();
  });

  it("offers a retry when the week cannot be loaded", async () => {
    loadWeeklyStats.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(null);

    render(<WeeklyDashboard now={now} />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Não conseguimos carregar sua semana",
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => {
      expect(screen.getByText("Treinos do plano").nextSibling?.textContent).toBe("0 de 3");
    });
  });

  it("asks the server to rebuild the week from the source of truth", async () => {
    loadWeeklyStats.mockResolvedValue(null);
    rebuildWeeklyStatsRequest.mockResolvedValue({ events: 2, weekKey: "2026-09-07" });

    render(<WeeklyDashboard now={now} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Recalcular esta semana" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Recalcular esta semana" }));

    await waitFor(() => {
      expect(rebuildWeeklyStatsRequest).toHaveBeenCalledWith("2026-09-07");
    });
    // Depois de recalcular, o dashboard relê a projeção do servidor.
    await waitFor(() => {
      expect(loadWeeklyStats).toHaveBeenCalledTimes(2);
    });
  });
});
