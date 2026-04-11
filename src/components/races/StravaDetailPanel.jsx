import React, { useEffect, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import { invokeEdgeFunctionWithSessionRetry } from "../../lib/edgeFunctionAuth";
import { useI18n } from "../../i18n/translations";

function formatPace(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "-";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

export default function StravaDetailPanel({ stravaActivityId }) {
  const { t } = useI18n();
  const { auth } = useAppData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stravaActivityId || !auth.client) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    invokeEdgeFunctionWithSessionRetry(auth.client, "strava-activity-detail", {
      body: { activity_id: stravaActivityId },
    })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error.message || "Failed to load");
        } else {
          setData(result.data);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [stravaActivityId, auth.client]);

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-4 text-xs text-slate-400 italic">
        {t("races.stravaUnavailable")}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Strava Details
      </p>

      {/* Stats chips */}
      {data.stats && (
        <div className="flex gap-3 flex-wrap">
          {data.stats.average_heartrate && (
            <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
              <span className="text-red-400">Avg HR</span>{" "}
              <span className="font-semibold text-red-700">{Math.round(data.stats.average_heartrate)} bpm</span>
            </div>
          )}
          {data.stats.max_heartrate && (
            <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
              <span className="text-red-400">Max HR</span>{" "}
              <span className="font-semibold text-red-700">{Math.round(data.stats.max_heartrate)} bpm</span>
            </div>
          )}
          {data.stats.average_speed && (
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
              <span className="text-blue-400">Avg Pace</span>{" "}
              <span className="font-semibold text-blue-700">{formatPace(data.stats.average_speed)}</span>
            </div>
          )}
          {data.stats.calories && (
            <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-xs">
              <span className="text-orange-400">Calories</span>{" "}
              <span className="font-semibold text-orange-700">{data.stats.calories}</span>
            </div>
          )}
          {data.stats.gear_name && (
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="text-slate-400">Gear</span>{" "}
              <span className="font-semibold text-slate-700">{data.stats.gear_name}</span>
            </div>
          )}
        </div>
      )}

      {/* Strava description */}
      {data.description && (
        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
          {data.description}
        </div>
      )}

      {/* Photos */}
      {data.photos && data.photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {data.photos.map((photo, i) => (
            <img
              key={i}
              src={photo.url}
              alt={photo.caption || `Race photo ${i + 1}`}
              className="h-32 rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}

      {/* Splits table */}
      {data.splits && data.splits.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="py-1.5 pr-3 font-medium">KM</th>
                <th className="py-1.5 pr-3 font-medium">Pace</th>
                <th className="py-1.5 pr-3 font-medium">HR</th>
                <th className="py-1.5 font-medium">Elev</th>
              </tr>
            </thead>
            <tbody>
              {data.splits.map((s) => (
                <tr key={s.split} className="border-b border-slate-50">
                  <td className="py-1 pr-3 font-medium text-slate-700">{s.split}</td>
                  <td className="py-1 pr-3 text-slate-600">{formatPace(s.average_speed)}</td>
                  <td className="py-1 pr-3 text-slate-600">{s.average_heartrate ? Math.round(s.average_heartrate) : "-"}</td>
                  <td className="py-1 text-slate-600">{s.elevation_difference != null ? `${s.elevation_difference > 0 ? "+" : ""}${Math.round(s.elevation_difference)}m` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
