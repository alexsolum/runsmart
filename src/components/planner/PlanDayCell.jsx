import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { PlanWorkoutCard } from "./PlanWorkoutCard";

function formatDayDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PlanDayCell({ day, week, onWorkoutSelect }) {
  const { isOver, setNodeRef } = useDroppable({
    id: day.date,
    data: {
      day,
    },
  });

  const workouts = day?.workouts ?? [];
  const emptyCopy = workouts.length === 0
    ? (week?.isRecoveryWeek === true ? "Rest day" : "No session planned")
    : null;

  return (
    <div
      ref={setNodeRef}
      data-testid={`day-cell-${day?.date}`}
      className={cn(
        "flex min-h-[190px] flex-col rounded-3xl border transition-all p-3",
        isOver ? "border-primary bg-primary/5 shadow-inner scale-[1.02]" : "border-slate-200 bg-white/90"
      )}
    >
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {day?.dayOfWeek}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{formatDayDate(day?.date)}</div>
      </div>

      {workouts.length > 0 ? (
        <div className="flex flex-1 flex-col gap-2">
          {workouts.map((workout) => (
            <PlanWorkoutCard
              key={workout.id}
              workout={workout}
              onWorkoutSelect={() => onWorkoutSelect?.(workout, { week, day })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-auto rounded-2xl bg-slate-50 px-3 py-4 text-sm font-medium text-slate-500">
          {emptyCopy}
        </div>
      )}
    </div>
  );
}
