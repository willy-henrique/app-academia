// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthSession } = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

import { PublicProfileCard } from "./public-profile-card";

describe("PublicProfileCard", () => {
  beforeEach(() => {
    useAuthSession.mockReset();
  });

  it("loads and shows the current public profile", async () => {
    const getIdToken = vi.fn().mockResolvedValue("firebase-id-token");
    useAuthSession.mockReturnValue({ status: "authenticated", user: { getIdToken } });

    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          accountState: "ACTIVE",
          avatar: null,
          displayName: "Willy",
          publicUserId: "WT-7FK3-Q9LP",
        }),
      ok: true,
    }) as typeof fetch;

    render(<PublicProfileCard />);

    await waitFor(() => {
      expect(screen.getByText("Willy")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Copiar ID" })).toBeTruthy();
      expect(screen.getByText("WT-7FK3-Q9LP")).toBeTruthy();
    });
  });
});
