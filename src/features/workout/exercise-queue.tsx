import { Check } from "lucide-react";

import type { WorkoutSession } from "@/domain/workout/session";

type ExerciseQueueProps = Readonly<{
  activeIndex: number | null;
  queue: WorkoutSession["exerciseQueue"];
}>;

/**
 * Sequência do treino: concluído (check + texto), atual (destaque + "agora") e
 * pendente. O estado aparece em texto e forma, nunca só em cor.
 */
export function ExerciseQueue({ activeIndex, queue }: ExerciseQueueProps) {
  return (
    <ol className="m-0 grid list-none gap-1 p-0">
      {queue.map((item, index) => {
        const done = item.completedSets >= item.prescription.sets;
        const active = index === activeIndex;
        const status = done ? "Concluído" : active ? "Agora" : "Pendente";

        return (
          <li
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-3 rounded-wt-md px-3 py-2.5 ${
              active ? "bg-wt-accent-subtle" : ""
            }`}
            key={`${item.order}-${item.exerciseId}`}
          >
            <span
              aria-hidden="true"
              className={`grid size-7 shrink-0 place-items-center rounded-wt-full text-xs font-bold wt-tabular ${
                done
                  ? "bg-wt-success-subtle text-wt-success-text"
                  : active
                    ? "bg-wt-accent-hover text-wt-accent-foreground"
                    : "border border-wt-border text-wt-text-secondary-strong"
              }`}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-wt-label ${
                  active ? "font-semibold text-wt-text-primary" : "font-medium text-wt-text-primary"
                } ${done ? "text-wt-text-secondary-strong" : ""}`}
              >
                {item.exerciseName}
              </span>
              <span className="block text-xs text-wt-text-secondary-strong wt-tabular">
                {item.completedSets}/{item.prescription.sets} séries · {status}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
