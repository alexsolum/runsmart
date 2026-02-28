import React from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function WeeklyProgressChart({ days, totalExecuted, totalPlanned }) {
  const isEmpty = totalExecuted === 0 && totalPlanned === 0;

  if (isEmpty) {
    return (
      <p className="text-slate-400 text-sm py-12 text-center">
        No workout data for this week. Log a workout or sync Strava to see your progress.
      </p>
    );
  }

  return (
    <div>
      {/* Summary pills */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          {totalExecuted.toFixed(1)} km completed
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />
          {totalPlanned.toFixed(1)} km planned
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={days} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradExecuted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={32}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(15,23,42,0.08)",
            }}
            formatter={(value, name) => {
              if (name === "avg") return [`${value} km`, "4-wk avg"];
              if (name === "executed") return [`${value} km`, "Completed"];
              if (name === "planned") return [`${value} km`, "Planned (remaining)"];
              return [value, name];
            }}
          />

          {/* 4-week avg reference line — rendered first so it sits below areas */}
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#cbd5e1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            name="avg"
          />

          {/* Executed area (solid blue) */}
          <Area
            type="monotone"
            dataKey="executed"
            stackId="progress"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#gradExecuted)"
            name="executed"
          />

          {/* Planned area (light blue, stacked above executed) */}
          <Area
            type="monotone"
            dataKey="planned"
            stackId="progress"
            stroke="#93c5fd"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#gradPlanned)"
            name="planned"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
