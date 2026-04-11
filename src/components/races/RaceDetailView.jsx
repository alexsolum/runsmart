import React, { useState, useCallback } from "react";
import { Card, CardContent } from "../ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Pencil, Plus } from "lucide-react";
import ParticipationAccordion from "./ParticipationAccordion";
import ResourceList from "./ResourceList";
import RaceFormDialog from "./RaceFormDialog";
import ParticipationFormDialog from "./ParticipationFormDialog";
import ResourceFormDialog from "./ResourceFormDialog";
import { useAppData } from "../../context/AppDataContext";
import { useI18n } from "../../i18n/translations";

function findPR(participations) {
  if (!participations || participations.length === 0) return null;
  let best = null;
  for (const p of participations) {
    if (!p.finish_time) continue;
    const str = String(p.finish_time);
    if (best === null || str < best) best = str;
  }
  return best;
}

function formatFinishTime(timeStr) {
  if (!timeStr) return null;
  return timeStr.replace(/^0+(?=\d{2}:)/, "");
}

export default function RaceDetailView({ race, onBack }) {
  const { t } = useI18n();
  const { races: racesCtx } = useAppData();
  const [subTab, setSubTab] = useState("participations");
  const [editOpen, setEditOpen] = useState(false);
  const [addParticipationOpen, setAddParticipationOpen] = useState(false);
  const [addResourceOpen, setAddResourceOpen] = useState(false);

  const participations = race.race_participations ?? [];
  const resources = race.race_resources ?? [];
  const pr = findPR(participations);
  const isBucketList = participations.length === 0;

  const handleUpdateRace = useCallback(async (data) => {
    await racesCtx.updateRace(race.id, data);
    setEditOpen(false);
  }, [race.id, racesCtx]);

  const handleAddParticipation = useCallback(async (data) => {
    await racesCtx.addParticipation(race.id, data);
    setAddParticipationOpen(false);
  }, [race.id, racesCtx]);

  const handleAddResource = useCallback(async (data) => {
    await racesCtx.addResource(race.id, data);
    setAddResourceOpen(false);
  }, [race.id, racesCtx]);

  const handleDeleteResource = useCallback(async (resourceId) => {
    await racesCtx.deleteResource(resourceId, race.id);
  }, [race.id, racesCtx]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#"
              onClick={(e) => { e.preventDefault(); onBack(); }}
            >
              {t("nav.races")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{race.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Hero Card */}
      <Card className="overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-br from-blue-500 to-blue-700 flex items-end p-5 relative">
          <div>
            <h2 className="text-white font-bold text-xl drop-shadow-sm">{race.name}</h2>
            {race.location && (
              <p className="text-blue-100 text-sm">{race.location}</p>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setEditOpen(true)}>
              <Pencil size={14} className="mr-1" />
              {t("races.editRace")}
            </Button>
            <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setAddParticipationOpen(true)}>
              <Plus size={14} className="mr-1" />
              {t("races.addParticipation")}
            </Button>
          </div>
        </div>

        <CardContent className="p-5">
          {/* Stats row */}
          <div className="flex gap-6 flex-wrap mb-4">
            {race.distance_km && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("races.distance")}</p>
                <p className="font-semibold text-sm">{race.distance_km} km</p>
              </div>
            )}
            {race.elevation_gain_m && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("races.elevation")}</p>
                <p className="font-semibold text-sm">{race.elevation_gain_m}m D+</p>
              </div>
            )}
            {race.next_race_date && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("races.nextEdition")}</p>
                <p className="font-semibold text-sm">
                  {new Date(race.next_race_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
            {race.registration_info && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("races.entry")}</p>
                <p className="font-semibold text-sm">{race.registration_info}</p>
              </div>
            )}
            {!isBucketList && (
              <div className="ml-auto flex gap-2 items-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {participations.length}× {t("races.finisher")}
                </Badge>
                {pr && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {t("races.pr")}: {formatFinishTime(pr)}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {race.description && (
            <>
              <Separator className="mb-4" />
              <p className="text-sm text-slate-600 leading-relaxed">{race.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sub-tabs: Participations | Resources */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="participations">
            {t("races.participations")} ({participations.length})
          </TabsTrigger>
          <TabsTrigger value="resources">
            {t("races.resources")} ({resources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participations">
          {participations.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No participations yet</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setAddParticipationOpen(true)}>
                <Plus size={14} className="mr-1" />
                {t("races.addParticipation")}
              </Button>
            </div>
          ) : (
            <ParticipationAccordion participations={participations} />
          )}
        </TabsContent>

        <TabsContent value="resources">
          <ResourceList
            resources={resources}
            onAdd={() => setAddResourceOpen(true)}
            onDelete={handleDeleteResource}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RaceFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdateRace}
        initialData={race}
      />
      <ParticipationFormDialog
        open={addParticipationOpen}
        onClose={() => setAddParticipationOpen(false)}
        onSubmit={handleAddParticipation}
      />
      <ResourceFormDialog
        open={addResourceOpen}
        onClose={() => setAddResourceOpen(false)}
        onSubmit={handleAddResource}
      />
    </div>
  );
}
