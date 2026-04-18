import React, { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { useI18n } from "../../i18n/translations";
import { computeTrainingLoad, getWeekStart } from "../../domain/compute";

const CHAPTER_MAP = {
  intelligence: { num: "01", label: "INTELLIGENCE" },
  "training-plan": { num: "02", label: "PLAN" },
  insights: { num: "03", label: "TRENDS" },
  races: { num: "04", label: "RACES" },
  "daily-log": { num: "05", label: "LOG" },
  data: { num: "06", label: "DATA" },
  roadmap: { num: "07", label: "ROADMAP" },
  mobile: { num: "08", label: "MOBILE" },
};

function TsbSparkline({ loadSeries }) {
  const points = loadSeries.slice(-14).map((d) => d.tsb);
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 44;
  const H = 14;

  const pathD = points
    .map((v, i) => {
      const x = ((i / (points.length - 1)) * W).toFixed(1);
      const y = (H - ((v - min) / range) * H).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const last = points[points.length - 1];
  const color = last > 5 ? "var(--signal-good)" : last < -10 ? "var(--signal-risk)" : "var(--ink-muted)";

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0, opacity: 0.7 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WeekMileageBar({ activities }) {
  const weekKm = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    return (activities ?? [])
      .filter((a) => {
        const d = new Date(a.start_date || a.started_at || a.date);
        return d >= weekStart && d < weekEnd;
      })
      .reduce((sum, a) => sum + (Number(a.distance) || 0) / 1000, 0);
  }, [activities]);

  const pct = Math.min(weekKm / 50, 1);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <div
        style={{
          width: 36,
          height: 3,
          borderRadius: 2,
          background: "rgba(11,23,56,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            background: "var(--phase-build)",
            borderRadius: 2,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-family-mono)",
          fontSize: 10,
          color: "var(--ink-muted)",
          lineHeight: 1,
        }}
      >
        {weekKm.toFixed(0)}k
      </span>
    </div>
  );
}

export default function EditorialRail({ activePage, onNavigate, navGroups, isOpen, onClose }) {
  const { activities, auth } = useAppData();
  const { t } = useI18n();

  const loadSeries = useMemo(() => {
    const acts = activities?.activities ?? [];
    return acts.length >= 7 ? computeTrainingLoad(acts) : [];
  }, [activities?.activities]);

  function getItemDecoration(key) {
    if ((key === "intelligence" || key === "insights") && loadSeries.length >= 2) {
      return <TsbSparkline loadSeries={loadSeries} />;
    }
    if (key === "training-plan") {
      return <WeekMileageBar activities={activities?.activities} />;
    }
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <button
          className="fixed inset-0 border-0 z-20 lg:hidden"
          style={{ background: "rgba(11,23,56,0.3)" }}
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`editorial-rail ${isOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent-race)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--font-family-serif)",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            R
          </div>
          <span
            style={{
              fontFamily: "var(--font-family-serif)",
              fontStyle: "italic",
              fontSize: 20,
              color: "var(--ink)",
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            RunSmart
          </span>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          {navGroups.map((group) => (
            <div key={group.labelKey}>
              <p
                style={{
                  margin: "0 0 8px",
                  padding: "0 16px",
                  fontSize: 10,
                  fontFamily: "var(--font-family-sans)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--ink-muted)",
                }}
              >
                {t(group.labelKey)}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.items.map((item) => {
                  const isActive = item.key === activePage;
                  const chapter = CHAPTER_MAP[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-testid={`nav-${item.key}`}
                      onClick={() => {
                        onNavigate(item.key);
                        onClose();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "8px 16px",
                        border: 0,
                        borderRadius: 8,
                        background: isActive ? "var(--accent-race-soft)" : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "background 0.15s",
                      }}
                      className={!isActive ? "editorial-rail__item" : ""}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {chapter && (
                          <span
                            style={{
                              fontFamily: "var(--font-family-mono)",
                              fontSize: 9,
                              color: isActive ? "var(--accent-race)" : "var(--ink-muted)",
                              letterSpacing: "0.05em",
                              flexShrink: 0,
                              lineHeight: 1,
                            }}
                          >
                            {chapter.num}
                          </span>
                        )}
                        <span
                          style={{
                            fontFamily: "var(--font-family-serif)",
                            fontStyle: "italic",
                            fontSize: 15,
                            color: isActive ? "var(--accent-race)" : "var(--ink)",
                            lineHeight: 1.2,
                            minWidth: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t(item.labelKey)}
                        </span>
                      </div>
                      {getItemDecoration(item.key)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: "1px solid rgba(11,23,56,0.08)",
            paddingTop: 16,
            marginTop: "auto",
            padding: "16px 16px 0",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontFamily: "var(--font-family-mono)",
              color: "var(--ink-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {auth.user?.email}
          </p>
          <button
            type="button"
            onClick={auth.signOut}
            style={{
              border: 0,
              background: "none",
              padding: "6px 0",
              fontSize: 11,
              fontFamily: "var(--font-family-sans)",
              color: "var(--ink-muted)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {t("nav.signout")}
          </button>
        </div>
      </aside>
    </>
  );
}
