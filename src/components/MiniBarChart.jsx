import React from "react";

export default function MiniBarChart({ data, color = "#2563eb", height = 40, width = 80 }) {
  const max = Math.max(...data, 1);
  const barWidth = width / data.length - 2;
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {data.map((value, i) => {
        const barHeight = (value / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * (barWidth + 2)}
            y={height - barHeight - 2}
            width={barWidth}
            height={barHeight}
            rx={2}
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}
