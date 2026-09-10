import type { Metadata } from "next";
import dynamic from "next/dynamic";

import { PageHeader } from "@/components/layout/page-header";
import { WeeklyDashboard } from "@/features/progression/weekly-dashboard";

export const metadata: Metadata = {
  title: "Evolução · WillTreino",
};

// Gráficos entram sob demanda: o resumo semanal não espera pelo histórico.
const ProgressCharts = dynamic(() =>
  import("@/features/progression/progress-charts").then((module) => module.ProgressCharts),
);

/** Evolução: semana, histórico de semanas, volume por treino e recordes. */
export default function ProgressPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <PageHeader
        description="Seu ritmo da semana, o volume dos últimos treinos e seus recordes — só com dados reais."
        title="Evolução"
      />
      <WeeklyDashboard />
      <ProgressCharts />
    </main>
  );
}
