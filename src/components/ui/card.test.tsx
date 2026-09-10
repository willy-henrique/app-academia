// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./card";

describe("Card", () => {
  it("renders semantic content using the default surface", () => {
    render(<Card aria-label="Treino de hoje">Upper A</Card>);

    const card = screen.getByRole("region", { name: "Treino de hoje" });
    expect(card.textContent).toBe("Upper A");
    expect(card.className).toContain("bg-wt-surface");
    // Cartões comuns não flutuam: só a borda separa o conteúdo.
    expect(card.className).not.toContain("shadow-wt-surface");
  });

  it("lifts only prioritary cards with the discrete system shadow", () => {
    render(
      <Card aria-label="Resumo semanal" elevated>
        Resumo semanal
      </Card>,
    );

    expect(screen.getByRole("region", { name: "Resumo semanal" }).className).toContain(
      "shadow-wt-surface",
    );
  });

  it("can render as a non-landmark element", () => {
    const { container } = render(<Card as="article">Supino reto</Card>);

    expect(container.firstElementChild?.tagName).toBe("ARTICLE");
  });
});
