export function ContourBackdrop({ className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <style>{`
          .contour-line {
            fill: none;
            stroke: rgba(11, 23, 56, 0.055);
            stroke-width: 1;
          }
        `}</style>
      </defs>
      {/* Concentric oval contour rings — decorative only */}
      {[40, 80, 120, 160, 200, 250].map((r, i) => (
        <ellipse
          key={i}
          className="contour-line"
          cx="75%"
          cy="50%"
          rx={r * 1.6}
          ry={r}
        />
      ))}
    </svg>
  );
}
