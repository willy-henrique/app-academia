// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("uses a native button and triggers its action", () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Começar treino</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Começar treino" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("announces loading and prevents duplicate actions", () => {
    render(<Button loading>Salvar</Button>);

    const button = screen.getByRole("button", { name: "Carregando" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("offers semantic variants for success and dangerous actions", () => {
    render(
      <>
        <Button variant="success">Concluir</Button>
        <Button variant="danger">Excluir</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Concluir" }).className).toContain("bg-wt-success");
    expect(screen.getByRole("button", { name: "Excluir" }).className).toContain("bg-wt-danger");
  });

  it("keeps an icon and its label as separate flex items so the gap applies", () => {
    render(
      <Button>
        <span aria-hidden="true">G</span>
        Continuar com Google
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Continuar com Google" });

    // Envolver todo o children num único span colava o ícone no texto
    // ("GContinuar com Google"), porque o gap do flex só separa irmãos.
    expect(button.childElementCount).toBe(1);
    expect(button.firstElementChild?.textContent).toBe("G");
    expect(button.lastChild?.textContent).toBe("Continuar com Google");
  });
});
