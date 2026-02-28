import { Badge } from "@/components/ui/badge";

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

// ─── Effort meta ─────────────────────────────────────────────────────────────

function effortMeta(activity) {
  const hz = activity.heart_rate_zones;
  if (!hz) return null;
  const hard = (hz.z4 || 0) + (hz.z5 || 0);
  const total = Object.values(hz).reduce((s, v) => s + (Number(v) || 0), 0);
  if (!total) return null;
  const pct = hard / total;
  if (pct > 0.3) return { label: "Hard", variant: "destructive" };
  if (pct > 0.15) return { label: "Moderate", variant: "secondary" };
  return { label: "Easy", variant: "success" };
}

// ─── Table ────────────────────────────────────────────────────────────────────

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
 * ActivitiesTable — displays a list of training activities.
 * Presentation only — no Supabase calls.
 *
 * @param {{ activities: object[] }} props
 */
export default function ActivitiesTable({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        No activities for this period. Sync Strava to populate your history.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
      <table className="w-full text-sm" aria-label="Strava Activity History">
        <thead>
          <tr className="border-b border-border/60">
            <TH>Activity</TH>
            <TH>Type</TH>
            <TH right>Distance</TH>
            <TH right>Duration</TH>
            <TH>Effort</TH>
            <TH right>Date</TH>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const effort = effortMeta(activity);
            return (
              <tr
                key={activity.id}
                className="border-b border-border/30 last:border-0 hover:bg-muted/40 transition-colors"
              >
                <TD>
                  <span className="font-medium text-foreground line-clamp-1 max-w-[180px] block">
                    {activity.name || activity.type || "Workout"}
                  </span>
                </TD>
                <TD>
                  <span className="text-muted-foreground">
                    {activity.type || activity.sport_type || "—"}
                  </span>
                </TD>
                <TD right mono>
                  {fmtKm(activity.distance)}
                </TD>
                {/* Duration hidden on mobile per TASK-008 */}
                <td className="py-[11px] px-4 text-right font-mono text-xs hidden sm:table-cell">
                  {fmtDuration(activity.moving_time)}
                </td>
                <TD>
                  {effort ? (
                    <Badge variant={effort.variant} className="text-[11px] px-2 py-0.5">
                      {effort.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TD>
                <TD right>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {fmtRelativeDate(activity.started_at)}
                  </span>
                </TD>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
