import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useI18n } from "../../i18n/translations";

export default function RaceFormDialog({ open, onClose, onSubmit, initialData }) {
  const { t } = useI18n();
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
  });

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
      });
    } else {
      setForm({
        name: "", location: "", distance_km: "", elevation_gain_m: "",
        latitude: "", longitude: "", description: "", race_url: "",
        next_race_date: "", registration_info: "", image_url: "",
      });
    }
  }, [initialData, open]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
    };
    onSubmit(data);
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
            <Input id="race-name" value={form.name} onChange={handleChange("name")} required />
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("races.cancel")}</Button>
            <Button type="submit" disabled={!form.name.trim()}>{t("races.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
