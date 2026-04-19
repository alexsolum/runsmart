export default function PanelHead({ eyebrow, title, sub, actions }) {
  return (
    <div className="panel-head">
      <div className="title-wrap">
        {eyebrow && <span className="cc-label">{eyebrow}</span>}
        <h3>{title}</h3>
        {sub && <span className="panel-sub">{sub}</span>}
      </div>
      {actions && <div className="panel-actions">{actions}</div>}
    </div>
  );
}
