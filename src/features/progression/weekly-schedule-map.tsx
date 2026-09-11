import { Check, Dumbbell, Moon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { WeeklyStats } from "@/domain/progression/weekly-stats";

type DaySchedule = {
  dayName: string;
  shortName: string;
  dayIndex: number; // 0 = Seg ... 6 = Dom
  isToday: boolean;
  isCompleted: boolean;
  isRest: boolean;
  focus: string;
};

type WeeklyScheduleMapProps = {
  stats: WeeklyStats | null;
  daysPerWeek?: number;
  now?: Date;
};

const muscleSplitsByDays: Record<number, string[]> = {
  2: ["Full Body A", "Full Body B", "Descanso", "Descanso", "Descanso", "Descanso", "Descanso"],
  3: ["Peito & Tríceps", "Costas & Bíceps", "Pernas & Ombros", "Descanso", "Descanso", "Descanso", "Descanso"],
  4: ["Peito & Tríceps", "Costas & Bíceps", "Descanso", "Pernas & Glúteos", "Ombros & Abdômen", "Descanso", "Descanso"],
  5: ["Peito & Tríceps", "Costas & Bíceps", "Pernas Completo", "Ombros & Trapézio", "Braços & Abdômen", "Descanso", "Descanso"],
  6: ["Peito (Push A)", "Costas (Pull A)", "Pernas (Legs A)", "Peito & Ombros (Push B)", "Costas & Bíceps (Pull B)", "Pernas (Legs B)", "Descanso"],
};

export function WeeklyScheduleMap({ stats, daysPerWeek = 4, now = new Date() }: WeeklyScheduleMapProps) {
  // 0 = Domingo, 1 = Segunda, ...
  const currentDayOfWeek = now.getDay();
  // Ajuste para começar na Segunda (0 = Seg, 1 = Ter, ... 6 = Dom)
  const todayMondayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const plannedSplits = muscleSplitsByDays[daysPerWeek] || muscleSplitsByDays[4];
  const completedCount = stats?.completedWorkouts ?? 0;

  const dayNames = [
    { full: "Segunda", short: "SEG" },
    { full: "Terça", short: "TER" },
    { full: "Quarta", short: "QUA" },
    { full: "Quinta", short: "QUI" },
    { full: "Sexta", short: "SEX" },
    { full: "Sábado", short: "SÁB" },
    { full: "Domingo", short: "DOM" },
  ];

  const days: DaySchedule[] = dayNames.map((d, index) => {
    const isToday = index === todayMondayIndex;
    const focus = plannedSplits[index] || "Descanso";
    const isRest = focus === "Descanso";
    // Marca como completado se for dia anterior ou hoje caso já tenha feito treinos
    const isCompleted = !isRest && index <= todayMondayIndex && completedCount > 0 && index < completedCount;

    return {
      dayName: d.full,
      shortName: d.short,
      dayIndex: index,
      isToday,
      isCompleted,
      isRest,
      focus,
    };
  });

  return (
    <Card className="space-y-4 p-5 sm:p-6" elevated>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-wt-md bg-wt-accent-subtle text-wt-accent-hover">
              <Dumbbell className="size-4" />
            </span>
            <h3 className="wt-text-h3 text-wt-text-primary">Mapa da Semana</h3>
          </div>
          <p className="text-wt-body-sm text-wt-text-secondary">
            Sua divisão muscular e frequência planejada de {daysPerWeek} dias.
          </p>
        </div>

        <Badge tone="accent" className="self-start sm:self-auto">
          {completedCount} de {daysPerWeek} treinos feitos
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => {
          const isCurrent = day.isToday;

          return (
            <div
              key={day.dayIndex}
              className={`relative flex flex-col justify-between rounded-wt-lg border p-3 transition-all ${
                isCurrent
                  ? "border-wt-accent-hover bg-wt-accent-subtle/30 shadow-sm ring-2 ring-wt-accent-hover/30"
                  : day.isCompleted
                    ? "border-wt-success/40 bg-wt-success-subtle/20"
                    : day.isRest
                      ? "border-wt-border/50 bg-wt-surface opacity-75"
                      : "border-wt-border bg-wt-surface hover:border-wt-border-strong"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[0.6875rem] font-black tracking-wider ${
                  isCurrent ? "text-wt-accent-hover" : "text-wt-text-secondary"
                }`}>
                  {day.shortName}
                </span>

                {day.isCompleted ? (
                  <span className="grid size-5 place-items-center rounded-full bg-wt-success text-white">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                ) : isCurrent ? (
                  <span className="flex size-2 rounded-full bg-wt-accent-hover animate-pulse" />
                ) : day.isRest ? (
                  <Moon className="size-3.5 text-wt-text-secondary/60" />
                ) : null}
              </div>

              <div className="mt-3">
                <p className={`text-xs font-bold leading-tight ${
                  isCurrent
                    ? "text-wt-text-primary"
                    : day.isRest
                      ? "text-wt-text-secondary"
                      : "text-wt-text-primary"
                }`}>
                  {day.focus}
                </p>
                <p className="mt-1 text-[0.65rem] text-wt-text-secondary">
                  {isCurrent ? "Hoje" : day.isRest ? "Recuperação" : "Planejado"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
