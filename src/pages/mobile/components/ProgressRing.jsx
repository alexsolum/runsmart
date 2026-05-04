import React from "react";

export default function ProgressRing({ value = 0, size = 58, stroke = 5, label }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={label ?? `${Math.round(pct)}%`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#4a9eff"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#e2eaf4" fontSize="12" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
