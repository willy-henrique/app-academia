// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { usePathname, useAuthSession } = vi.hoisted(() => ({
  useAuthSession: vi.fn(() => ({ mode: "firebase", status: "authenticated", user: null })),
  usePathname: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname,
}));

vi.mock("@/features/auth/auth-session-provider", () => ({
  useAuthSession,
}));

import { AppShell, mobileNavigationItems } from "./app-shell";

function renderShell() {
  return render(
    <AppShell>
      <main id="main-content">Conteúdo</main>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("gives every authenticated area a reachable navigation", () => {
    usePathname.mockReturnValue("/dashboard");
    renderShell();

    // Destinos frequentes aparecem nas duas navegações (só uma fica visível por viewport).
    for (const label of ["Início", "Treino", "Cardio", "Evolução", "Conta"]) {
      expect(screen.getAllByRole("link", { name: label })).toHaveLength(2);
    }
    // Alimentação fica no desktop; no celular é alcançada pelos atalhos do Início.
    expect(screen.getAllByRole("link", { name: "Alimentação" })).toHaveLength(1);
    expect(screen.getByText("Conteúdo")).toBeTruthy();
  });

  it("keeps the mobile bar within five destinations", () => {
    expect(mobileNavigationItems.length).toBeLessThanOrEqual(5);
  });

  it("marks the current route in both navigations", () => {
    usePathname.mockReturnValue("/cardio");
    renderShell();

    const current = screen
      .getAllByRole("link", { name: "Cardio" })
      .map((link) => link.getAttribute("aria-current"));
    expect(current).toEqual(["page", "page"]);
    expect(
      screen.getAllByRole("link", { name: "Treino" })[0].getAttribute("aria-current"),
    ).toBeNull();
  });

  it("treats the group room as part of the workout area", () => {
    usePathname.mockReturnValue("/group/abc123");
    renderShell();

    expect(
      screen.getAllByRole("link", { name: "Treino" }).map((link) => link.getAttribute("aria-current")),
    ).toEqual(["page", "page"]);
  });

  it("keeps room for the fixed mobile bar so the last element stays reachable", () => {
    usePathname.mockReturnValue("/workout");

    const { container } = renderShell();

    const content = within(container).getByText("Conteúdo").parentElement;
    expect(content?.className).toContain("pb-[calc(var(--wt-mobile-nav-height)");
    expect(content?.className).toContain("lg:pb-0");
  });

  it("offers a skip link before the navigation for keyboard and screen reader", () => {
    usePathname.mockReturnValue("/dashboard");
    renderShell();

    const skipLink = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(skipLink.getAttribute("href")).toBe("#main-content");
    // O atalho é o primeiro foco possível da página.
    expect(document.querySelectorAll("a")[0]).toBe(skipLink);
  });
});
