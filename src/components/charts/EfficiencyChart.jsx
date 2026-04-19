export default function EfficiencyChart({ points, height = 200 }) {
  if (!points?.length) return null;

  // points: [{ x (index/timestamp), y (efficiencyFactor), rollingAverage }]
  const n = points.length;
  const w = 720;
  const h = height;
  const pad = { t: 8, r: 10, b: 22, l: 32 };
  const yMin = 1.1;
  const yMax = 1.65;

  const xs = (i) => pad.l + ((w - pad.l - pad.r) * i) / (n - 1);
  const ys = (v) => pad.t + ((yMax - v) / (yMax - yMin)) * (h - pad.t - pad.b);
  const clamp = (v) => Math.min(Math.max(v, yMin), yMax);

  // Rolling mean path — skip nulls
  const trendSegs = [];
  let seg = [];
  points.forEach((d, i) => {
    if (d.rollingAverage != null && isFinite(d.rollingAverage)) {
      seg.push(`${seg.length === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(clamp(d.rollingAverage)).toFixed(1)}`);
    } else if (seg.length) {
      trendSegs.push(seg.join(" "));
      seg = [];
    }
  });
  if (seg.length) trendSegs.push(seg.join(" "));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
        <line x1={pad.l} x2={w - pad.r} y1={ys(1.5)} y2={ys(1.5)} stroke="#e4e7ed" strokeDasharray="3 3" />
        <line x1={pad.l} x2={w - pad.r} y1={ys(1.3)} y2={ys(1.3)} stroke="#e4e7ed" strokeDasharray="3 3" />

        {points.map((d, i) => (
          <circle
            key={i}
            cx={xs(i)} cy={ys(clamp(d.y ?? d.efficiencyFactor ?? 1.3))}
            r="2.2" fill="#b8cdec" opacity="0.75"
          />
        ))}

        {trendSegs.map((seg, i) => (
          <path key={i} d={seg} fill="none" stroke="#0e1a2d" strokeWidth="2" />
        ))}

        {[1.6, 1.5, 1.4, 1.3, 1.2].map((v) => (
          <text key={v} x={pad.l - 6} y={ys(v) + 3} textAnchor="end"
            fontSize="9.5" fill="#b3bac6" fontFamily="JetBrains Mono, monospace">
            {v.toFixed(2)}
          </text>
        ))}
      </svg>
    </div>
  );
}
