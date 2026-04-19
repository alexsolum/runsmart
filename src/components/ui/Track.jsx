export default function Track({ pct, marker }) {
  return (
    <div className="track">
      <div className="fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      {marker != null && <div className="marker" style={{ left: `${marker}%` }} />}
    </div>
  );
}
