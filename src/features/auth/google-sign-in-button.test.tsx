// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GoogleAccountConflictError } from "./google-auth";
import { GoogleSignInButton } from "./google-sign-in-button";

describe("GoogleSignInButton", () => {
  it("announces redirect fallback", async () => {
    render(<GoogleSignInButton signIn={vi.fn().mockResolvedValue("REDIRECT_STARTED")} />);

    fireEvent.click(screen.getByRole("button", { name: "Continuar com Google" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Redirecionando para o Google.");
    });
  });

  it("explains the provider conflict without exposing personal data", async () => {
    render(
      <GoogleSignInButton signIn={vi.fn().mockRejectedValue(new GoogleAccountConflictError())} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continuar com Google" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("outro método de entrada");
    });
  });
});
