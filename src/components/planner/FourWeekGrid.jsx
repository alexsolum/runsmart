import { useEffect, useMemo } from "react";
import { currentMondayIso, getWeekIntent, isoDateOffset } from "../../lib/dateUtils";
import { WeekRow } from "./WeekRow";

export function FourWeekGrid({
  entries = [],
  loading = false,
  loadEntriesForRange,
  planId,
  blocks = [],
  onEdit,
  onToggleCompleted,
  onCreateForDate,
}) {
  const startMonday = useMemo(() => currentMondayIso(), []);
  const endIso = useMemo(() => isoDateOffset(startMonday, 27), [startMonday]);

  useEffect(() => {
    if (!planId || !loadEntriesForRange) return;
    loadEntriesForRange(planId, startMonday, endIso).catch(() => {});
  }, [endIso, loadEntriesForRange, planId, startMonday]);

  const weeks = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => {
        const weekStartIso = isoDateOffset(startMonday, index * 7);
        const weekEndIso = isoDateOffset(weekStartIso, 6);
        const weekEntries = entries.filter(
          (entry) =>
            entry?.workout_date >= weekStartIso &&
            entry?.workout_date <= weekEndIso,
        );
        const intent = getWeekIntent(blocks, planId, weekStartIso);
        return {
          weekStartIso,
          entries: weekEntries,
          targetKm: intent?.targetMileageKm ?? null,
        };
      }),
    [blocks, entries, planId, startMonday],
  );

  if (loading) {
    return (
      <div className="animate-pulse flex flex-col" style={{ gap: "var(--pa-space-6)" }}>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={`skeleton-${index}`} className="grid grid-cols-12 gap-4">
            <div className="col-span-11 grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div
                  key={`skeleton-day-${index}-${dayIndex}`}
                  className="rounded-xl min-h-[140px]"
                  style={{ background: "var(--pa-surface-container-low)" }}
                />
              ))}
            </div>
            <div
              className="col-span-1 rounded-xl min-h-[140px]"
              style={{ background: "var(--pa-surface-container-low)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "var(--pa-space-6)" }}>
      {weeks.map((week) => (
        <WeekRow
          key={week.weekStartIso}
          weekStartIso={week.weekStartIso}
          entries={week.entries}
          targetKm={week.targetKm}
          onEdit={onEdit}
          onToggleCompleted={onToggleCompleted}
          onCreateForDate={onCreateForDate}
        />
      ))}
    </div>
  );
}
