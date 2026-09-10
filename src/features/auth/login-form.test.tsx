// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("announces a generic failure without revealing account existence", async () => {
    const login = vi.fn().mockRejectedValue(new Error("auth/user-not-found"));
    render(<LoginForm login={login} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Não foi possível entrar agora.");
    });
    expect(screen.getByRole("alert").textContent).not.toContain("user-not-found");
  });

  it("submits valid credentials and delegates the next navigation", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const onSuccess = vi.fn();
    render(<LoginForm login={login} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "willy@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secure-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "willy@example.com",
        password: "secure-password",
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
