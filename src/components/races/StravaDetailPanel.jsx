import React, { useEffect, useState } from "react";
import { ExternalLink, Camera } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { useAppData } from "../../context/AppDataContext";
import { invokeEdgeFunctionWithSessionRetry } from "../../lib/edgeFunctionAuth";
import { useI18n } from "../../i18n/translations";
import SplitsPaceChart from "./SplitsPaceChart";
import StravaRouteMap from "./StravaRouteMap";

function formatPace(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "-";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function classifySplits(splits) {
  if (!splits || splits.length < 4) return null;
  const mid = Math.floor(splits.length / 2);
  const firstHalf = splits.slice(0, mid);
  const secondHalf = splits.slice(mid);
  const avgFirst = firstHalf.reduce((sum, s) => sum + s.average_speed, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + s.average_speed, 0) / secondHalf.length;
  const ratio = avgSecond / avgFirst;

  if (ratio > 1.02) return "negative";
  if (ratio < 0.98) return "positive";
  return "even";
}

function findFastestSplit(splits) {
  return splits.reduce(
    (best, split) => (split.average_speed > best.average_speed ? split : best),
    splits[0],
  );
}

function findSlowestSplit(splits) {
  return splits.reduce(
    (worst, split) => (split.average_speed < worst.average_speed ? split : worst),
    splits[0],
  );
}

function lastNAvgPace(splits, count) {
  const last = splits.slice(-count);
  const avgSpeed = last.reduce((sum, split) => sum + split.average_speed, 0) / last.length;
  return formatPace(avgSpeed);
}

const SPLIT_BADGE_STYLE = {
  negative: "bg-green-50 text-green-700 border-green-200",
  positive: "bg-red-50 text-red-700 border-red-200",
  even: "bg-blue-50 text-blue-700 border-blue-200",
};

const SPLIT_BADGE_LABEL = {
  negative: "Negative splits",
  positive: "Positive splits",
  even: "Even splits",
};

export default function StravaDetailPanel({ stravaActivityId, participation }) {
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
          return;
        }

        setData(result.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stravaActivityId, auth.client]);

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="mt-4 text-xs italic text-slate-400">{t("races.stravaUnavailable")}</div>;
  }

  const splits = data.splits ?? [];
  const photos = data.photos ?? [];
  const splitsClassification = classifySplits(splits);
  const fastest = splits.length > 0 ? findFastestSplit(splits) : null;
  const slowest = splits.length > 0 ? findSlowestSplit(splits) : null;

  return (
    <div className="mt-4">
      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          {splits.length > 0 && <TabsTrigger value="splits">Splits</TabsTrigger>}
          {photos.length > 0 && <TabsTrigger value="photos">Photos</TabsTrigger>}
        </TabsList>

        <TabsContent value="stats" className="space-y-4 pt-3">
          {data.description && (
            <p className="rounded-lg bg-slate-50 p-3 text-sm italic leading-relaxed text-slate-600">
              {data.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {data.stats?.average_heartrate && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs">
                <span className="text-red-400">Avg HR</span>{" "}
                <span className="font-semibold text-red-700">
                  {Math.round(data.stats.average_heartrate)} bpm
                </span>
              </div>
            )}
            {data.stats?.max_heartrate && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs">
                <span className="text-red-400">Max HR</span>{" "}
                <span className="font-semibold text-red-700">
                  {Math.round(data.stats.max_heartrate)} bpm
                </span>
              </div>
            )}
            {data.stats?.average_speed && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs">
                <span className="text-blue-400">Avg Pace</span>{" "}
                <span className="font-semibold text-blue-700">
                  {formatPace(data.stats.average_speed)}
                </span>
              </div>
            )}
            {data.stats?.calories && (
              <div className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs">
                <span className="text-orange-400">Calories</span>{" "}
                <span className="font-semibold text-orange-700">{data.stats.calories}</span>
              </div>
            )}
            {data.stats?.suffer_score && (
              <div className="rounded-lg border border-pink-100 bg-pink-50 px-3 py-1.5 text-xs">
                <span className="text-pink-400">Suffer Score</span>{" "}
                <span className="font-semibold text-pink-700">{data.stats.suffer_score}</span>
              </div>
            )}
            {data.stats?.gear_name && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                <span className="text-slate-400">Gear</span>{" "}
                <span className="font-semibold text-slate-700">{data.stats.gear_name}</span>
              </div>
            )}
            {splitsClassification && (
              <Badge variant="outline" className={SPLIT_BADGE_STYLE[splitsClassification]}>
                {SPLIT_BADGE_LABEL[splitsClassification]}
              </Badge>
            )}
          </div>

          {(fastest || slowest) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pacing highlights
              </p>
              {fastest && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                  <span className="font-medium text-slate-700">Fastest km</span>
                  <span className="text-slate-500">
                    km {fastest.split} - {formatPace(fastest.average_speed)}
                  </span>
                </div>
              )}
              {slowest && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
                  <span className="font-medium text-slate-700">Slowest km</span>
                  <span className="text-slate-500">
                    km {slowest.split} - {formatPace(slowest.average_speed)}
                  </span>
                </div>
              )}
              {splits.length >= 5 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-400" />
                  <span className="font-medium text-slate-700">Last 5 km</span>
                  <span className="text-slate-500">{lastNAvgPace(splits, 5)} avg</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {stravaActivityId && (
              <a
                href={`https://www.strava.com/activities/${stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100"
              >
                <ExternalLink size={14} />
                {t("races.viewOnStrava")}
              </a>
            )}
            {participation?.photo_album_url && (
              <a
                href={participation.photo_album_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Camera size={14} />
                {t("races.photoAlbum")}
              </a>
            )}
          </div>
        </TabsContent>

        <TabsContent value="route" className="pt-3">
          {data.map_polyline ? (
            <StravaRouteMap polyline={data.map_polyline} />
          ) : (
            <p className="py-4 text-center text-sm italic text-slate-400">
              No route data available for this activity.
            </p>
          )}
        </TabsContent>

        {splits.length > 0 && (
          <TabsContent value="splits" className="space-y-4 pt-3">
            <SplitsPaceChart splits={splits} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-400">
                    <th className="py-1.5 pr-3 font-medium">KM</th>
                    <th className="py-1.5 pr-3 font-medium">Pace</th>
                    <th className="py-1.5 pr-3 font-medium">HR</th>
                    <th className="py-1.5 font-medium">Elev</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((split) => (
                    <tr key={split.split} className="border-b border-slate-50">
                      <td className="py-1 pr-3 font-medium text-slate-700">{split.split}</td>
                      <td className="py-1 pr-3 text-slate-600">
                        {formatPace(split.average_speed)}
                      </td>
                      <td className="py-1 pr-3 text-slate-600">
                        {split.average_heartrate ? Math.round(split.average_heartrate) : "-"}
                      </td>
                      <td className="py-1 text-slate-600">
                        {split.elevation_difference != null
                          ? `${split.elevation_difference > 0 ? "+" : ""}${Math.round(split.elevation_difference)}m`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {photos.length > 0 && (
          <TabsContent value="photos" className="pt-3">
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, index) => (
                <div key={index}>
                  <img
                    src={photo.url}
                    alt={photo.caption || `Race photo ${index + 1}`}
                    className="h-32 w-full rounded-lg object-cover"
                  />
                  {photo.caption && <p className="mt-1 text-xs text-slate-500">{photo.caption}</p>}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
