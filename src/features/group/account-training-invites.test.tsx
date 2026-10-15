// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useAuthSession, useRouter } = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/navigation", () => ({ useRouter }));
vi.mock("@/features/auth/auth-session-provider", () => ({ useAuthSession }));
vi.mock("./training-invite-inbox", () => ({
  TrainingInviteInbox: () => <div>Caixa de convites</div>,
}));

import { AccountTrainingInvites } from "./account-training-invites";

describe("AccountTrainingInvites", () => {
  it("does not start Firebase-only invitations in local development", () => {
    useAuthSession.mockReturnValue({ mode: "local", user: { uid: "local-willy" } });

    render(<AccountTrainingInvites />);

    expect(screen.getByRole("heading", { name: "Treinar com alguém" })).toBeTruthy();
    expect(screen.getByText(/Firebase estiver conectado/i)).toBeTruthy();
    expect(screen.queryByText("Caixa de convites")).toBeNull();
  });

  it("shows the live invitation inbox for an authenticated Firebase account", () => {
    useAuthSession.mockReturnValue({ mode: "firebase", user: { uid: "willy" } });

    render(<AccountTrainingInvites />);

    expect(screen.getByText("Caixa de convites")).toBeTruthy();
  });
});
