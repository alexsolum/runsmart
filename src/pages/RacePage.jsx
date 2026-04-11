import React, { useState, useMemo, useCallback } from "react";
import { useAppData } from "../context/AppDataContext";
import RaceListView from "../components/races/RaceListView";
import RaceDetailView from "../components/races/RaceDetailView";
import RaceFormDialog from "../components/races/RaceFormDialog";

export default function RacePage() {
  const { races: racesCtx } = useAppData();
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [activeTab, setActiveTab] = useState("history");
  const [addOpen, setAddOpen] = useState(false);

  const selectedRace = useMemo(
    () => racesCtx.races.find((r) => r.id === selectedRaceId) ?? null,
    [racesCtx.races, selectedRaceId],
  );

  const handleAddRace = useCallback(async (data) => {
    const created = await racesCtx.createRace(data);
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

  return (
    <>
      <RaceListView
        races={racesCtx.races}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectRace={setSelectedRaceId}
        onAddRace={() => setAddOpen(true)}
      />
      <RaceFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddRace}
      />
    </>
  );
}
