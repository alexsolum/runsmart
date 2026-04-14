import React from "react";
import { useI18n } from "../../i18n/translations";
import StravaDetailPanel from "./StravaDetailPanel";

export default function ParticipationItem({ participation, isPR }) {
  const { t } = useI18n();

  return (
    <div className="p-4">
      {participation.notes && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t("races.raceNotes")}
          </p>
          <div className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {participation.notes}
          </div>
        </div>
      )}

      {participation.strava_activity_id && (
        <StravaDetailPanel
          stravaActivityId={participation.strava_activity_id}
          participation={participation}
        />
      )}
    </div>
  );
}
