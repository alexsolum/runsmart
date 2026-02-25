import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function TrainingVolumeChart({ data, overlayFilter }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradDistance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 13,
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
          }}
        />
        {overlayFilter === "distance" && (
          <Area
            type="monotone"
            dataKey="distance"
            stroke="#2563eb"
            fillOpacity={1}
            fill="url(#gradDistance)"
            name="Distance (km)"
            strokeWidth={2}
          />
        )}
        {overlayFilter === "load" && (
          <Area
            type="monotone"
            dataKey="load"
            stroke="#16a34a"
            fillOpacity={1}
            fill="url(#gradLoad)"
            name="Load (min)"
            strokeWidth={2}
          />
        )}
        {overlayFilter === "pace" && (
          <Area
            type="monotone"
            dataKey="pace"
            stroke="#d97706"
            fillOpacity={1}
            fill="url(#gradPace)"
            name="Pace (min/km)"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
