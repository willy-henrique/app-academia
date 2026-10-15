// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecipePanel } from "./recipe-panel";

const food = {
  aliases: [],
  barcode: null,
  brand: null,
  defaultServing: { amount: 1, grams: 120, label: "1 filé médio", unit: "UNIT" as const },
  id: "chicken-breast",
  name: "Peito de frango grelhado",
  nutritionPer100g: {
    carbohydratesGrams: 0,
    energyKcal: 165,
    fatGrams: 3.6,
    fiberGrams: null,
    proteinGrams: 31,
    sodiumMilligrams: 74,
  },
  source: {
    attribution: "Catálogo WillTreino",
    collectedAt: null,
    confidence: "ESTIMATED" as const,
    license: null,
    provider: "INTERNAL" as const,
    sourceId: null,
    url: null,
  },
};

describe("RecipePanel", () => {
  it("builds an ingredient list and delegates a coherent recipe input", async () => {
    const onSaveRecipe = vi.fn().mockResolvedValue(undefined);
    render(<RecipePanel foods={[food]} onSaveRecipe={onSaveRecipe} recipes={[]} />);

    fireEvent.change(screen.getByLabelText("Nome da receita"), {
      target: { value: "Frango grelhado" },
    });
    fireEvent.change(screen.getByLabelText("Quantidade (g)"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar ingrediente/ }));

    expect(screen.getByText("Peito de frango grelhado · 150 g")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar receita" }));

    await waitFor(() => {
      expect(onSaveRecipe).toHaveBeenCalledWith({
        ingredients: [{ food, grams: 150 }],
        name: "Frango grelhado",
        servings: 1,
      });
    });
    expect(screen.getByText(/Receita privada salva/)).toBeTruthy();
  });

  it("does not submit a recipe without an ingredient", () => {
    const onSaveRecipe = vi.fn();
    render(<RecipePanel foods={[food]} onSaveRecipe={onSaveRecipe} recipes={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Salvar receita" }));

    expect(onSaveRecipe).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe o nome/)).toBeTruthy();
  });
});
