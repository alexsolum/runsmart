import Icon from "./Icon";

const PAGE_LABELS = {
  intelligence:   "Dashboard",
  "training-plan": "Treningsplan",
  insights:       "Innsikt",
  races:          "Løp",
  "daily-log":    "Dagslogg",
  data:           "Data",
  roadmap:        "Veikart",
  mobile:         "Mobil",
};

export default function Topbar({ activePage, onMenuToggle }) {
  const label = PAGE_LABELS[activePage] ?? "Dashboard";

  return (
    <div className="topbar">
      <div className="crumbs">
        <span>Sider</span>
        <span className="sep">/</span>
        <strong>{label}</strong>
      </div>
      <div className="spacer" />
      <div className="time-pill">
        <span className="dot" />
        Synk · nå
      </div>
      <div className="searchbar">
        <Icon name="search" size={14} />
        <span>Søk løp, økter, steder…</span>
        <kbd>⌘K</kbd>
      </div>
      <button className="icon-btn" title="Varsler" onClick={onMenuToggle}>
        <Icon name="bell" />
      </button>
    </div>
  );
}
