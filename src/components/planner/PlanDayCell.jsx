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
    ? (week?.isRecoveryWeek === true ? "Rest" : "—")
    : null;

  return (
    <div
      ref={setNodeRef}
      data-testid={`day-cell-${day?.date}`}
      className={cn(
        "flex min-h-[190px] flex-col rounded-2xl transition-all p-3",
      )}
      style={{
        background: isOver ? "var(--accent-race-soft)" : "var(--surface)",
        boxShadow: isOver ? "var(--shadow-lift)" : "none",
        transform: isOver ? "scale(1.02)" : undefined,
      }}
    >
      <div className="mb-2">
        <div
          style={{
            fontFamily: "var(--font-family-mono)",
            fontSize: 10,
            color: "var(--ink-muted)",
            letterSpacing: "0.06em",
          }}
        >
          {formatDayDate(day?.date)}
        </div>
      </div>

      {workouts.length > 0 ? (
        <div className="flex flex-1 flex-col gap-2">
          {workouts.map((workout) => (
            <PlanWorkoutCard
              key={workout.id}
              workout={workout}
              dayDate={day.date}
              onWorkoutSelect={() => onWorkoutSelect?.(workout, { week, day })}
            />
          ))}
        </div>
      ) : (
        <div
          className="mt-auto px-2 py-3 text-center"
          style={{
            fontFamily: "var(--font-family-mono)",
            fontSize: 11,
            color: "var(--ink-muted)",
            opacity: 0.5,
          }}
        >
          {emptyCopy}
        </div>
      )}
    </div>
  );
}
