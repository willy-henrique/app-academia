// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("opens with an accessible name and closes with Escape", async () => {
    render(
      <Dialog
        description="Esta ação pode ser desfeita mais tarde."
        title="Finalizar treino"
        trigger={<button type="button">Abrir confirmação</button>}
      >
        <button type="button">Confirmar</button>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir confirmação" }));

    const modal = await screen.findByRole("dialog", { name: "Finalizar treino" });
    expect(modal.textContent).toContain("Esta ação pode ser desfeita mais tarde.");
    expect(modal.textContent).toContain("Confirmar");

    fireEvent.keyDown(modal, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("returns focus to its trigger after closing", async () => {
    render(
      <Dialog title="Pausar treino" trigger={<button type="button">Pausar</button>}>
        Pausar agora?
      </Dialog>,
    );

    const trigger = screen.getByRole("button", { name: "Pausar" });
    fireEvent.click(trigger);

    fireEvent.click(await screen.findByRole("button", { name: "Fechar diálogo" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });
});
