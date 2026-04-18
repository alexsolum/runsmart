export function ChapterMarker({ ch, label, className = "" }) {
  const num = String(ch).padStart(2, "0");
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-family-sans)",
        fontSize: "11px",
        fontWeight: 400,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--ink-muted)",
      }}
    >
      CH.&nbsp;{num}&nbsp;·&nbsp;{label}
    </span>
  );
}
