// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PasswordResetForm } from "./password-reset-form";

describe("PasswordResetForm", () => {
  it("displays the same neutral confirmation after the request", async () => {
    const requestReset = vi.fn().mockResolvedValue(undefined);
    render(<PasswordResetForm requestReset={requestReset} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));

    await waitFor(() => {
      expect(requestReset).toHaveBeenCalledWith({ email: "willy@example.com" });
      expect(screen.getByRole("alert").textContent).toContain("Se existir uma conta");
    });
  });
});
