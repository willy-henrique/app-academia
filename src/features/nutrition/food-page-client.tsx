"use client";

import type { Food } from "@/domain/nutrition/food";
import { createFoodLogEntry } from "@/domain/nutrition/food-log";
import { createRecipe, type CreateRecipeInput, type Recipe } from "@/domain/nutrition/recipe";
import { useEffect, useState } from "react";

import type { FoodLogEntry } from "@/domain/nutrition/food-log";
import { useAuthSession } from "@/features/auth/auth-session-provider";
import { internalFoods } from "@/infrastructure/nutrition/internal-food-provider";

import { createFoodLogEntryRequest, listFoodLogEntries } from "./food-log-repository";
import { FoodSearchPanel } from "./food-search-panel";
import { RecipePanel } from "./recipe-panel";
import { listRecipes, saveRecipe } from "./recipe-repository";

/** The catalogue can add food only to the signed-in person's private journal. */
export function FoodPageClient() {
  const { status, user } = useAuthSession();
  const [entries, setEntries] = useState<readonly FoodLogEntry[]>([]);
  const [recipes, setRecipes] = useState<readonly Recipe[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPrivateNutrition() {
      if (!user) {
        return;
      }

      try {
        const [nextEntries, nextRecipes] = await Promise.all([
          listFoodLogEntries(user.uid, 8),
          listRecipes(user.uid, 12),
        ]);
        if (active) {
          setEntries(nextEntries);
          setRecipes(nextRecipes);
        }
      } catch {
        // A busca do catálogo continua útil se o histórico estiver indisponível agora.
      }
    }

    void loadPrivateNutrition();
    return () => {
      active = false;
    };
  }, [user]);

  async function addFood(food: Food) {
    if (!user) {
      throw new Error("É necessário entrar na conta para registrar uma refeição.");
    }

    const entry = createFoodLogEntry({
      food,
      id: `food-log-${crypto.randomUUID()}`,
      ownerUid: user.uid,
    });
    const saved = await createFoodLogEntryRequest(entry);
    setEntries((current) => [saved, ...current].slice(0, 8));
  }

  async function addRecipe(input: Omit<CreateRecipeInput, "id" | "ownerUid">) {
    if (!user) {
      throw new Error("É necessário entrar na conta para salvar uma receita.");
    }

    const recipe = createRecipe({
      ...input,
      id: `recipe-${crypto.randomUUID()}`,
      ownerUid: user.uid,
    });
    const saved = await saveRecipe(recipe);
    setRecipes((current) => [saved, ...current].slice(0, 12));
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <FoodSearchPanel
      entries={entries}
      onAddFood={addFood}
      recipeContent={
        <RecipePanel foods={internalFoods} onSaveRecipe={addRecipe} recipes={recipes} />
      }
    />
  );
}
