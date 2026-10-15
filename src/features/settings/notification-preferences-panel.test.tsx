// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loadNotificationPreferences, saveNotificationPreferences, useAuthSession } = vi.hoisted(
  () => ({
    loadNotificationPreferences: vi.fn(),
    saveNotificationPreferences: vi.fn(),
    useAuthSession: vi.fn(),
  }),
);

vi.mock("@/features/auth/auth-session-provider", () => ({ useAuthSession }));
vi.mock("./notification-preferences-repository", () => ({
  loadNotificationPreferences,
  saveNotificationPreferences,
}));

import { NotificationPreferencesPanel } from "./notification-preferences-panel";

describe("NotificationPreferencesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({
      mode: "firebase",
      status: "authenticated",
      user: { uid: "alice" },
    });
    loadNotificationPreferences.mockResolvedValue({ showWeeklyGoalReminder: false });
    saveNotificationPreferences.mockResolvedValue({ showWeeklyGoalReminder: true });
  });

  it("loads and saves the signed-in person's in-app reminder choice", async () => {
    render(<NotificationPreferencesPanel />);

    const checkbox = screen.getByRole("checkbox", { name: "Exibir lembrete no Início" });
    await waitFor(() => {
      expect((checkbox as HTMLInputElement).checked).toBe(false);
    });
    expect(loadNotificationPreferences).toHaveBeenCalledWith("alice");

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Salvar lembretes" }));

    await waitFor(() => {
      expect(saveNotificationPreferences).toHaveBeenCalledWith({ showWeeklyGoalReminder: true });
    });
    expect(screen.getByText("Preferência de lembrete salva.")).toBeTruthy();
  });

  it("does not simulate persistent settings in local mode", () => {
    useAuthSession.mockReturnValue({
      mode: "local",
      status: "authenticated",
      user: { uid: "local" },
    });

    render(<NotificationPreferencesPanel />);

    expect(screen.getByText(/modo local/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Salvar lembretes" })).toBeNull();
    expect(loadNotificationPreferences).not.toHaveBeenCalled();
  });
});
