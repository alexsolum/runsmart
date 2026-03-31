import { Check } from "lucide-react";
import { WORKOUT_TYPES, normalizeWorkoutType } from "../../domain/workoutTypes";

export function WorkoutCard({ entry, onEdit, onToggleCompleted }) {
  const typeKey = normalizeWorkoutType(entry?.workout_type);
  const meta = WORKOUT_TYPES[typeKey] ?? WORKOUT_TYPES.EASY;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit?.(entry)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onEdit?.(entry);
      }}
      className="relative cursor-pointer rounded-lg px-2 py-1.5 transition-shadow duration-150 ease-in-out hover:shadow-[var(--pa-shadow-ambient)]"
      style={{
        background: `var(${meta.colorContainerToken})`,
        borderLeft: `3px solid var(${meta.colorToken})`,
        opacity: entry.completed ? 0.6 : 1,
      }}
    >
      <button
        type="button"
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded border"
        style={{
          borderColor: `var(${meta.colorToken})`,
          background: entry.completed ? `var(${meta.colorToken})` : "transparent",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCompleted?.(entry.id, entry.completed);
        }}
        aria-label={entry.completed ? "Merk som ikke fullfort" : "Merk som fullfort"}
      >
        {entry.completed ? <Check size={12} className="text-white" /> : null}
      </button>
      <div
        className="truncate"
        style={{
          fontSize: "var(--pa-text-label-md)",
          fontFamily: "var(--pa-font-body)",
          fontWeight: 700,
          color: `var(${meta.colorToken})`,
        }}
      >
        {meta.label}
      </div>
      {entry?.description ? (
        <div
          className="mt-0.5 truncate"
          style={{
            fontSize: "var(--pa-text-label-sm)",
            fontFamily: "var(--pa-font-body)",
            fontWeight: 400,
            opacity: 0.7,
            color: `var(${meta.colorToken})`,
          }}
        >
          {entry.description}
        </div>
      ) : null}
    </div>
  );
}
