// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LiveRegion } from "./live-region";
import { SkipLink } from "./skip-link";
import { VisuallyHidden } from "./visually-hidden";

describe("accessibility primitives", () => {
  it("provides a skip link and visually hidden descriptive text", () => {
    render(
      <>
        <SkipLink />
        <VisuallyHidden>Descanso concluído</VisuallyHidden>
      </>,
    );

    expect(screen.getByRole("link", { name: "Pular para o conteúdo" }).getAttribute("href")).toBe(
      "#main-content",
    );
    expect(screen.getByText("Descanso concluído").className).toContain("sr-only");
  });

  it("announces polite and urgent updates without moving focus", () => {
    const { container } = render(
      <>
        <LiveRegion>João concluiu a série 2.</LiveRegion>
        <LiveRegion politeness="assertive">Verifique sua segurança.</LiveRegion>
      </>,
    );

    expect(screen.getByRole("status").textContent).toContain("João concluiu a série 2.");
    expect(screen.getByRole("alert").textContent).toContain("Verifique sua segurança.");
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(2);
  });

  it("can render the same announcement visibly, without duplicating it", () => {
    const { container } = render(
      <LiveRegion politeness="assertive" visible>
        Não foi possível criar sua conta.
      </LiveRegion>,
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Não foi possível criar sua conta.");
    expect(alert.className).not.toContain("sr-only");
    // Uma única região viva: anunciar duas vezes faria o leitor de tela repetir.
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });
});
