export default function FitnessChart({ data, height = 200 }) {
  if (!data?.length) return null;

  const n = data.length;
  const w = 720;
  const h = height;
  const pad = { t: 10, r: 10, b: 22, l: 30 };
  const maxY = 90;
  const minY = -30;

  const xs = (i) => pad.l + ((w - pad.l - pad.r) * i) / (n - 1);
  const ys = (v) => pad.t + ((maxY - v) / (maxY - minY)) * (h - pad.t - pad.b);

  const path = (key) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(d[key]).toFixed(1)}`).join(" ");

  const areaCTL = `${path("ctl")} L ${xs(n - 1).toFixed(1)} ${ys(0).toFixed(1)} L ${xs(0).toFixed(1)} ${ys(0).toFixed(1)} Z`;
  const areaTSB = `${path("tsb")} L ${xs(n - 1).toFixed(1)} ${ys(0).toFixed(1)} L ${xs(0).toFixed(1)} ${ys(0).toFixed(1)} Z`;

  const last = data[n - 1];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
        <defs>
          <linearGradient id="ctl-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#003371" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#003371" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tsb-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1f7a4d" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#1f7a4d" stopOpacity="0" />
          </linearGradient>
        </defs>

        <line x1={pad.l} x2={w - pad.r} y1={ys(0)} y2={ys(0)} stroke="#e4e7ed" strokeDasharray="3 3" />

        <path d={areaTSB} fill="url(#tsb-fill)" />
        <path d={areaCTL} fill="url(#ctl-fill)" />

        <path d={path("atl")} fill="none" stroke="#d96c4f" strokeWidth="1.6" opacity="0.8" />
        <path d={path("tsb")} fill="none" stroke="#1f7a4d" strokeWidth="1.4" opacity="0.85" />
        <path d={path("ctl")} fill="none" stroke="#003371" strokeWidth="2.2" />

        <circle cx={xs(n - 1)} cy={ys(last.ctl)} r="4" fill="#003371" />
        <circle cx={xs(n - 1)} cy={ys(last.ctl)} r="8" fill="#003371" opacity="0.15" />

        {[90, 60, 30, 0, -30].map((v) => (
          <text key={v} x={pad.l - 6} y={ys(v) + 3} textAnchor="end"
            fontSize="9.5" fill="#b3bac6" fontFamily="JetBrains Mono, monospace">
            {v}
          </text>
        ))}
      </svg>
    </div>
  );
}
