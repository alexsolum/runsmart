import { useMemo } from "react";
import { computeWeeklyLoadStats } from "../../domain/compute";
import { weekDays } from "../../lib/dateUtils";
import { DayCell } from "./DayCell";
import { LoadColumn } from "./LoadColumn";

export function WeekRow({
  weekStartIso,
  entries = [],
  targetKm = null,
  onEdit,
  onToggleCompleted,
  onCreateForDate,
}) {
  const days = useMemo(() => weekDays(weekStartIso), [weekStartIso]);
  const stats = useMemo(
    () => computeWeeklyLoadStats(entries, targetKm),
    [entries, targetKm],
  );

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-11 grid grid-cols-7 gap-4">
        {days.map((isoDate) => (
          <DayCell
            key={isoDate}
            isoDate={isoDate}
            entries={entries.filter((entry) => entry.workout_date === isoDate)}
            onEdit={onEdit}
            onToggleCompleted={onToggleCompleted}
            onCreateForDate={onCreateForDate}
          />
        ))}
      </div>
      <LoadColumn stats={stats} />
    </div>
  );
}
