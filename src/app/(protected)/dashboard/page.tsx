import { HomeGreeting } from "@/features/home/home-greeting";
import { HomeShortcuts } from "@/features/home/home-shortcuts";
import { WeeklyDashboard } from "@/features/progression/weekly-dashboard";
import { TodayWorkoutCard } from "@/features/workout/today-workout-card";

/**
 * Início: responde primeiro "o que eu faço agora?" (treino de hoje), depois
 * "como está minha semana?" e só então oferece atalhos. Gráficos moram em
 * Evolução para a home não virar painel de BI.
 */
export default function DashboardPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <HomeGreeting />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <TodayWorkoutCard />
        <WeeklyDashboard compact />
      </div>
      <HomeShortcuts />
    </main>
  );
}
