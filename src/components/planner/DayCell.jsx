import { normalizeWorkoutType } from "../../domain/workoutTypes";
import { formatDayLabel, todayIso } from "../../lib/dateUtils";
import { AddAffordance } from "./AddAffordance";
import { ConstraintMarker } from "./ConstraintMarker";
import { RaceCard } from "./RaceCard";
import { RestCard } from "./RestCard";
import { WorkoutCard } from "./WorkoutCard";

function isConstraintEntry(entry) {
  const rawType = String(entry?.workout_type ?? "").toLowerCase();
  return rawType === "constraint" || normalizeWorkoutType(entry?.workout_type) === "CONSTRAINT";
}

export function DayCell({
  isoDate,
  entries = [],
  onEdit,
  onToggleCompleted,
  onCreateForDate,
}) {
  const isToday = isoDate === todayIso();
  const constraintEntry = entries.find((entry) => isConstraintEntry(entry));
  const workoutEntries = entries.filter((entry) => !isConstraintEntry(entry));
  const hasConstraint = Boolean(constraintEntry);

  function renderEntry(entry) {
    const typeKey = normalizeWorkoutType(entry?.workout_type);
    if (typeKey === "REST") return <RestCard key={entry.id} />;
    if (typeKey === "RACE_EVENT") return <RaceCard key={entry.id} entry={entry} />;
    return (
      <WorkoutCard
        key={entry.id}
        entry={entry}
        onEdit={onEdit}
        onToggleCompleted={onToggleCompleted}
      />
    );
  }

  return (
    <article
      className={`rounded-xl p-3 min-h-[140px] flex flex-col ${isToday ? "ring-2" : ""}`}
      style={{
        background: "var(--pa-surface-container-lowest)",
        boxShadow: "var(--pa-shadow-card)",
        ...(isToday ? { boxShadow: `0 0 0 2px var(--pa-outline), var(--pa-shadow-card)` } : {}),
        ...(hasConstraint ? {
          borderWidth: "1px",
          borderStyle: "dashed",
          borderColor: "var(--pa-outline)",
        } : {}),
      }}
    >
      <div
        className="mb-2"
        style={{
          fontSize: "var(--pa-text-label-sm)",
          fontFamily: "var(--pa-font-body)",
          fontWeight: 700,
          color: "var(--pa-on-surface-variant)",
        }}
      >
        {formatDayLabel(isoDate)}
      </div>

      {workoutEntries.length > 0 ? (
        <div className="flex flex-col gap-1">{workoutEntries.map((entry) => renderEntry(entry))}</div>
      ) : null}

      {constraintEntry ? <ConstraintMarker reason={constraintEntry.description} /> : null}

      {workoutEntries.length === 0 && !constraintEntry ? (
        <div className="mt-auto">
          <AddAffordance onAdd={() => onCreateForDate?.(isoDate)} />
        </div>
      ) : null}
    </article>
  );
}
