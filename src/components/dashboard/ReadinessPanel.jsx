import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeTrainingLoad } from "../../domain/compute";

function scoreLabel(score) {
  if (score >= 85) return "UTMERKET";
  if (score >= 70) return "KLAR";
  if (score >= 50) return "MODERAT";
  return "SLITEN";
}

function avg(values) {
  const list = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!list.length) return null;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

export default function ReadinessPanel() {
  const { activities, checkins, dailyLogs } = useAppData();

  const { score, rows, empty } = useMemo(() => {
    const acts = activities?.activities ?? [];
    const logs = dailyLogs?.logs ?? dailyLogs?.dailyLogs ?? [];
    const chks = checkins?.checkins ?? [];

    if (!acts.length) {
      return { score: 0, rows: [], empty: true };
    }

    const series = computeTrainingLoad(acts);
    const latest = series.length ? series[series.length - 1] : null;
    const tsb = latest?.tsb ?? 0;
    const atl = latest?.atl ?? 0;
    const ctl = latest?.ctl ?? 0;

    const sleep7d = avg(logs.slice(-7).map((log) => log.sleep_quality));
    const hrv7d = avg(logs.slice(-7).map((log) => log.hrv));
    const rpe7d = avg(logs.slice(-7).map((log) => log.training_quality));
    const rhr7d = avg(logs.slice(-7).map((log) => log.resting_hr ?? log.restingHeartRate));

    const latestCheckin = chks.slice(-1)[0];
    const fatigue = latestCheckin?.fatigue ?? avg(logs.slice(-7).map((log) => log.fatigue)) ?? 3;

    const rawScore = 78 + Math.max(-18, Math.min(12, tsb)) - Math.max(0, fatigue - 2) * 4;
    const displayScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const readinessRows = [
      { name: "Form (CTL)", num: ctl ? ctl.toFixed(1) : "—" },
      { name: "Tretthet", num: atl ? atl.toFixed(1) : "—" },
      { name: "Søvn 7d", num: sleep7d != null ? `${sleep7d.toFixed(1)}/5` : "—" },
      { name: "HRV 7d", num: hrv7d != null ? `${Math.round(hrv7d)}` : "—" },
      { name: "RPE 7d", num: rpe7d != null ? `${rpe7d.toFixed(1)}/5` : "—" },
      { name: "Hvilepuls", num: rhr7d != null ? `${Math.round(rhr7d)} bpm` : "—" },
    ];

    return { score: displayScore, rows: readinessRows, empty: false };
  }, [activities, checkins, dailyLogs]);

  return (
    <div className="readiness">
      <div className="panel-head">
        <div className="title-wrap">
          <p className="cc-label">FORM I DAG</p>
          <h3>Beredskap</h3>
          <p className="body-sm">Sammensatt av form, tretthet, søvn og HRV</p>
        </div>
      </div>

      {empty ? (
        <div className="empty-hint">Ingen aktiviteter synkronisert enda. Koble Strava i Data.</div>
      ) : (
        <>
          <div className="readiness-score">
            <span className="val">{score}</span>
            <span className="of">/ 100</span>
            <span className="status">{scoreLabel(score)}</span>
          </div>
          <div className="readiness-rows">
            {rows.map((row, i) => (
              <div key={i} className="readiness-row">
                <span className="name">{row.name}</span>
                <span className="dots" aria-hidden="true" />
                <span className="num">{row.num}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
