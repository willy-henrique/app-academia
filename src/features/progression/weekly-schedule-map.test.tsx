// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadNotificationPreferences, loadWeekPreferences, loadWeeklyStats, useAuthSession } =
  vi.hoisted(() => ({
    loadNotificationPreferences: vi.fn(),
    loadWeekPreferences: vi.fn(),
    loadWeeklyStats: vi.fn(),
    useAuthSession: vi.fn(),
  }));

vi.mock("@/features/auth/auth-session-provider", () => ({ useAuthSession }));
vi.mock("./weekly-stats-repository", () => ({ loadWeekPreferences, loadWeeklyStats }));
vi.mock("@/features/settings/notification-preferences-repository", () => ({
  loadNotificationPreferences,
}));

import { WeeklyScheduleMap } from "./weekly-schedule-map";

const now = new Date("2026-09-09T12:00:00.000Z");

describe("WeeklyScheduleMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({
      mode: "firebase",
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadWeekPreferences.mockResolvedValue({
      plannedTarget: 3,
      timeZone: "America/Sao_Paulo",
      weekStartsOn: "monday",
    });
    loadWeeklyStats.mockResolvedValue({ completedWorkouts: 2 });
    loadNotificationPreferences.mockResolvedValue({ showWeeklyGoalReminder: true });
  });

  it("loads the signed-in person's frequency and never assigns a completion to a guessed day", async () => {
    render(<WeeklyScheduleMap now={now} />);

    await waitFor(() => {
      expect(screen.getByText("2 de 3 treinos concluídos")).toBeTruthy();
    });
    expect(loadWeeklyStats).toHaveBeenCalledWith("alice", "2026-09-07");
    expect(screen.getByText("Peito & Tríceps")).toBeTruthy();
    expect(screen.queryByText("Concluído")).toBeNull();
    expect(
      screen.getByText("Lembrete no app: faltam 1 treino para sua meta semanal."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir treino/ }).getAttribute("href")).toBe(
      "/workout",
    );
  });

  it("keeps a useful, Firebase-free agenda in local mode", () => {
    useAuthSession.mockReturnValue({
      mode: "local",
      status: "authenticated",
      user: { uid: "local" },
    });

    render(<WeeklyScheduleMap now={now} />);

    expect(screen.getByText("0 de 4 treinos concluídos")).toBeTruthy();
    expect(loadWeekPreferences).not.toHaveBeenCalled();
  });
});
