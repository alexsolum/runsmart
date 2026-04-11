import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import { Plus, MapPin } from "lucide-react";
import RaceCard from "./RaceCard";
import { useI18n } from "../../i18n/translations";

export default function RaceListView({ races, activeTab, onTabChange, onSelectRace, onAddRace }) {
  const { t } = useI18n();

  const historyRaces = races.filter((r) => (r.race_participations ?? []).length > 0);
  const bucketListRaces = races.filter((r) => (r.race_participations ?? []).length === 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Map placeholder */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl h-40 flex items-center justify-center gap-2 text-slate-400 text-sm mb-6">
        <MapPin size={18} />
        {t("races.mapPlaceholder")}
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="history">
              {t("races.history")} ({historyRaces.length})
            </TabsTrigger>
            <TabsTrigger value="bucket-list">
              {t("races.bucketList")} ({bucketListRaces.length})
            </TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={onAddRace}>
            <Plus size={16} className="mr-1" />
            {t("races.addRace")}
          </Button>
        </div>

        <TabsContent value="history">
          {historyRaces.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">{t("races.noRaces")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {historyRaces.map((race) => (
                <RaceCard key={race.id} race={race} onClick={() => onSelectRace(race.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bucket-list">
          {bucketListRaces.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">{t("races.noRaces")}</p>
              <p className="text-xs mt-1">{t("races.addFirst")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bucketListRaces.map((race) => (
                <RaceCard key={race.id} race={race} onClick={() => onSelectRace(race.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
