import Icon from "./Icon";
import { useAppData } from "../../context/AppDataContext";

const NAV_PRIMARY = [
  { key: "intelligence",   label: "Dashboard",    icon: "grid" },
  { key: "training-plan",  label: "Treningsplan", icon: "calendar" },
  { key: "insights",       label: "Innsikt",      icon: "chart" },
  { key: "races",          label: "Løp",          icon: "trophy" },
];

const NAV_SECONDARY = [
  { key: "daily-log", label: "Dagslogg", icon: "book" },
  { key: "data",      label: "Data",     icon: "database" },
  { key: "roadmap",   label: "Veikart",  icon: "map" },
  { key: "mobile",    label: "Mobil",    icon: "phone" },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { auth } = useAppData();
  const email = auth.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();
  const displayName = email.split("@")[0] ?? "Ukjent";

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">R</div>
        <div>
          <div className="brand-name">RunSmart</div>
          <div className="brand-tag">Kontrollsenter</div>
        </div>
      </div>

      <div className="nav-section">Generelt</div>
      {NAV_PRIMARY.map((n) => (
        <button
          key={n.key}
          className={`nav-item${activePage === n.key ? " active" : ""}`}
          onClick={() => onNavigate(n.key)}
        >
          <Icon name={n.icon} />
          <span className="lbl">{n.label}</span>
        </button>
      ))}

      <div className="nav-section">Annet</div>
      {NAV_SECONDARY.map((n) => (
        <button
          key={n.key}
          className={`nav-item${activePage === n.key ? " active" : ""}`}
          onClick={() => onNavigate(n.key)}
        >
          <Icon name={n.icon} />
          <span className="lbl">{n.label}</span>
        </button>
      ))}

      <div className="sidebar-footer">
        <div className="avatar-sm">{initials}</div>
        <div style={{ lineHeight: 1.15, minWidth: 0 }}>
          <div style={{ color: "#dde4f0", fontWeight: 600, fontSize: 12 }}>{displayName}</div>
          <div className="email">{email}</div>
        </div>
      </div>
    </aside>
  );
}
