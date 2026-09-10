// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { Dumbbell, House, UserRound } from "lucide-react";
import { describe, expect, it } from "vitest";

import { DesktopNav } from "./desktop-nav";

const sections = [
  {
    items: [
      { href: "/dashboard", icon: House, label: "Início" },
      { href: "/workout", icon: Dumbbell, label: "Treino" },
    ],
    label: "Treinar",
  },
];
const footerItems = [{ href: "/account", icon: UserRound, label: "Conta" }];

describe("DesktopNav", () => {
  it("exposes product navigation with the selected route", () => {
    render(<DesktopNav currentPath="/workout" footerItems={footerItems} sections={sections} />);

    expect(screen.getByRole("link", { name: "WillTreino" }).getAttribute("href")).toBe(
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Treino" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Conta" }).getAttribute("aria-current")).toBeNull();
  });

  it("only shows from desktop widths and keeps accessible touch targets", () => {
    const { container } = render(<DesktopNav currentPath="/" sections={sections} />);
    const view = within(container);

    // Até 1023 px a navegação inferior assume: nunca as duas ao mesmo tempo.
    expect(container.firstElementChild?.className).toContain("hidden");
    expect(container.firstElementChild?.className).toContain("lg:block");
    expect(view.getByRole("link", { name: "Início" }).className).toContain("min-h-11");
  });

  it("does not mark a route as active by a shared prefix", () => {
    render(<DesktopNav currentPath="/workouts-archive" sections={sections} />);

    expect(screen.getByRole("link", { name: "Treino" }).getAttribute("aria-current")).toBeNull();
  });
});
