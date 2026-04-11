import React from "react";
import { Badge } from "../ui/badge";
import { ExternalLink, Camera } from "lucide-react";
import { useI18n } from "../../i18n/translations";
import StravaDetailPanel from "./StravaDetailPanel";

export default function ParticipationItem({ participation, isPR }) {
  const { t } = useI18n();

  return (
    <div className="p-4">
      {participation.notes && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            {t("races.raceNotes")}
          </p>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
            {participation.notes}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {participation.strava_activity_id && (
          <a
            href={`https://www.strava.com/activities/${participation.strava_activity_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-orange-200 rounded-lg text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors font-medium"
          >
            <ExternalLink size={14} />
            {t("races.viewOnStrava")}
          </a>
        )}
        {participation.photo_album_url && (
          <a
            href={participation.photo_album_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <Camera size={14} />
            {t("races.photoAlbum")}
          </a>
        )}
      </div>

      {participation.strava_activity_id && (
        <StravaDetailPanel stravaActivityId={participation.strava_activity_id} />
      )}
    </div>
  );
}
