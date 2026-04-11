import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useI18n } from "../../i18n/translations";

export default function ParticipationFormDialog({ open, onClose, onSubmit, initialData }) {
  const { t } = useI18n();
  const isEdit = Boolean(initialData);

  const [form, setForm] = useState({
    race_date: "",
    finish_time: "",
    notes: "",
    strava_activity_id: "",
    photo_album_url: "",
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        race_date: initialData.race_date ?? "",
        finish_time: initialData.finish_time ?? "",
        notes: initialData.notes ?? "",
        strava_activity_id: initialData.strava_activity_id ?? "",
        photo_album_url: initialData.photo_album_url ?? "",
      });
    } else {
      setForm({ race_date: "", finish_time: "", notes: "", strava_activity_id: "", photo_album_url: "" });
    }
  }, [initialData, open]);

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      race_date: form.race_date,
      finish_time: form.finish_time.trim() || null,
      notes: form.notes.trim() || null,
      strava_activity_id: form.strava_activity_id.trim() || null,
      photo_album_url: form.photo_album_url.trim() || null,
    };
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Participation" : t("races.addParticipation")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="part-date">{t("races.raceDate")} *</Label>
            <Input id="part-date" type="date" value={form.race_date} onChange={handleChange("race_date")} required />
          </div>
          <div>
            <Label htmlFor="part-time">{t("races.finishTime")}</Label>
            <Input id="part-time" placeholder="HH:MM:SS" value={form.finish_time} onChange={handleChange("finish_time")} />
          </div>
          <div>
            <Label htmlFor="part-notes">{t("races.raceNotes")}</Label>
            <Textarea id="part-notes" value={form.notes} onChange={handleChange("notes")} rows={4} />
          </div>
          <div>
            <Label htmlFor="part-strava">{t("races.stravaActivityId")}</Label>
            <Input id="part-strava" value={form.strava_activity_id} onChange={handleChange("strava_activity_id")} placeholder="e.g. 12345678" />
          </div>
          <div>
            <Label htmlFor="part-photos">{t("races.photoAlbumUrl")}</Label>
            <Input id="part-photos" type="url" value={form.photo_album_url} onChange={handleChange("photo_album_url")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("races.cancel")}</Button>
            <Button type="submit" disabled={!form.race_date}>{t("races.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
