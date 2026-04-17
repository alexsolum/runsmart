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

export function PlanWorkoutCard({ workout, dayDate, onWorkoutSelect, isOverlay = false }) {
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
      dayDate,
    },
    disabled: isOverlay, // Overlay doesn't need to be draggable itself
  });

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        className="h-20 w-full rounded-2xl"
        style={{ background: "var(--paper-raised)", opacity: 0.5 }}
      />
    );
  }

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={() => onWorkoutSelect?.(workout)}
      className={cn(
        "w-full rounded-xl px-3 py-2 text-left transition-transform",
        !isOverlay && "hover:-translate-y-0.5",
        isOverlay && "cursor-grabbing rotate-2"
      )}
      style={{
        background: `var(${meta.colorContainerToken})`,
        borderLeft: `2px solid var(${meta.colorToken})`,
        boxShadow: isOverlay ? "var(--shadow-lift)" : undefined,
        touchAction: "none",
      }}
    >
      {/* Workout type — italic serif badge */}
      <div
        className="truncate"
        style={{
          fontFamily: "var(--font-family-serif)",
          fontStyle: "italic",
          fontSize: 11,
          color: `var(${meta.colorToken})`,
          lineHeight: 1.3,
        }}
      >
        {workout?.type ?? meta.label}
      </div>
      {/* Workout name */}
      <div
        className="mt-0.5 truncate text-xs font-semibold"
        style={{ color: "var(--ink)" }}
      >
        {workout?.name ?? "Planned session"}
      </div>
      {/* Distance / duration in mono */}
      <div
        style={{
          fontFamily: "var(--font-family-mono)",
          fontSize: 11,
          color: "var(--ink-muted)",
          marginTop: 2,
        }}
      >
        {formatMetric(workout)}
      </div>
      {workout?.humanReadable ? (
        <div
          className="mt-1 truncate"
          style={{
            fontSize: 10,
            color: "var(--ink-muted)",
            fontFamily: "var(--font-family-sans)",
          }}
        >
          {workout.humanReadable}
        </div>
      ) : null}
    </button>
  );
}
