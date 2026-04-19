export default function Metric({ lbl, val, unit, delta, deltaDir }) {
  return (
    <div className="metric">
      <span className="lbl">{lbl}</span>
      <div className="val">
        {val}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {delta && <span className={`delta${deltaDir ? ` ${deltaDir}` : ""}`}>{delta}</span>}
    </div>
  );
}
