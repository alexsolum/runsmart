import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useI18n } from "../../i18n/translations";

const RESOURCE_TYPES = [
  { value: "race_page", label: "Race Page" },
  { value: "course_map", label: "Course Map" },
  { value: "blog", label: "Blog Post" },
  { value: "video", label: "Video" },
  { value: "registration", label: "Registration" },
  { value: "other", label: "Other" },
];

export default function ResourceFormDialog({ open, onClose, onSubmit }) {
  const { t } = useI18n();

  const [form, setForm] = useState({
    type: "other",
    title: "",
    url: "",
  });

  function handleChange(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      type: form.type,
      title: form.title.trim() || null,
      url: form.url.trim(),
    });
    setForm({ type: "other", title: "", url: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("races.addResource")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="res-type">{t("races.resourceType")}</Label>
            <select
              id="res-type"
              value={form.type}
              onChange={handleChange("type")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {RESOURCE_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="res-title">{t("races.resourceTitle")}</Label>
            <Input id="res-title" value={form.title} onChange={handleChange("title")} />
          </div>
          <div>
            <Label htmlFor="res-url">{t("races.resourceUrl")} *</Label>
            <Input id="res-url" type="url" value={form.url} onChange={handleChange("url")} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("races.cancel")}</Button>
            <Button type="submit" disabled={!form.url.trim()}>{t("races.save")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
