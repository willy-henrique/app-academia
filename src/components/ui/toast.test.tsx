// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { ToastProvider, useToast } from "./toast";

function ToastTrigger({ repeat = false }: { repeat?: boolean }) {
  const { showToast } = useToast();

  useEffect(() => {
    const message = {
      description: "Seu treino foi salvo neste dispositivo.",
      id: "workout-saved",
      title: "Treino salvo",
      variant: "success" as const,
    };

    showToast(message);
    if (repeat) {
      showToast(message);
    }
  }, [repeat, showToast]);

  return null;
}

describe("ToastProvider", () => {
  it("announces a textual status and provides an accessible close action", async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    const toast = (await screen.findAllByRole("status")).find((node) =>
      node.textContent?.includes("Treino salvo"),
    );

    if (!toast) {
      throw new Error("Toast não apareceu.");
    }

    expect(toast.textContent).toContain("Treino salvo");
    expect(toast.textContent).toContain("Seu treino foi salvo neste dispositivo.");

    fireEvent.click(within(toast).getByRole("button", { name: "Fechar: Treino salvo" }));
    expect(screen.queryByRole("button", { name: "Fechar: Treino salvo" })).toBeNull();
  });

  it("deduplicates an event with the same id", async () => {
    render(
      <ToastProvider>
        <ToastTrigger repeat />
      </ToastProvider>,
    );

    const toasts = (await screen.findAllByRole("status")).filter((node) =>
      node.textContent?.includes("Treino salvo"),
    );

    expect(toasts).toHaveLength(1);
  });
});
