export function StackedBar({ distribution }) {
  const segments = [
    { key: "hard", value: Number(distribution?.hard) || 0, color: "var(--pa-type-hard)" },
    { key: "easy", value: Number(distribution?.easy) || 0, color: "var(--pa-type-easy)" },
    { key: "endurance", value: Number(distribution?.endurance) || 0, color: "var(--pa-type-endurance)" },
    { key: "other", value: Number(distribution?.other) || 0, color: "var(--pa-type-other)" },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="w-3 h-16 flex flex-col justify-end gap-0.5" aria-label="Load distribution">
      {segments.map((segment, index) => (
        <div
          key={segment.key}
          style={{
            height: `${segment.value}%`,
            background: segment.color,
            borderTopLeftRadius: index === 0 ? "var(--pa-radius-full)" : "0",
            borderTopRightRadius: index === 0 ? "var(--pa-radius-full)" : "0",
            borderBottomLeftRadius: index === segments.length - 1 ? "var(--pa-radius-full)" : "0",
            borderBottomRightRadius: index === segments.length - 1 ? "var(--pa-radius-full)" : "0",
          }}
        />
      ))}
    </div>
  );
}

