import { beforeEach, describe, expect, it, vi } from "vitest";

const { doc, getDoc, getFirebaseClientServices, serverTimestamp, setDoc } = vi.hoisted(() => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getFirebaseClientServices: vi.fn(),
  serverTimestamp: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({ doc, getDoc, serverTimestamp, setDoc }));
vi.mock("@/infrastructure/firebase/client", () => ({ getFirebaseClientServices }));

import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "./notification-preferences-repository";

describe("notification preferences repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doc.mockImplementation((_firestore: string, ...parts: string[]) => parts.join("/"));
    serverTimestamp.mockReturnValue("server-time");
    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: { uid: "alice" } },
      firestore: "firestore",
    });
  });

  it("falls back safely when the account has no settings document", async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    await expect(loadNotificationPreferences("alice")).resolves.toEqual({
      showWeeklyGoalReminder: true,
    });
  });

  it("reads only the validated nested preference", async () => {
    getDoc.mockResolvedValue({
      data: () => ({ notificationPreferences: { showWeeklyGoalReminder: false } }),
      exists: () => true,
    });

    await expect(loadNotificationPreferences("alice")).resolves.toEqual({
      showWeeklyGoalReminder: false,
    });
    expect(getDoc).toHaveBeenCalledWith("userSettings/alice");
  });

  it("writes validated preferences to the current user's document", async () => {
    await expect(saveNotificationPreferences({ showWeeklyGoalReminder: false })).resolves.toEqual({
      showWeeklyGoalReminder: false,
    });

    expect(setDoc).toHaveBeenCalledWith(
      "userSettings/alice",
      {
        createdAt: "server-time",
        notificationPreferences: { showWeeklyGoalReminder: false },
        updatedAt: "server-time",
      },
      { merge: true },
    );
  });

  it("does not write when there is no signed-in user", async () => {
    getFirebaseClientServices.mockReturnValue({
      auth: { currentUser: null },
      firestore: "firestore",
    });

    await expect(saveNotificationPreferences({ showWeeklyGoalReminder: true })).rejects.toThrow(
      "É necessário entrar na conta",
    );
    expect(setDoc).not.toHaveBeenCalled();
  });
});
