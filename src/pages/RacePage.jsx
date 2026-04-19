import React, { useState, useMemo, useCallback } from "react";
import { useAppData } from "../context/AppDataContext";
import Segmented from "../components/ui/Segmented";
import RaceCardDone from "../components/races/RaceCardDone";
import RaceCardDream from "../components/races/RaceCardDream";
import RaceDetailView from "../components/races/RaceDetailView";
import RaceFormDialog from "../components/races/RaceFormDialog";

const TABS = ["Gjennomført", "Drømmer"];

function raceYear(race, done) {
  if (done) {
    const parts = race.race_participations ?? [];
    if (parts.length > 0) {
      const sorted = [...parts].sort((a, b) =>
        new Date(b.race_date) - new Date(a.race_date)
      );
      return sorted[0].race_date
        ? new Date(sorted[0].race_date).getUTCFullYear()
        : 0;
    }
  }
  const raw = race.race_date ?? race.next_race_date;
  return raw ? new Date(raw).getUTCFullYear() : 0;
}

function groupByYear(races, done = false) {
  const map = new Map();
  for (const r of races) {
    const year = raceYear(r, done);
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(r);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

export default function RacePage() {
  const { races: racesCtx } = useAppData();
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [activeTab, setActiveTab] = useState("Gjennomført");
  const [addOpen, setAddOpen] = useState(false);

  const selectedRace = useMemo(
    () => racesCtx.races.find((r) => r.id === selectedRaceId) ?? null,
    [racesCtx.races, selectedRaceId],
  );

  const doneRaces = useMemo(
    () => racesCtx.races.filter((r) => (r.race_participations ?? []).length > 0),
    [racesCtx.races],
  );

  const dreamRaces = useMemo(
    () => racesCtx.races.filter((r) => (r.race_participations ?? []).length === 0),
    [racesCtx.races],
  );

  const doneByYear = useMemo(() => groupByYear(doneRaces, true), [doneRaces]);
  const dreamByYear = useMemo(() => groupByYear(dreamRaces, false), [dreamRaces]);

  const handleAddRace = useCallback(async (data, raceInfo) => {
    const created = await racesCtx.createRace(data, raceInfo);
    setAddOpen(false);
    setSelectedRaceId(created.id);
  }, [racesCtx]);

  if (selectedRace) {
    return (
      <RaceDetailView
        race={selectedRace}
        onBack={() => setSelectedRaceId(null)}
      />
    );
  }

  const activeGroups = activeTab === "Gjennomført" ? doneByYear : dreamByYear;
  const Card = activeTab === "Gjennomført" ? RaceCardDone : RaceCardDream;
  const emptyMsg = activeTab === "Gjennomført"
    ? "Ingen fullførte løp ennå. Legg til ditt første løp nedenfor."
    : "Ingen drømmeløp ennå. Legg til et løp du vil gjennomføre.";

  return (
    <>
      <div className="canvas">
        <div className="full" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="cc-label">Løp</p>
              <h1 className="display-md" style={{ margin: 0 }}>Løpshistorikk</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Segmented
                options={TABS}
                value={activeTab}
                onChange={setActiveTab}
              />
              <button
                className="btn-primary"
                type="button"
                onClick={() => setAddOpen(true)}
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  border: 0,
                  borderRadius: "var(--r-md)",
                  padding: "8px 16px",
                  fontFamily: "var(--ff-display)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Legg til løp
              </button>
            </div>
          </div>

          {/* Timeline */}
          {activeGroups.length === 0 ? (
            <p className="body-sm" style={{ padding: "40px 0", textAlign: "center" }}>
              {emptyMsg}
            </p>
          ) : (
            <div className="race-timeline">
              {activeGroups.map(([year, races]) => (
                <div key={year} className="year-block">
                  <div className="year">
                    {year || "—"}
                    <span className="sub">{races.length} løp</span>
                  </div>
                  <div className="race-list">
                    {races.map((race) => (
                      <Card
                        key={race.id}
                        race={race}
                        onClick={() => setSelectedRaceId(race.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RaceFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddRace}
      />
    </>
  );
}
