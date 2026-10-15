import { HomeGreeting } from "@/features/home/home-greeting";
import { HomeShortcuts } from "@/features/home/home-shortcuts";
import { AthleteXpSummary } from "@/features/progression/athlete-xp-summary";
import { WeeklyDashboard } from "@/features/progression/weekly-dashboard";
import { WeeklyScheduleMap } from "@/features/progression/weekly-schedule-map";
import { TodayWorkoutCard } from "@/features/workout/today-workout-card";

/**
 * Início: responde "o que eu faço agora?" primeiro (treino de hoje), depois o
 * contexto da semana (agenda, metas) e por último a patente e os atalhos.
 */
export default function DashboardPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <HomeGreeting />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <TodayWorkoutCard />
        <WeeklyDashboard compact />
      </div>
      <WeeklyScheduleMap />
      <AthleteXpSummary />
      <HomeShortcuts />
    </main>
  );
}
