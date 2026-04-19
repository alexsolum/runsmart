import { useState, useEffect, useMemo } from "react";
import { useAppData } from "../../context/AppDataContext";
import Icon from "../shell/Icon";
import Track from "../ui/Track";

function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getCountdown(target) {
  const diff = Math.max(0, new Date(target) - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return { days, hours, mins, secs };
}

export default function RaceCountdown() {
  const { races, hierarchicalPlan } = useAppData();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { race, countdown, progressPct, totalWeeks } = useMemo(() => {
    const raceList = races?.races ?? [];
    const plan = hierarchicalPlan?.plan;

    // Find next upcoming race (unparticipated), or use plan's race_date
    const upcoming = raceList
      .filter((r) => new Date(r.race_date) > new Date() && !(r.race_participations?.length))
      .sort((a, b) => new Date(a.race_date) - new Date(b.race_date))[0];

    const targetDate = upcoming?.race_date ?? plan?.race_date ?? null;
    if (!targetDate) return { race: null, countdown: null, progressPct: 0, totalWeeks: 13 };

    const cd = getCountdown(targetDate);
    const raceDate = new Date(targetDate);
    const total = plan?.race_date === targetDate && plan
      ? Math.max(4, Math.ceil((raceDate - new Date()) / (7 * 86400000)))
      : 13;

    const planWeeks = plan?.weeks_total ?? total;
    const remaining = Math.ceil((raceDate - new Date()) / (7 * 86400000));
    const pct = planWeeks > 0 ? Math.max(0, Math.min(100, ((planWeeks - remaining) / planWeeks) * 100)) : 0;

    return {
      race: upcoming ?? { race_date: plan?.race_date, name: plan?.goal_race ?? "A-løp", distance_km: plan?.distance_km },
      countdown: cd,
      progressPct: pct,
      totalWeeks: planWeeks,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [races, hierarchicalPlan, tick]);

  if (!race) {
    return (
      <div className="panel ink col-4" style={{ gap: 14, background: "linear-gradient(160deg,#0a1628,#112a54 80%)" }}>
        <div className="flex between center">
          <span className="cc-label">A-løp</span>
          <Icon name="flag" size={14} style={{ color: "#7aa9ef" }} />
        </div>
        <div className="empty-hint" style={{ color: "#7e8aa3" }}>Ingen kommende løp. Legg til i Løp.</div>
      </div>
    );
  }

  const raceDateStr = new Date(race.race_date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
  const distKm = race.distance_km ? `${race.distance_km} km` : "";
  const weeksCompleted = Math.round(((progressPct / 100) * totalWeeks) * 10) / 10;

  return (
    <div className="panel ink col-4" style={{ gap: 14, background: "linear-gradient(160deg,#0a1628,#112a54 80%)" }}>
      <div className="flex between center">
        <span className="cc-label">{distKm ? `A-løp · ${distKm}` : "A-løp"}</span>
        <Icon name="flag" size={14} style={{ color: "#7aa9ef" }} />
      </div>

      <div>
        <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: "-.02em", color: "#fff", lineHeight: 1.12 }}>
          {race.name ?? race.race_name ?? "Løp"}
        </div>
        <div style={{ color: "#aab4c6", fontFamily: "JetBrains Mono, monospace", fontSize: 12, marginTop: 6 }}>
          {raceDateStr}{race.location ? ` · ${race.location}` : ""}
        </div>
      </div>

      {countdown && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, padding: "10px 0 4px" }}>
          {[
            { n: pad(countdown.days), l: "dager" },
            { n: pad(countdown.hours), l: "timer" },
            { n: pad(countdown.mins), l: "min" },
            { n: pad(countdown.secs), l: "sek" },
          ].map((x, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.05)", borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-.02em" }}>{x.n}</div>
              <div style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "#7e8aa3", marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Track pct={progressPct} />
        <div style={{ fontSize: 11, color: "#7e8aa3" }}>{weeksCompleted} av {totalWeeks} uker fullført</div>
      </div>

      <button className="btn" style={{ background: "rgba(255,255,255,.12)", color: "#fff", alignSelf: "flex-start" }}>
        <Icon name="arrowUR" size={12} /> Rennsenter
      </button>
    </div>
  );
}
