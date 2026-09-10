// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { Dumbbell, House, UserRound } from "lucide-react";
import { describe, expect, it } from "vitest";

import { MobileNav, type NavigationItem } from "./mobile-nav";

const items: NavigationItem[] = [
  { href: "/dashboard", icon: House, label: "Início" },
  { href: "/workout", icon: Dumbbell, label: "Treino", matches: ["/group"] },
  { href: "/account", icon: UserRound, label: "Conta" },
];

describe("MobileNav", () => {
  it("identifies the active route with semantic navigation links", () => {
    render(<MobileNav currentPath="/workout" items={items} />);

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Treino" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Início" }).getAttribute("aria-current")).toBeNull();
  });

  it("marks an area active for its related routes", () => {
    render(<MobileNav currentPath="/group/session-1" items={items} />);

    expect(screen.getByRole("link", { name: "Treino" }).getAttribute("aria-current")).toBe("page");
  });

  it("preserves the touch target and safe area styles", () => {
    const { container } = render(<MobileNav currentPath="/dashboard" items={items} />);
    const view = within(container);

    const nav = view.getByRole("navigation");
    expect(nav.className).toContain("safe-area-inset-bottom");
    expect(nav.className).toContain("lg:hidden");
    expect(view.getByRole("link", { name: "Início" }).className).toContain("min-h-11");
  });
});
