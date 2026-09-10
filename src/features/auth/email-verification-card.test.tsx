// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmailVerificationCard } from "./email-verification-card";

describe("EmailVerificationCard", () => {
  it("sends a verification link and throttles another request", async () => {
    const requestVerification = vi.fn().mockResolvedValue("SENT");
    render(
      <EmailVerificationCard
        getStatus={vi.fn().mockResolvedValue("UNVERIFIED")}
        requestVerification={requestVerification}
      />,
    );

    const requestButton = await screen.findByRole("button", { name: "Enviar link de verificação" });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(requestVerification).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("button", { name: /Reenviar em 60s/ }).hasAttribute("disabled")).toBe(
        true,
      );
      expect(screen.getByRole("alert").textContent).toContain("Enviamos um link de verificação");
    });
  });

  it("does not expose a verification action without authentication", async () => {
    render(<EmailVerificationCard getStatus={vi.fn().mockResolvedValue("AUTH_REQUIRED")} />);

    expect((await screen.findByRole("alert")).textContent).toContain("Entre na sua conta");
    expect(screen.queryByRole("button", { name: "Enviar link de verificação" })).toBeNull();
  });
});
