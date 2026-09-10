// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFirebaseClientServices, httpsCallable, useAuthSession } = vi.hoisted(() => ({
  getFirebaseClientServices: vi.fn(),
  httpsCallable: vi.fn(),
  useAuthSession: vi.fn(),
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("@/infrastructure/firebase/client", () => ({
  getFirebaseClientServices,
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

import { AccountPrivacyPanel } from "./account-privacy-panel";

describe("AccountPrivacyPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthSession.mockReturnValue({ status: "authenticated", user: { uid: "alice" } });
    getFirebaseClientServices.mockReturnValue({ functions: "functions" });
    URL.createObjectURL = vi.fn().mockReturnValue("blob:willtreino");
    URL.revokeObjectURL = vi.fn();
  });

  it("exports the account data as a downloadable file", async () => {
    const callable = vi.fn().mockResolvedValue({ data: { data: {}, uid: "alice" } });
    httpsCallable.mockReturnValue(callable);

    render(<AccountPrivacyPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Baixar meus dados" }));

    await waitFor(() => {
      expect(httpsCallable).toHaveBeenCalledWith("functions", "exportAccountData");
    });
    expect(screen.getByText(/arquivo foi baixado/)).toBeTruthy();
  });

  it("keeps the deletion button disabled until the confirmation matches", async () => {
    render(<AccountPrivacyPanel />);

    const button = screen.getByRole("button", { name: "Excluir conta definitivamente" });
    expect(button.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Confirmação (EXCLUIR)"), {
      target: { value: "excluir" },
    });
    expect(
      screen
        .getByRole("button", { name: "Excluir conta definitivamente" })
        .hasAttribute("disabled"),
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Confirmação (EXCLUIR)"), {
      target: { value: "EXCLUIR" },
    });
    expect(
      screen
        .getByRole("button", { name: "Excluir conta definitivamente" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });

  it("sends the literal confirmation to the server", async () => {
    const callable = vi.fn().mockResolvedValue({ data: { deletedDocuments: 3 } });
    httpsCallable.mockReturnValue(callable);

    render(<AccountPrivacyPanel />);
    fireEvent.change(screen.getByLabelText("Confirmação (EXCLUIR)"), {
      target: { value: "EXCLUIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Excluir conta definitivamente" }));

    await waitFor(() => {
      expect(callable).toHaveBeenCalledWith({ confirmation: "EXCLUIR" });
    });
    expect(screen.getByText(/Conta excluída/)).toBeTruthy();
  });
});
