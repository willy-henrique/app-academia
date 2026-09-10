// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace, useAuthSession } = vi.hoisted(() => ({
  replace: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("./auth-session-provider", () => ({
  useAuthSession,
}));

import { AuthGate } from "./auth-gate";

describe("AuthGate", () => {
  beforeEach(() => {
    replace.mockReset();
    useAuthSession.mockReset();
  });

  it("redirects anonymous users away from protected content", async () => {
    useAuthSession.mockReturnValue({ status: "anonymous", user: null });

    render(<AuthGate>Conteúdo protegido</AuthGate>);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
  });

  it("renders protected content when the session is authenticated", () => {
    useAuthSession.mockReturnValue({
      status: "authenticated",
      user: { email: "willy@example.com" },
    });

    render(<AuthGate>Conteúdo protegido</AuthGate>);

    expect(screen.getByText("Conteúdo protegido")).toBeTruthy();
  });

  it("shows an accessible session state while Firebase is loading", () => {
    useAuthSession.mockReturnValue({ status: "loading", user: null });

    render(<AuthGate>Conteúdo protegido</AuthGate>);

    expect(screen.getByRole("status").textContent).toContain("Conferindo sua sessão");
    expect(screen.queryByText("Conteúdo protegido")).toBeNull();
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
  });
});
