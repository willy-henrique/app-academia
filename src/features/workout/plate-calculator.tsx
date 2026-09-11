"use client";

import { useMemo } from "react";

type PlateCalculationProps = Readonly<{
  barbellWeightKg?: number;
  targetWeightKg: number;
}>;

/**
 * Calculadora Visual de Anilhas (Plate Calculator).
 * Resolve um dos maiores problemas de quem treina pesado na academia:
 * "Quanto de anilha coloco de cada lado da barra?".
 */
export function PlateCalculator({ barbellWeightKg = 20, targetWeightKg }: PlateCalculationProps) {
  const calculation = useMemo(() => {
    if (targetWeightKg <= barbellWeightKg) {
      return null;
    }

    const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
    const weightPerSide = (targetWeightKg - barbellWeightKg) / 2;
    let remaining = weightPerSide;
    const platesPerSide: number[] = [];

    for (const plate of availablePlates) {
      while (remaining >= plate - 0.01) {
        platesPerSide.push(plate);
        remaining -= plate;
      }
    }

    return {
      platesPerSide,
      remainingWeight: remaining,
      weightPerSide,
    };
  }, [barbellWeightKg, targetWeightKg]);

  if (!calculation || calculation.platesPerSide.length === 0) {
    return null;
  }

  // Cores olímpicas/padrão para anilhas
  const plateColors: Record<number, string> = {
    1.25: "bg-slate-300 text-slate-800",
    2.5: "bg-zinc-700 text-white",
    5: "bg-white border border-slate-300 text-slate-900",
    10: "bg-emerald-600 text-white",
    15: "bg-amber-500 text-white",
    20: "bg-blue-600 text-white",
    25: "bg-rose-600 text-white",
  };

  return (
    <div className="rounded-wt-md border border-wt-border bg-wt-surface-elevated/60 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-wt-text-secondary">
          Anilhas por lado <span className="font-normal">(Barra {barbellWeightKg}kg)</span>:
        </span>
        <span className="font-bold text-wt-accent-text">{calculation.weightPerSide} kg / lado</span>
      </div>

      {/* Visual Barbell Representation */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto py-1">
        <div className="h-6 w-2 rounded-sm bg-slate-400" title="Trava da barra" />
        {calculation.platesPerSide.map((plate, index) => {
          const colorClass = plateColors[plate] ?? "bg-slate-500 text-white";
          const heightClass = plate >= 20 ? "h-10 w-4" : plate >= 10 ? "h-8 w-3.5" : "h-6 w-3";

          return (
            <div
              key={index}
              className={`flex shrink-0 items-center justify-center rounded-sm font-mono text-[0.65rem] font-black shadow-xs ${heightClass} ${colorClass}`}
              title={`${plate} kg`}
            >
              {plate}
            </div>
          );
        })}
        <div className="h-2 flex-1 min-w-[2rem] rounded-full bg-slate-300" />
      </div>
    </div>
  );
}
