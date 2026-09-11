import { HomeGreeting } from "@/features/home/home-greeting";
import { HomeShortcuts } from "@/features/home/home-shortcuts";
import { WeeklyDashboard } from "@/features/progression/weekly-dashboard";
import { TodayWorkoutCard } from "@/features/workout/today-workout-card";
import { WeeklyScheduleMap } from "@/features/progression/weekly-schedule-map";
import { AthleteXpCard } from "@/features/progression/athlete-xp-card";

/**
 * Inicio: responde "o que eu faco agora?", mostra o nivel/XP do atleta,
 * o mapa semanal dos dias com split muscular e metricas da semana.
 */
export default function DashboardPage() {
  return (
    <main className="wt-page space-y-8" id="main-content">
      <HomeGreeting />
      <AthleteXpCard stats={null} totalWorkouts={1} streakWeeks={1} />
      <WeeklyScheduleMap stats={null} daysPerWeek={4} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
        <TodayWorkoutCard />
        <WeeklyDashboard compact />
      </div>
      <HomeShortcuts />
    </main>
  );
}
