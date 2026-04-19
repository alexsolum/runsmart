import { useMemo, useState } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeEnduranceEfficiency } from "../../domain/compute";
import PanelHead from "../ui/PanelHead";
import Segmented from "../ui/Segmented";
import Chip from "../ui/Chip";
import EfficiencyChart from "../charts/EfficiencyChart";

const WINDOW_MAP = { "90d": 90, "6m": 180, "1y": 365, "2y": 730 };

export default function EfficiencyPanel() {
  const { activities } = useAppData();
  const [range, setRange] = useState("2y");

  const { effData, avg30, trend90 } = useMemo(() => {
    const acts = activities?.activities ?? [];
    const windowDays = WINDOW_MAP[range] ?? 365;
    const result = computeEnduranceEfficiency(acts, { windowDays });
    const points = result.points ?? [];
    const rolling = result.rollingAverage ?? [];

    if (!points.length) return { effData: result, avg30: null, trend90: null };

    // 30-day rolling average of EF
    const cutoff30 = Date.now() - 30 * 86400000;
    const recent30 = points.filter((p) => (p.timestamp ?? p.x * 1000) >= cutoff30);
    const avg30 = recent30.length
      ? (recent30.reduce((s, p) => s + (p.efficiencyFactor ?? p.y ?? 0), 0) / recent30.length).toFixed(3)
      : null;

    // 90-day trend: compare latest rolling avg to 90 days ago
    const cutoff90 = Date.now() - 90 * 86400000;
    const old = rolling.find((r) => Math.abs((r.x * 1000) - cutoff90) < 7 * 86400000);
    const latest = rolling[rolling.length - 1];
    let trend90 = null;
    if (old && latest) {
      const delta = ((latest.rollingAverage - old.rollingAverage) / old.rollingAverage) * 100;
      trend90 = delta.toFixed(1);
    }

    return { effData: result, avg30, trend90 };
  }, [activities, range]);

  const trendDir = trend90 ? (Number(trend90) >= 0 ? "up" : "down") : null;
  const trendLabel = trend90
    ? `${Number(trend90) >= 0 ? "▲" : "▼"} ${Math.abs(trend90)}% · 90d trend`
    : null;

  return (
    <div className="panel col-8 eff-panel">
      <PanelHead
        eyebrow="Utholdenhetseffektivitet"
        title="Aerob effektivitet"
        sub="Effektivitetsfaktor for flate aerobe løp. 30-dagers snitt glatter ut støy."
        actions={
          <Segmented options={["90d", "6m", "1y", "2y"]} value={range} onChange={setRange} />
        }
      />

      {effData?.points?.length > 0 ? (
        <>
          <div className="eff-stats">
            <div className="metric">
              <span className="lbl">30-dagers snitt</span>
              <span className="big">{avg30 ?? "—"}</span>
            </div>
            {trendLabel && (
              <span className={`d ${trendDir ?? ""}`}>{trendLabel}</span>
            )}
            <Chip kind="ghost">Terskel 1.50</Chip>
          </div>
          <EfficiencyChart data={effData} />
        </>
      ) : (
        <div className="empty-hint">Ingen aktiviteter med pulsdata enda. Koble Strava i Data.</div>
      )}
    </div>
  );
}
