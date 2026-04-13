import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Loader2, X } from "lucide-react";
import { useI18n } from "../../i18n/translations";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { invokeEdgeFunctionWithSessionRetry } from "../../lib/edgeFunctionAuth";

export default function RaceFormDialog({ open, onClose, onSubmit, initialData }) {
  const { t } = useI18n();
  const client = useMemo(() => getSupabaseClient(), []);
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    name: "",
    location: "",
    distance_km: "",
    elevation_gain_m: "",
    latitude: "",
    longitude: "",
    description: "",
    race_url: "",
    next_race_date: "",
    registration_info: "",
    image_url: "",
    cover_image_url: "",
    sections: null,
  });

  const [raceInfo, setRaceInfo] = useState(null);
  const [raceInfoLoading, setRaceInfoLoading] = useState(false);
  const [coverImageAutoFilled, setCoverImageAutoFilled] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name ?? "",
        location: initialData.location ?? "",
        distance_km: initialData.distance_km ?? "",
        elevation_gain_m: initialData.elevation_gain_m ?? "",
        latitude: initialData.latitude ?? "",
        longitude: initialData.longitude ?? "",
        description: initialData.description ?? "",
        race_url: initialData.race_url ?? "",
        next_race_date: initialData.next_race_date ?? "",
        registration_info: initialData.registration_info ?? "",
        image_url: initialData.image_url ?? "",
        cover_image_url: initialData.cover_image_url ?? "",
        sections: initialData.sections ?? null,
      });
      setCoverImageAutoFilled(false);
    } else {
      setForm({
        name: "", location: "", distance_km: "", elevation_gain_m: "",
        latitude: "", longitude: "", description: "", race_url: "",
        next_race_date: "", registration_info: "", image_url: "",
        cover_image_url: "",
        sections: null,
      });
      setCoverImageAutoFilled(false);
      setRaceInfo(null);
    }
  }, [initialData, open]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleRaceLookup() {
    if (!form.name.trim() || raceInfoLoading) return;
    setRaceInfoLoading(true);
    setRaceInfo(null);
    try {
      const { data, error } = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: { mode: "race_info", raceName: form.name.trim() },
      });
      if (error) throw error;
      const info = data?.raceInfo ?? null;
      setRaceInfo(info);
      if (info) {
        setForm((prev) => ({
          ...prev,
          location: prev.location || (info.location ?? ""),
          distance_km: prev.distance_km || (info.distanceKm != null ? String(info.distanceKm) : ""),
          elevation_gain_m: prev.elevation_gain_m || (info.elevationGainM != null ? String(info.elevationGainM) : ""),
          description: prev.description || (info.description ?? ""),
          registration_info: prev.registration_info || (info.registrationInfo ?? ""),
          latitude: prev.latitude || (info.latitude != null ? String(info.latitude) : ""),
          longitude: prev.longitude || (info.longitude != null ? String(info.longitude) : ""),
          next_race_date: prev.next_race_date || (info.nextRaceDate ?? ""),
          race_url: prev.race_url || (info.raceUrl ?? ""),
          sections: info.sections ?? null,
        }));
        // Wikipedia photo fetch
        if (info?.wikipediaTitle) {
          try {
            const wikiRes = await fetch(
              `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(info.wikipediaTitle)}`
            );
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              const photoUrl =
                wikiData.originalimage?.source ?? wikiData.thumbnail?.source ?? null;
              if (photoUrl) {
                setForm((prev) => ({
                  ...prev,
                  cover_image_url: prev.cover_image_url || photoUrl,
                }));
                setCoverImageAutoFilled(true);
              }
            }
          } catch {
            // silent — field stays empty if fetch fails
          }
        }
      }
    } catch (err) {
      console.error("Race info lookup failed:", err);
    } finally {
      setRaceInfoLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      name: form.name.trim(),
      location: form.location.trim() || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      elevation_gain_m: form.elevation_gain_m ? Number(form.elevation_gain_m) : null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      description: form.description.trim() || null,
      race_url: form.race_url.trim() || null,
      next_race_date: form.next_race_date || null,
      registration_info: form.registration_info.trim() || null,
      image_url: form.image_url.trim() || null,
      cover_image_url: form.cover_image_url.trim() || null,
      sections: form.sections ?? null,
    };
    onSubmit(data, raceInfo);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("races.editRace") : t("races.addRace")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="race-name">{t("races.name")} *</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="race-name"
                value={form.name}
                onChange={handleChange("name")}
                required
                className="flex-1"
              />
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRaceLookup}
                  disabled={!form.name.trim() || raceInfoLoading}
                >
                  {raceInfoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Slå opp →"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Race info card */}
          {raceInfo && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm relative">
              <button
                type="button"
                onClick={() => setRaceInfo(null)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="font-semibold">{raceInfo.displayName}</p>
              <p className="text-muted-foreground mt-0.5">
                {raceInfo.distanceKm && `${raceInfo.distanceKm}km`}
                {raceInfo.terrain && ` · ${raceInfo.terrain}`}
                {raceInfo.location && ` · ${raceInfo.location}`}
              </p>
              {raceInfo.keyFacts && (
                <p className="mt-1 text-muted-foreground">{raceInfo.keyFacts}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="race-location">{t("races.location")}</Label>
            <Input id="race-location" value={form.location} onChange={handleChange("location")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="race-distance">{t("races.distanceKm")}</Label>
              <Input id="race-distance" type="number" step="0.1" value={form.distance_km} onChange={handleChange("distance_km")} />
            </div>
            <div>
              <Label htmlFor="race-elevation">{t("races.elevationM")}</Label>
              <Input id="race-elevation" type="number" value={form.elevation_gain_m} onChange={handleChange("elevation_gain_m")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="race-lat">{t("races.latitude")}</Label>
              <Input id="race-lat" type="number" step="any" value={form.latitude} onChange={handleChange("latitude")} />
            </div>
            <div>
              <Label htmlFor="race-lng">{t("races.longitude")}</Label>
              <Input id="race-lng" type="number" step="any" value={form.longitude} onChange={handleChange("longitude")} />
            </div>
          </div>
          <div>
            <Label htmlFor="race-description">{t("races.description")}</Label>
            <Textarea id="race-description" value={form.description} onChange={handleChange("description")} rows={3} />
          </div>
          <div>
            <Label htmlFor="race-url">{t("races.raceUrl")}</Label>
            <Input id="race-url" type="url" value={form.race_url} onChange={handleChange("race_url")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="race-next-date">{t("races.nextEdition")}</Label>
              <Input id="race-next-date" type="date" value={form.next_race_date} onChange={handleChange("next_race_date")} />
            </div>
            <div>
              <Label htmlFor="race-registration">{t("races.registrationInfo")}</Label>
              <Input id="race-registration" value={form.registration_info} onChange={handleChange("registration_info")} />
            </div>
          </div>
          <div>
            <Label htmlFor="race-image">{t("races.imageUrl")}</Label>
            <Input id="race-image" type="url" value={form.image_url} onChange={handleChange("image_url")} />
          </div>
          <div>
            <Label htmlFor="race-cover-image">{t("races.coverImageUrl")}</Label>
            <Input
              id="race-cover-image"
              type="url"
              value={form.cover_image_url}
              onChange={(e) => {
                setCoverImageAutoFilled(false);
                setForm((prev) => ({ ...prev, cover_image_url: e.target.value }));
              }}
            />
            {coverImageAutoFilled && (
              <p className="text-xs text-muted-foreground mt-1">Auto-filled from Wikipedia</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("races.cancel")}</Button>
            <Button type="submit" disabled={!form.name.trim()}>{t("races.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
