import React, { useState, useMemo, useCallback } from "react";
import { useAppData } from "../context/AppDataContext";
import Segmented from "../components/ui/Segmented";
import RaceCardDone from "../components/races/RaceCardDone";
import RaceCardDream from "../components/races/RaceCardDream";
import RaceStatsRow from "../components/races/RaceStatsRow";
import RaceDetailView from "../components/races/RaceDetailView";
import RaceFormDialog from "../components/races/RaceFormDialog";

const TABS = ["Gjennomført", "Drømmer"];

function rowYear(row, done) {
  const raw = done
    ? row.participation?.race_date
    : row.race?.next_race_date ?? row.race?.race_date;
  return raw ? new Date(raw).getUTCFullYear() : 0;
}

function groupByYear(rows, done = false) {
  const map = new Map();
  for (const row of rows) {
    const year = rowYear(row, done);
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(row);
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

  const doneRows = useMemo(
    () =>
      racesCtx.races.flatMap((race) =>
        (race.race_participations ?? []).map((participation) => ({
          race,
          participation,
          id: `${race.id}-${participation.id}`,
        })),
      ),
    [racesCtx.races],
  );

  const dreamRows = useMemo(
    () =>
      racesCtx.races
        .filter(
          (race) =>
            (race.race_participations ?? []).length === 0 || race.next_race_date,
        )
        .map((race) => ({ race, id: race.id })),
    [racesCtx.races],
  );

  const doneByYear = useMemo(() => groupByYear(doneRows, true), [doneRows]);
  const dreamByYear = useMemo(() => groupByYear(dreamRows, false), [dreamRows]);

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
  const emptyMsg = activeTab === "Gjennomført"
    ? "Ingen fullførte løp ennå. Legg til ditt første løp nedenfor."
    : "Ingen drømmeløp ennå. Legg til et løp du vil gjennomføre.";

  return (
    <>
      <div className="canvas">
        <div className="full" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="cc-label">LØPSSENTER · VEGG OG DRØMMER</p>
                <h1 className="display-md" style={{ margin: 0 }}>Løp</h1>
                <p className="body-sm" style={{ marginTop: 8, maxWidth: 720 }}>
                  Alt du har gjennomført og alt du sikter mot. Sorter gjerne etter år for å se hvordan sesongen bygde seg.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Segmented
                  options={TABS}
                  value={activeTab}
                  onChange={setActiveTab}
                />
                <button className="btn-primary" type="button" onClick={() => setAddOpen(true)}>
                  + Legg til løp
                </button>
              </div>
            </div>

            <RaceStatsRow
              doneRows={doneRows}
              dreamRaces={dreamRows.map((row) => row.race)}
            />
          </div>

          {activeGroups.length === 0 ? (
            <p className="body-sm" style={{ padding: "40px 0", textAlign: "center" }}>
              {emptyMsg}
            </p>
          ) : (
            <div className="race-timeline">
              {activeGroups.map(([year, rows]) => (
                <div key={year} className="year-block">
                  <div className="year">
                    {year || "—"}
                    <span className="sub">
                      {activeTab === "Gjennomført"
                        ? `${rows.length} fullføringer`
                        : `${rows.length} planlagt`}
                    </span>
                  </div>
                  <div className="race-list">
                    {rows.map((row) =>
                      activeTab === "Gjennomført" ? (
                        <RaceCardDone
                          key={row.id}
                          race={row.race}
                          participation={row.participation}
                          onClick={() => setSelectedRaceId(row.race.id)}
                        />
                      ) : (
                        <RaceCardDream
                          key={row.id}
                          race={row.race}
                          onClick={() => setSelectedRaceId(row.race.id)}
                        />
                      ),
                    )}
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
