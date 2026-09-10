"use client";

import type { Food } from "@/domain/nutrition/food";
import { createFoodLogEntry } from "@/domain/nutrition/food-log";
import { useEffect, useState } from "react";

import type { FoodLogEntry } from "@/domain/nutrition/food-log";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { createFoodLogEntryRequest, listFoodLogEntries } from "./food-log-repository";
import { FoodSearchPanel } from "./food-search-panel";

/** The catalogue can add food only to the signed-in person's private journal. */
export function FoodPageClient() {
  const { status, user } = useAuthSession();
  const [entries, setEntries] = useState<readonly FoodLogEntry[]>([]);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      if (!user) {
        return;
      }

      try {
        const nextEntries = await listFoodLogEntries(user.uid, 8);
        if (active) {
          setEntries(nextEntries);
        }
      } catch {
        // A busca do catálogo continua útil se o histórico estiver indisponível agora.
      }
    }

    void loadEntries();
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

  if (status !== "authenticated") {
    return null;
  }

  return <FoodSearchPanel entries={entries} onAddFood={addFood} />;
}
