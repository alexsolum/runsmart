import React from "react";

function toNumber(value, key) {
  if (typeof value === "number") return value;
  return Number(value?.[key]) || 0;
}

function pathFor(values, width, height) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function MiniLine({ data = [], lines = [{ key: "value", color: "#1a5fb4" }], height = 96 }) {
  const width = 320;
  const pad = 10;
  const innerWidth = width - pad * 2;
  const innerHeight = height - pad * 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Treningskurve" style={{ width: "100%", height }}>
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {[0.25, 0.5, 0.75].map((mark) => (
        <line key={mark} x1={pad} x2={width - pad} y1={height * mark} y2={height * mark} stroke="#e3e9f0" strokeWidth="1" />
      ))}
      {lines.map((line) => {
        const values = data.map((item) => toNumber(item, line.key));
        const path = pathFor(values, innerWidth, innerHeight);
        return (
          <path
            key={line.key}
            d={path}
            transform={`translate(${pad} ${pad})`}
            fill="none"
            stroke={line.color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
