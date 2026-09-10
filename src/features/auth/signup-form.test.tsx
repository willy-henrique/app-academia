// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SignUpForm } from "./signup-form";

describe("SignUpForm", () => {
  it("announces client validation without submitting an invalid password confirmation", async () => {
    const submitAccount = vi.fn();
    render(<SignUpForm submitAccount={submitAccount} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "very-secure-password" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "different-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("As senhas precisam ser iguais.");
    });
    expect(submitAccount).not.toHaveBeenCalled();
  });

  it("submits valid credentials and announces a non-sensitive success message", async () => {
    const submitAccount = vi.fn().mockResolvedValue(undefined);
    render(<SignUpForm submitAccount={submitAccount} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "very-secure-password" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(submitAccount).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toContain("Conta criada.");
    });
  });

  it("shows the failure on screen instead of only announcing it", async () => {
    const submitAccount = vi
      .fn()
      .mockRejectedValue(new Error("Este email já possui uma conta. Entre ou redefina sua senha."));
    render(<SignUpForm submitAccount={submitAccount} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "very-secure-password" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: "very-secure-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert.textContent).toContain("Este email já possui uma conta.");
      // Regressão: a mensagem já foi renderizada só para leitores de tela,
      // deixando quem enxerga sem nenhuma pista de que o cadastro falhou.
      expect(alert.className).not.toContain("sr-only");
    });
  });
});
