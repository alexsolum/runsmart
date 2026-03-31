import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { WORKOUT_TYPES, normalizeWorkoutType } from "../../domain/workoutTypes";

function formatMetric(workout) {
  if (typeof workout?.distanceKm === "number" && !Number.isNaN(workout.distanceKm)) {
    return `${workout.distanceKm} km`;
  }
  if (typeof workout?.durationMinutes === "number" && !Number.isNaN(workout.durationMinutes)) {
    return `${workout.durationMinutes} min`;
  }
  return "Details in workout";
}

export function PlanWorkoutCard({ workout, onWorkoutSelect, isOverlay = false }) {
  const typeKey = normalizeWorkoutType(workout?.type);
  const meta = WORKOUT_TYPES[typeKey] ?? WORKOUT_TYPES.EASY;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: workout.id,
    data: {
      workout,
    },
    disabled: isOverlay, // Overlay doesn't need to be draggable itself
  });

  if (isDragging && !isOverlay) {
    return <div ref={setNodeRef} className="h-20 w-full rounded-2xl bg-slate-100/50 border-2 border-dashed border-slate-300" />;
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => onWorkoutSelect?.(workout)}
      className={cn(
        "w-full rounded-2xl px-3 py-2 text-left transition-transform",
        !isOverlay && "hover:-translate-y-0.5",
        isOverlay && "cursor-grabbing shadow-xl rotate-2"
      )}
      style={{
        background: `var(${meta.colorContainerToken})`,
        borderLeft: `3px solid var(${meta.colorToken})`,
        touchAction: "none", // Prevent scrolling while dragging on touch devices
      }}
    >
      <div
        className="truncate text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: `var(${meta.colorToken})` }}
      >
        {workout?.type ?? meta.label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-slate-900">
        {workout?.name ?? "Planned session"}
      </div>
      <div className="mt-1 text-xs text-slate-600">{formatMetric(workout)}</div>
      {workout?.humanReadable ? (
        <div className="mt-1 truncate text-xs text-slate-500">{workout.humanReadable}</div>
      ) : null}
    </button>
  );
}
