import { useMemo } from "react";

const PHASE_COLORS = {
  Base:     "var(--phase-base)",
  Build:    "var(--phase-build)",
  Peak:     "var(--phase-peak)",
  Taper:    "var(--phase-taper)",
  Recovery: "var(--phase-recovery)",
};

export function RaceLine({ weeks = [], height = 60, className = "" }) {
  const points = useMemo(() => {
    if (!weeks.length) return "";
    const max = Math.max(...weeks.map((w) => w.mileage || 0), 1);
    const step = 100 / (weeks.length - 1 || 1);
    return weeks
      .map((w, i) => {
        const x = i * step;
        const y = height - ((w.mileage || 0) / max) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");
  }, [weeks, height]);

  const segments = useMemo(() => {
    if (weeks.length < 2) return [];
    const max = Math.max(...weeks.map((w) => w.mileage || 0), 1);
    const step = 100 / (weeks.length - 1);
    return weeks.slice(0, -1).map((w, i) => {
      const x1 = i * step;
      const x2 = (i + 1) * step;
      const y1 = height - ((w.mileage || 0) / max) * (height - 4) - 2;
      const y2 = height - ((weeks[i + 1].mileage || 0) / max) * (height - 4) - 2;
      return { x1, y1, x2, y2, phase: w.phase };
    });
  }, [weeks, height]);

  if (!weeks.length) return null;

  return (
    <svg
      className={className}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block", overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Base polyline in paper-raised tint */}
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke="rgba(11,23,56,0.08)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {/* Phase-colored segments */}
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={PHASE_COLORS[s.phase] || "var(--ink-muted)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* Race-day tip dot */}
      {weeks.length > 0 && (() => {
        const last = weeks[weeks.length - 1];
        const max = Math.max(...weeks.map((w) => w.mileage || 0), 1);
        const x = 100;
        const y = height - ((last.mileage || 0) / max) * (height - 4) - 2;
        return (
          <circle
            cx={x}
            cy={y}
            r="4"
            fill="var(--accent-race)"
            stroke="var(--surface)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        );
      })()}
    </svg>
  );
}
