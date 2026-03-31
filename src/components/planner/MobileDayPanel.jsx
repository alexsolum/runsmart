import { normalizeWorkoutType } from "../../domain/workoutTypes";
import { formatDayLabel } from "../../lib/dateUtils";
import { ConstraintMarker } from "./ConstraintMarker";
import { RaceCard } from "./RaceCard";
import { RestCard } from "./RestCard";
import { WorkoutCard } from "./WorkoutCard";

function isConstraintEntry(entry) {
  return (
    normalizeWorkoutType(entry?.workout_type) === "CONSTRAINT" ||
    String(entry?.workout_type ?? "").toLowerCase() === "constraint"
  );
}

export function MobileDayPanel({ isoDate, entries = [], onEdit, onToggleCompleted }) {
  const constraintEntry = entries.find((entry) => isConstraintEntry(entry));
  const workoutEntries = entries.filter((entry) => !isConstraintEntry(entry));

  function renderEntry(entry) {
    const typeKey = normalizeWorkoutType(entry.workout_type);
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
    <div className="px-4 py-3">
      <div
        style={{
          fontSize: "var(--pa-text-label-md)",
          fontFamily: "var(--pa-font-body)",
          fontWeight: 700,
          color: "var(--pa-on-surface-variant)",
          textTransform: "uppercase",
          marginBottom: "var(--pa-space-2)",
        }}
      >
        {formatDayLabel(isoDate)}
      </div>

      {workoutEntries.length === 0 && !constraintEntry ? (
        <div
          style={{
            fontSize: "var(--pa-text-label-sm)",
            fontFamily: "var(--pa-font-body)",
            color: "var(--pa-on-surface-variant)",
            opacity: 0.5,
            padding: "var(--pa-space-4) 0",
          }}
        >
          Ingen okter planlagt
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--pa-space-2)" }}>
          {workoutEntries.map(renderEntry)}
          {constraintEntry ? <ConstraintMarker reason={constraintEntry.description} /> : null}
        </div>
      )}
    </div>
  );
}
