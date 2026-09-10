// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useAuthSession } = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
}));

vi.mock("./auth-session-provider", () => ({
  useAuthSession,
}));

import { AccountSecurityPanel } from "./account-security-panel";

describe("AccountSecurityPanel", () => {
  it("shows the current account email and the linking actions", () => {
    useAuthSession.mockReturnValue({
      mode: "firebase",
      status: "authenticated",
      user: { email: "willy@example.com" },
    });

    render(<AccountSecurityPanel />);

    expect(screen.getByText("willy@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vincular Google" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });
});
