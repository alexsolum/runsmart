import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import PanelHead from "../ui/PanelHead";
import Icon from "../shell/Icon";

const NO_MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCDate()}. ${NO_MONTHS[d.getUTCMonth()]}`;
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}t ${m}m` : `${m} min`;
}

function activityKind(a) {
  const name = (a.name ?? "").toLowerCase();
  const type = (a.workout_type ?? a.type ?? "").toLowerCase();
  if (name.includes("race") || name.includes("løp") && name.includes("konkurranse")) return "race";
  if (name.includes("long") || name.includes("lang")) return "long";
  if (type.includes("trail")) return "trail";
  return "run";
}

function iconForKind(kind) {
  if (kind === "race") return "trophy";
  if (kind === "long") return "mountain";
  return "run";
}

export default function RecentActivities() {
  const { activities } = useAppData();

  const recent = useMemo(() => {
    const acts = activities?.activities ?? [];
    return acts
      .slice()
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.name ?? a.workout_type ?? "Økt",
        date: formatDate(a.started_at),
        time: formatDuration(a.moving_time ?? a.elapsed_time),
        km: (Number(a.distance) || 0) / 1000,
        kind: activityKind(a),
      }));
  }, [activities]);

  return (
    <div className="panel col-4">
      <PanelHead
        eyebrow="Siste økter"
        title="Aktivitet"
        sub={`Synkronisert fra Strava · ${recent.length} økter`}
        actions={
          <button className="btn ghost sm">Se alle <Icon name="chevR" size={12} /></button>
        }
      />

      {recent.length > 0 ? (
        <div className="activities">
          {recent.map((a) => (
            <div key={a.id} className="activity-row">
              <div className={`activity-icon ${a.kind === "race" ? "race" : a.kind === "long" ? "long" : ""}`}>
                <Icon name={iconForKind(a.kind)} size={14} />
              </div>
              <div className="activity-info">
                <div className="name">{a.name}</div>
                <div className="meta">{a.date}{a.time ? ` · ${a.time}` : ""}</div>
              </div>
              <div className="activity-metric">
                {a.km.toFixed(1)}<span className="u">km</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-hint">Ingen aktiviteter synkronisert enda. Koble Strava i Data.</div>
      )}
    </div>
  );
}
