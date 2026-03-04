import React, { useMemo } from "react";

// Phase colors (Tailwind) — matches LongTermPlanPage
const PHASE_BG = {
  Base:     "bg-sky-500",
  Build:    "bg-blue-600",
  Peak:     "bg-violet-700",
  Taper:    "bg-amber-500",
  Recovery: "bg-green-600",
};

const PHASE_LIGHT = {
  Base:     "bg-sky-100 text-sky-800",
  Build:    "bg-blue-100 text-blue-800",
  Peak:     "bg-violet-100 text-violet-800",
  Taper:    "bg-amber-100 text-amber-800",
  Recovery: "bg-green-100 text-green-800",
};

/** Return UTC Monday for a given UTC date string or Date object */
function toUtcMonday(dateOrStr) {
  const d = new Date(typeof dateOrStr === "string" ? `${dateOrStr}T00:00:00Z` : dateOrStr);
  const day = d.getUTCDay() || 7; // 1=Mon … 7=Sun
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Build an array of UTC Monday Dates from planStart through planEnd */
function buildWeekStarts(planStart, planEnd) {
  const start = toUtcMonday(planStart);
  const end = new Date(typeof planEnd === "string" ? `${planEnd}T00:00:00Z` : planEnd);
  const weeks = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    weeks.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return weeks;
}

/** Short month name for a Date */
function shortMonth(d) {
  return d.toLocaleString("default", { month: "short", timeZone: "UTC" });
}

export default function KoopTimeline({ blocks = [], planStartDate, planEndDate, today = new Date() }) {
  const weeks = useMemo(() => {
    if (!planStartDate || !planEndDate) return [];
    return buildWeekStarts(planStartDate, planEndDate);
  }, [planStartDate, planEndDate]);

  const todayMonday = useMemo(() => toUtcMonday(today), [today]);

  if (!blocks.length) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No training blocks yet. Add your first block to see the timeline.
      </p>
    );
  }

  if (!weeks.length) return null;

  const CELL_W = 80; // px per week column

  return (
    <div className="koop-timeline mb-4">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div style={{ minWidth: weeks.length * CELL_W }}>
          {/* Week header row */}
          <div className="flex bg-slate-50 border-b border-slate-200">
            {weeks.map((w, i) => {
              const isToday = w.getTime() === todayMonday.getTime();
              return (
                <div
                  key={w.toISOString()}
                  data-week={w.toISOString().split("T")[0]}
                  data-today={isToday || undefined}
                  className={`flex-none text-center text-[11px] font-semibold py-1.5 border-r border-slate-200 last:border-r-0 ${isToday ? "bg-blue-50 text-blue-700" : "text-slate-500"}`}
                  style={{ width: CELL_W }}
                >
                  <div>Wk {i + 1}</div>
                  <div className="font-normal">
                    {shortMonth(w)} {w.getUTCDate()}
                  </div>
                  {isToday && (
                    <div className="text-[9px] font-bold text-blue-600 uppercase tracking-wide">TODAY</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Block bands */}
          <div className="relative" style={{ minHeight: 48 }}>
            {blocks.map((block) => {
              const blockStart = new Date(`${block.start_date}T00:00:00Z`);
              const blockEnd = new Date(`${block.end_date}T00:00:00Z`);
              const startIdx = weeks.findIndex((w) => {
                const wEnd = new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
                return w <= blockEnd && wEnd >= blockStart;
              });
              if (startIdx === -1) return null;
              let endIdx = startIdx;
              for (let i = startIdx; i < weeks.length; i++) {
                const wEnd = new Date(weeks[i].getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
                if (wEnd < blockStart) continue;
                if (weeks[i] > blockEnd) break;
                endIdx = i;
              }
              const spanCount = endIdx - startIdx + 1;
              const colorClass = PHASE_BG[block.phase] ?? "bg-slate-400";
              // Support both target_km_week (task spec) and target_km (real DB field)
              const targetKm = block.target_km_week ?? block.target_km ?? null;

              return (
                <div
                  key={block.id ?? `${block.phase}-${block.start_date}`}
                  className={`flex items-center px-2 text-white text-[11px] font-bold overflow-hidden ${colorClass}`}
                  style={{
                    position: "absolute",
                    left: startIdx * CELL_W,
                    width: spanCount * CELL_W,
                    top: 4,
                    height: 40,
                    borderRadius: 6,
                  }}
                  title={`${block.label || block.phase}: ${block.start_date} — ${block.end_date}`}
                >
                  <span className="truncate">
                    {block.label || block.phase}
                    {targetKm ? (
                      <span className="ml-1.5 font-normal opacity-90">~{targetKm} km/w</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
            {/* Invisible spacer so the container has height */}
            <div style={{ height: 48 }} />
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(PHASE_LIGHT).map(([phase, cls]) => (
          <span key={phase} className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${cls}`}>
            {phase}
          </span>
        ))}
      </div>
    </div>
  );
}
