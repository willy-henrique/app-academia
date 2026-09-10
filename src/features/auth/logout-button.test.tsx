// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LogoutButton } from "./logout-button";

describe("LogoutButton", () => {
  it("shows a neutral confirmation after signing out", async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);

    render(<LogoutButton onLogout={onLogout}>Sair agora</LogoutButton>);

    fireEvent.click(screen.getByRole("button", { name: "Sair agora" }));

    await waitFor(() => {
      expect(onLogout).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toContain("Você saiu da conta.");
    });
  });
});
