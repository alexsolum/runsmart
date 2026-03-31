export function StatusDot({ status }) {
  const color = status === "over-target" ? "var(--pa-type-hard)" : "var(--pa-type-endurance)";

  return (
    <span
      aria-label="Load status"
      className="inline-block rounded-full"
      style={{
        width: 8,
        height: 8,
        background: color,
      }}
    />
  );
}

