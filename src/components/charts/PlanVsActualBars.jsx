const NO_DAYS = { Mon: "MAN", Tue: "TIR", Wed: "ONS", Thu: "TOR", Fri: "FRE", Sat: "LØR", Sun: "SØN" };

export default function PlanVsActualBars({ data, height = 220 }) {
  if (!data?.length) return null;

  const max = Math.max(...data.map((d) => Math.max(d.planned ?? 0, d.executed ?? 0))) * 1.15 || 1;
  const barW = 18;
  const svgW = data.length * 60;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${svgW} ${height}`} style={{ width: "100%", height }}>
        <defs>
          <linearGradient id="grad-actual" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2d6cc7" />
            <stop offset="100%" stopColor="#003371" />
          </linearGradient>
          <pattern id="grad-planned" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 6 L6 0" stroke="#b8cdec" strokeWidth="1.5" />
          </pattern>
        </defs>

        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1="0" x2={svgW}
            y1={height - 30 - t * (height - 50)}
            y2={height - 30 - t * (height - 50)}
            stroke="#e4e7ed" strokeDasharray="2 4"
          />
        ))}

        {data.map((d, i) => {
          const x = i * 60;
          const baseY = height - 30;
          const ph = ((d.planned ?? 0) / max) * (height - 50);
          const ah = ((d.executed ?? 0) / max) * (height - 50);
          const label = NO_DAYS[d.day] ?? d.day?.slice(0, 3).toUpperCase() ?? "";
          const dateStr = d.date ? d.date.slice(5).replace("-", ".") : "";

          return (
            <g key={i}>
              <rect x={x + 14} y={baseY - ph} width={barW} height={Math.max(ph, 0)} rx="4" fill="url(#grad-planned)" />
              <rect
                x={x + 14 + barW + 4} y={baseY - ah} width={barW} height={Math.max(ah, 0)} rx="4"
                fill={d.isToday ? "#0e1a2d" : "url(#grad-actual)"}
                opacity={(d.executed ?? 0) === 0 ? 0.22 : 1}
              />
              {d.isToday && (
                <rect
                  x={x + 12} y={baseY - Math.max(ph, ah) - 6}
                  width={barW * 2 + 8} height={Math.max(ph, ah) + 10}
                  rx="6" fill="none" stroke="#0e1a2d" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45"
                />
              )}
              <text x={x + 30} y={height - 14} fontSize="10" textAnchor="middle" fill="#7d8699"
                fontFamily="Inter, sans-serif" fontWeight="600" letterSpacing="0.1em">
                {label}
              </text>
              <text x={x + 30} y={height - 2} fontSize="9.5" textAnchor="middle" fill="#b3bac6"
                fontFamily="JetBrains Mono, monospace">
                {dateStr}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
