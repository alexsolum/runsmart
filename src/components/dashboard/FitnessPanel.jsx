import { useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import { computeTrainingLoad } from "../../domain/compute";
import PanelHead from "../ui/PanelHead";
import Metric from "../ui/Metric";
import FitnessChart from "../charts/FitnessChart";

export default function FitnessPanel() {
  const { activities } = useAppData();

  const { series, metrics } = useMemo(() => {
    const acts = activities?.activities ?? [];
    const full = computeTrainingLoad(acts);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 112);
    const series = full.filter((d) => new Date(d.date) >= cutoff);

    if (!series.length) return { series: [], metrics: null };

    const latest = series[series.length - 1];
    const week7idx = Math.max(0, series.length - 8);
    const week7 = series[week7idx];

    const ctlDelta = (latest.ctl - week7.ctl).toFixed(1);
    const atlDelta = (latest.atl - week7.atl).toFixed(1);
    const tsbDelta = (latest.tsb - week7.tsb).toFixed(1);

    // Find peak CTL
    const peakCTL = Math.max(...series.map((d) => d.ctl));
    const peakIdx = series.findIndex((d) => d.ctl === peakCTL);
    const peakDate = series[peakIdx]?.date ?? "";
    const peakLabel = peakDate ? new Date(peakDate).toLocaleDateString("nb-NO", { day: "numeric", month: "short" }) : "—";

    return {
      series,
      metrics: {
        ctl: latest.ctl.toFixed(1),
        atl: latest.atl.toFixed(1),
        tsb: latest.tsb > 0 ? `+${latest.tsb.toFixed(1)}` : latest.tsb.toFixed(1),
        ctlDelta: `${Number(ctlDelta) >= 0 ? "↑" : "↓"} ${Math.abs(ctlDelta)} vs 7d`,
        atlDelta: `${Number(atlDelta) >= 0 ? "↑" : "↓"} ${Math.abs(atlDelta)} vs 7d`,
        tsbZone: latest.tsb > 10 ? "sone: frisk" : latest.tsb >= -5 ? "sone: nøytral" : "sone: sliten",
        tsbDir: latest.tsb > 10 ? "up" : "down",
        peakCTL: peakCTL.toFixed(1),
        peakLabel,
      },
    };
  }, [activities]);

  return (
    <div className="panel col-8">
      <PanelHead
        eyebrow="112 dager · form / tretthet"
        title="Formkurve (CTL/ATL/TSB)"
        sub={metrics ? "CTL, ATL og TSB basert på treningsbelastning." : "Ingen data enda."}
        actions={
          <div className="form-legend">
            <span className="k ctl">Form (CTL)</span>
            <span className="k atl">Tretthet (ATL)</span>
            <span className="k tsb">Overskudd (TSB)</span>
          </div>
        }
      />

      {series.length > 0 ? (
        <>
          <FitnessChart data={series} />
          {metrics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
              <Metric lbl="CTL nå" val={metrics.ctl} delta={metrics.ctlDelta} deltaDir="up" />
              <Metric lbl="ATL nå" val={metrics.atl} delta={metrics.atlDelta} deltaDir="down" />
              <Metric lbl="TSB nå" val={metrics.tsb} delta={metrics.tsbZone} deltaDir={metrics.tsbDir} />
              <Metric lbl="Peak CTL" val={metrics.peakCTL} delta={`topp ${metrics.peakLabel}`} />
            </div>
          )}
        </>
      ) : (
        <div className="empty-hint">Ingen aktiviteter synkronisert enda. Koble Strava i Data.</div>
      )}
    </div>
  );
}
