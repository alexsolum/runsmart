import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function formatPace(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "-";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

const TICK = { fontSize: 11, fill: "#94a3b8" };
const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
};

function getBarColor(speed, meanSpeed) {
  if (speed >= meanSpeed * 1.03) return "#34d399";
  if (speed <= meanSpeed * 0.97) return "#f87171";
  return "#60a5fa";
}

export default function SplitsPaceChart({ splits }) {
  const hasHR = splits.some((s) => s.average_heartrate != null);
  const meanSpeed = splits.reduce((sum, s) => sum + s.average_speed, 0) / splits.length;

  const data = splits.map((s) => ({
    km: s.split,
    speed: s.average_speed,
    hr: s.average_heartrate ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: hasHR ? 32 : 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="km" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis yAxisId="speed" hide />
        {hasHR && (
          <YAxis
            yAxisId="hr"
            orientation="right"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
        )}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => {
            if (name === "speed") return [formatPace(value), "Pace"];
            if (name === "hr") return [`${Math.round(value)} bpm`, "HR"];
            return [value, name];
          }}
          labelFormatter={(v) => `km ${v}`}
        />
        <Bar yAxisId="speed" dataKey="speed" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.speed, meanSpeed)} />
          ))}
        </Bar>
        {hasHR && (
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
