import { StackedBar } from "./StackedBar";
import { StatusDot } from "./StatusDot";

function formatHours(totalHours) {
  const hours = Math.floor(totalHours);
  const minutes = Math.round((totalHours - hours) * 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function LoadColumn({ stats }) {
  const safeStats = stats ?? {
    totalKm: 0,
    totalHours: 0,
    zoneDistribution: { hard: 0, easy: 0, endurance: 0, other: 0 },
    status: "on-target",
  };

  const isEmpty = safeStats.totalKm === 0 && safeStats.totalHours === 0;

  return (
    <aside
      className="col-span-1 rounded-xl p-3 min-h-[140px] flex flex-col items-center justify-between"
      style={{
        background: "var(--pa-surface-container-low)",
        boxShadow: "var(--pa-shadow-card)",
      }}
    >
      {isEmpty ? (
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            fontSize: "var(--pa-text-label-sm)",
            fontFamily: "var(--pa-font-body)",
            color: "var(--pa-on-surface-variant)",
            opacity: 0.3,
          }}
        >
          —
        </div>
      ) : (
        <>
          <StackedBar distribution={safeStats.zoneDistribution} />
          <div className="mt-2 flex flex-col items-center gap-0.5">
            <span
              style={{
                fontSize: "var(--pa-text-body-md)",
                fontFamily: "var(--pa-font-display)",
                fontWeight: 700,
                color: "var(--pa-on-surface)",
              }}
            >
              {safeStats.totalKm} km
            </span>
            <span
              style={{
                fontSize: "var(--pa-text-label-sm)",
                fontFamily: "var(--pa-font-body)",
                color: "var(--pa-on-surface-variant)",
              }}
            >
              {formatHours(safeStats.totalHours)}
            </span>
            <StatusDot status={safeStats.status} />
          </div>
        </>
      )}
    </aside>
  );
}

