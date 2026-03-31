import { useMemo } from "react";
import { computeWeeklyLoadStats } from "../../domain/compute";

export function MobileLoadSummary({ entries = [], targetKm = null }) {
  const stats = useMemo(() => computeWeeklyLoadStats(entries, targetKm), [entries, targetKm]);
  const { totalKm, totalHours } = stats;
  const isEmpty = totalKm === 0 && totalHours === 0;

  const hours = Math.floor(totalHours);
  const mins = Math.round((totalHours - hours) * 60);
  const timeLabel = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;
  const kmLabel = totalKm >= 10 ? `${Math.round(totalKm)} km` : `${totalKm.toFixed(1)} km`;

  return (
    <div
      className="px-4 py-2 text-center"
      style={{
        fontSize: "var(--pa-text-label-md)",
        fontFamily: "var(--pa-font-body)",
        fontWeight: 400,
        color: "var(--pa-on-surface-variant)",
      }}
    >
      {isEmpty ? "—" : `${kmLabel} · ${timeLabel}`}
    </div>
  );
}
