// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HelpPage from "./page";

describe("HelpPage", () => {
  it("guides a first-time person to preferences, workout videos and progress", () => {
    render(<HelpPage />);

    expect(screen.getByRole("heading", { name: "Como usar o WillTreino" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /1. Ajuste suas preferências/i }).getAttribute("href"),
    ).toBe("/onboarding");
    expect(screen.getByRole("link", { name: "Abrir treino" }).getAttribute("href")).toBe(
      "/workout",
    );
    expect(screen.getByText("Vídeos de execução")).toBeTruthy();
    expect(screen.getByText("Quem consegue ver meus dados?")).toBeTruthy();
  });
});
