// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, hasFirebaseClientConfig, onAuthStateChanged } = vi.hoisted(
  () => ({
    getFirebaseClientServices: vi.fn(),
    hasFirebaseClientConfig: vi.fn(() => true),
    onAuthStateChanged: vi.fn(),
  }),
);

vi.mock("firebase/auth", () => ({ onAuthStateChanged }));
vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
  hasFirebaseClientConfig,
}));

import { AuthSessionProvider, useAuthSession } from "./auth-session-provider";

function SessionStatus() {
  const session = useAuthSession();

  return (
    <div>
      <span>{session.status}</span>
      <span>{session.user?.email ?? "sem-usuario"}</span>
    </div>
  );
}

describe("AuthSessionProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
    hasFirebaseClientConfig.mockReturnValue(true);
  });

  it("exposes the authenticated user after Firebase resolves the session", async () => {
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback({ email: "willy@example.com" });
      return vi.fn();
    });

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("authenticated")).toBeTruthy();
      expect(screen.getByText("willy@example.com")).toBeTruthy();
    });
  });

  it("reports anonymous when Firebase has no current session", async () => {
    getFirebaseClientServices.mockReturnValue({ auth: "firebase-auth" });
    onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return vi.fn();
    });

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeTruthy();
      expect(screen.getByText("sem-usuario")).toBeTruthy();
    });
  });

  it("reports anonymous instead of hanging when the Firebase config is missing", () => {
    hasFirebaseClientConfig.mockReturnValue(false);

    render(
      <AuthSessionProvider>
        <SessionStatus />
      </AuthSessionProvider>,
    );

    expect(screen.getByText("anonymous")).toBeTruthy();
    expect(screen.getByText("sem-usuario")).toBeTruthy();
    expect(getFirebaseClientServices).not.toHaveBeenCalled();
    expect(onAuthStateChanged).not.toHaveBeenCalled();
  });
});
