import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeTrainingLoad, computeTrainingLoadState } from "../../domain/compute";
import PanelHead from "../ui/PanelHead";
import Track from "../ui/Track";

function scoreLabel(score) {
  if (score >= 85) return "Utmerket";
  if (score >= 70) return "Klar";
  if (score >= 50) return "Moderat";
  return "Sliten";
}

export default function ReadinessPanel() {
  const { activities, checkins, dailyLogs } = useAppData();

  const { score, vitals } = useMemo(() => {
    const acts = activities?.activities ?? [];
    const series = computeTrainingLoad(acts);
    const state = computeTrainingLoadState(series);
    const latest = series.length ? series[series.length - 1] : null;

    const latestLog = (dailyLogs?.dailyLogs ?? []).slice(-1)[0];
    const latestCheckin = (checkins?.checkins ?? []).slice(-1)[0];

    const tsb = latest?.tsb ?? 0;
    const atl = latest?.atl ?? 0;
    const ctl = latest?.ctl ?? 0;

    // Normalize TSB to 0–100 (TSB range roughly -40..+40)
    const tsbPct = Math.min(100, Math.max(0, ((tsb + 40) / 80) * 100));

    const sleepScore = latestLog?.sleep_quality ?? latestCheckin?.sleep_quality ?? 5;
    const sleepPct = (sleepScore / 10) * 100;

    const fatigueRaw = latestLog?.fatigue ?? latestCheckin?.fatigue ?? 5;
    const fatiguePct = Math.max(0, 100 - (fatigueRaw / 10) * 100);

    const rpe = latestCheckin?.rpe ?? latestLog?.training_quality ?? 5;
    const rpePct = Math.max(0, 100 - ((rpe - 1) / 9) * 100);

    const hrv = latestLog?.hrv ?? null;
    const rhr = latestLog?.rhr ?? null;

    const rawScore = Math.round((tsbPct * 0.4) + (sleepPct * 0.25) + (fatiguePct * 0.25) + (rpePct * 0.1));
    const displayScore = Math.min(100, Math.max(0, rawScore));

    const vitalsList = [
      { name: "Form (CTL)", pct: Math.min(100, (ctl / 80) * 100), num: ctl.toFixed(1) },
      { name: "Tretthet (ATL)", pct: Math.min(100, (atl / 80) * 100), num: atl.toFixed(1) },
      { name: "Overskudd (TSB)", pct: tsbPct, num: tsb > 0 ? `+${tsb.toFixed(1)}` : tsb.toFixed(1) },
      { name: "Søvn", pct: sleepPct, num: `${sleepScore}/10` },
    ];

    if (hrv != null) vitalsList.push({ name: "HRV", pct: Math.min(100, (hrv / 100) * 100), num: String(hrv) });
    if (rhr != null) vitalsList.push({ name: "RHR", pct: Math.min(100, Math.max(0, 100 - ((rhr - 35) / 65) * 100)), num: `${rhr} bpm` });

    return { score: displayScore, vitals: vitalsList };
  }, [activities, checkins, dailyLogs]);

  const empty = !(activities?.activities?.length);

  return (
    <div className="readiness">
      <PanelHead
        eyebrow="Form i dag"
        title="Beredskap"
        sub="Sammensatt av form, tretthet, søvn og HRV"
      />

      {empty ? (
        <div className="empty-hint">Ingen aktiviteter synkronisert enda. Koble Strava i Data.</div>
      ) : (
        <>
          <div className="readiness-score">
            <span className="val">{score}</span>
            <span className="of">/ 100</span>
            <span className="status">{scoreLabel(score)}</span>
          </div>
          <div className="vitals">
            {vitals.map((v, i) => (
              <div key={i} className="vital">
                <span className="name">{v.name}</span>
                <Track pct={v.pct} />
                <span className="num">{v.num}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
