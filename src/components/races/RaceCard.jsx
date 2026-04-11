import React from "react";
import { Badge } from "../ui/badge";
import { useI18n } from "../../i18n/translations";

const GRADIENT_COLORS = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-amber-500 to-amber-700",
  "from-purple-500 to-purple-700",
  "from-rose-500 to-rose-700",
  "from-cyan-500 to-cyan-700",
];

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

function findPR(participations) {
  if (!participations || participations.length === 0) return null;
  let best = null;
  for (const p of participations) {
    if (!p.finish_time) continue;
    const str = String(p.finish_time);
    if (best === null || str < best) best = str;
  }
  return best;
}

function formatFinishTime(timeStr) {
  if (!timeStr) return null;
  return timeStr.replace(/^0+(?=\d{2}:)/, "");
}

export default function RaceCard({ race, onClick }) {
  const { t } = useI18n();
  const participations = race.race_participations ?? [];
  const isBucketList = participations.length === 0;
  const gradient = getGradient(race.name);
  const pr = findPR(participations);
  const lastRun = participations.length > 0
    ? [...participations].sort((a, b) => new Date(b.race_date) - new Date(a.race_date))[0]
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow w-full"
    >
      <div className={`h-20 bg-gradient-to-br ${isBucketList ? "from-amber-400 to-amber-600" : gradient} flex items-end p-3`}>
        <span className="text-white font-bold text-base drop-shadow-sm">{race.name}</span>
      </div>
      <div className="p-3">
        <div className="text-xs text-slate-500 mb-2">
          {[race.location, race.distance_km && `${race.distance_km} km`, race.elevation_gain_m && `${race.elevation_gain_m}m D+`]
            .filter(Boolean)
            .join(" · ")}
        </div>

        {isBucketList ? (
          <>
            {race.description && (
              <p className="text-xs text-amber-800 italic line-clamp-2 mb-2">
                &ldquo;{race.description}&rdquo;
              </p>
            )}
            <div className="flex gap-1.5 flex-wrap">
              {race.registration_info && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">
                  {race.registration_info}
                </Badge>
              )}
              {(race.race_resources ?? []).length > 0 && (
                <span className="text-xs text-blue-500">
                  {race.race_resources.length} {t("races.resources").toLowerCase()}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5 flex-wrap mb-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                {participations.length}× {t("races.finisher")}
              </Badge>
              {pr && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                  {t("races.pr")}: {formatFinishTime(pr)}
                </Badge>
              )}
            </div>
            {lastRun && (
              <div className="text-xs text-slate-400">
                Last run: {new Date(lastRun.race_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}
