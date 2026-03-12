import React, { useState, useEffect } from "react";

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtKm(meters) {
  if (!meters) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}

function fmtDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function fmtRelativeDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getPaceSecPerKm(activity) {
  if (Number(activity.average_pace) > 0) return Number(activity.average_pace);
  if (activity.moving_time && activity.distance && Number(activity.distance) > 0) {
    return (Number(activity.moving_time) / Number(activity.distance)) * 1000;
  }
  return 0;
}

// ─── HR Zone Bar ──────────────────────────────────────────────────────────────

const ZONE_COLORS = [
  "bg-slate-400",   // Z1
  "bg-blue-500",    // Z2
  "bg-green-500",   // Z3
  "bg-amber-500",   // Z4
  "bg-red-500",     // Z5
];

function HRZoneBar({ activity }) {
  const z1 = Number(activity.hr_zone_1_seconds) || 0;
  const z2 = Number(activity.hr_zone_2_seconds) || 0;
  const z3 = Number(activity.hr_zone_3_seconds) || 0;
  const z4 = Number(activity.hr_zone_4_seconds) || 0;
  const z5 = Number(activity.hr_zone_5_seconds) || 0;
  const total = z1 + z2 + z3 + z4 + z5;

  const tooltipTitle = `HR Zone distribution: ${z1}s / ${z2}s / ${z3}s / ${z4}s / ${z5}s`;

  if (total > 0) {
    const zones = [z1, z2, z3, z4, z5];
    return (
      <div
        title={tooltipTitle}
        className="flex h-2 w-20 rounded-sm overflow-hidden"
      >
        {zones.map((sec, i) => {
          const pct = (sec / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={i}
              className={ZONE_COLORS[i]}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
    );
  }

  // Fallback: suffer_score
  const suffer = Number(activity.suffer_score) || 0;
  if (suffer > 0) {
    let color = "bg-blue-300";
    if (suffer >= 100) color = "bg-red-400";
    else if (suffer >= 50) color = "bg-amber-400";
    return (
      <div title={`Suffer score: ${suffer}`} className="flex h-2 w-20 rounded-sm overflow-hidden">
        <div className={`${color} w-full`} />
      </div>
    );
  }

  return (
    <div title="No HR zone data" className="flex h-2 w-20 rounded-sm overflow-hidden">
      <div className="bg-slate-100 w-full" />
    </div>
  );
}

// ─── Table primitives ─────────────────────────────────────────────────────────

const TH = ({ children, right }) => (
  <th
    className={`py-2.5 px-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap ${right ? "text-right" : "text-left"}`}
  >
    {children}
  </th>
);

const TD = ({ children, right, mono, mobileHide }) => (
  <td
    className={`py-[11px] px-4 text-sm ${right ? "text-right" : ""} ${mono ? "font-mono text-xs" : ""} ${mobileHide ? "hidden sm:table-cell" : ""}`}
  >
    {children}
  </td>
);

/**
 * ActivitiesTable — paginated activity list with HR zone bar.
 * Presentation only — no Supabase calls.
 *
 * @param {{ activities: object[], pageSize?: number }} props
 */
export default function ActivitiesTable({ activities, pageSize = 10 }) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever activities list changes
  useEffect(() => {
    setPage(1);
  }, [activities]);

  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        No activities for this period. Sync Strava to populate your history.
      </p>
    );
  }

  const total = activities.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageItems = activities.slice(start, end);

  return (
    <div>
      <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
        <table className="w-full text-sm" aria-label="Strava Activity History">
          <thead>
            <tr className="border-b border-border/60">
              <TH>Activity</TH>
              <TH right>Distance</TH>
              <TH right>Duration</TH>
              <TH right>Pace</TH>
              <TH right>HR</TH>
              <TH>Effort</TH>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((activity) => {
              const pace = getPaceSecPerKm(activity);
              const hr = Number(activity.average_heartrate);
              return (
                <tr
                  key={activity.id}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <TD>
                    <span className="font-medium text-foreground line-clamp-1 max-w-[180px] block">
                      {activity.name || activity.type || "Workout"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtRelativeDate(activity.started_at)}
                    </span>
                  </TD>
                  <TD right mono>
                    {fmtKm(activity.distance)}
                  </TD>
                  <td className="py-[11px] px-4 text-right font-mono text-xs hidden sm:table-cell">
                    {fmtDuration(activity.moving_time)}
                  </td>
                  <TD right mono>
                    {fmtPace(pace)}
                  </TD>
                  <TD right>
                    <span className="font-mono text-xs">
                      {hr > 0 ? `${hr} bpm` : "—"}
                    </span>
                  </TD>
                  <TD>
                    <HRZoneBar activity={activity} />
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-3 px-1 text-sm text-muted-foreground">
        <span>
          Showing {start + 1}–{end} of {total}
        </span>
        <div className="flex gap-2">
          <button
            disabled={safePage === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded border text-xs disabled:opacity-40"
          >
            Forrige
          </button>
          <span className="px-2 py-1 text-xs">
            {safePage} / {totalPages}
          </span>
          <button
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border text-xs disabled:opacity-40"
          >
            Neste
          </button>
        </div>
      </div>
    </div>
  );
}
