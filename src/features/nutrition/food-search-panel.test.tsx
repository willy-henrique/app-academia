// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FoodSearchPanel } from "./food-search-panel";

describe("FoodSearchPanel", () => {
  it("shows a result with its serving, source and approximate macros", async () => {
    render(<FoodSearchPanel />);

    fireEvent.change(screen.getByRole("textbox", { name: "Qual alimento você procura?" }), {
      target: { value: "feijao" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Feijão carioca cozido" })).toBeTruthy();
    });
    expect(screen.getByText("1 concha média")).toBeTruthy();
    expect(screen.getByText("Catálogo WillTreino · estimativa")).toBeTruthy();
    expect(screen.getByText("65,4 kcal")).toBeTruthy();
  });

  it("does not make a request for an unsafe short query", () => {
    render(<FoodSearchPanel />);

    fireEvent.change(screen.getByRole("textbox", { name: "Qual alimento você procura?" }), {
      target: { value: "a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(screen.getByRole("status").textContent).toMatch(/pelo menos 2 caracteres/);
  });

  it("adds a found food only through the explicit private diary action", async () => {
    const onAddFood = vi.fn().mockResolvedValue(undefined);
    render(<FoodSearchPanel onAddFood={onAddFood} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Qual alimento você procura?" }), {
      target: { value: "banana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Adicionar ao diário" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao diário" }));

    await waitFor(() => {
      expect(onAddFood).toHaveBeenCalledWith(expect.objectContaining({ id: "banana-fresh" }));
    });
    expect(screen.getByText(/foi adicionado ao seu diário privado/)).toBeTruthy();
  });
});
