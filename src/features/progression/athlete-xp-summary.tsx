"use client";

import { useEffect, useState } from "react";

import { resolveWeekKey } from "@/domain/progression/week-key";
import { summarizeWeeklyHistory, type HistoryTotals } from "@/domain/progression/streak";
import { useAuthSession } from "@/features/auth/auth-session-provider";

import { AthleteXpCard } from "./athlete-xp-card";
import { listWeeklyStatsHistory, loadWeekPreferences } from "./weekly-stats-repository";

/** Janela do histórico usada para XP e sequência (≈ 1 ano, uma leitura paginada). */
const historyWeeks = 52;

/**
 * Liga o cartão de patente ao histórico semanal da própria pessoa. Se a leitura
 * falhar ou estivermos em modo local (sem Firebase), o cartão some em vez de
 * exibir números que não existem.
 */
export function AthleteXpSummary() {
  const { mode, status, user } = useAuthSession();
  const [totals, setTotals] = useState<HistoryTotals | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (mode === "local" || status !== "authenticated" || !user) {
      return;
    }

    let active = true;
    const uid = user.uid;

    async function load() {
      try {
        const [preferences, history] = await Promise.all([
          loadWeekPreferences(uid),
          listWeeklyStatsHistory(uid, historyWeeks),
        ]);
        if (!active) {
          return;
        }

        const currentWeekKey = resolveWeekKey(new Date(), {
          timeZone: preferences.timeZone,
          weekStartsOn: preferences.weekStartsOn,
        });
        setTotals(summarizeWeeklyHistory(history, currentWeekKey));
      } catch {
        if (active) {
          setUnavailable(true);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [mode, status, user]);

  if (mode === "local" || unavailable) {
    return null;
  }

  return <AthleteXpCard totals={totals} />;
}
