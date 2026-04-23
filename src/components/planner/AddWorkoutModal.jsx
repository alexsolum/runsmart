import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "../ui/ResponsiveModal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

function formatDayContext(selection) {
  if (!selection?.weekNumber || !selection?.dayLabel) return null;
  return `Week ${selection.weekNumber} · ${selection.dayLabel}`;
}

function normalizeNumberField(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function AddWorkoutModal({ open, onOpenChange, selection, saving = false, onSave }) {
  const [formValues, setFormValues] = useState({
    sport: "Run",
    type: "Easy",
    name: "",
    description: "",
    durationMinutes: "",
    distanceKm: "",
  });

  const createKey = `${selection?.weekNumber ?? "x"}:${selection?.dayDate ?? "x"}`;
  const dayContext = useMemo(() => formatDayContext(selection), [selection]);

  useEffect(() => {
    setFormValues({
      sport: "Run",
      type: "Easy",
      name: "",
      description: "",
      durationMinutes: "",
      distanceKm: "",
    });
  }, [createKey]);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-2xl border-0 bg-white px-0 pb-0 pt-0 sm:rounded-[28px]">
        <div className="space-y-6 px-6 py-6">
          <ResponsiveModalHeader className="space-y-3 text-left">
            <ResponsiveModalTitle className="text-2xl font-semibold text-slate-950">
              Add workout
            </ResponsiveModalTitle>
            <ResponsiveModalDescription className="text-sm text-slate-500">
              {dayContext ?? "Create a workout for this training day."}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <form
            key={createKey}
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await onSave?.({
                sport: formValues.sport,
                type: formValues.type,
                name: formValues.name,
                description: formValues.description,
                durationMinutes: normalizeNumberField(formValues.durationMinutes),
                distanceKm: normalizeNumberField(formValues.distanceKm),
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hierarchical-create-sport">Sport</Label>
                <Input
                  id="hierarchical-create-sport"
                  name="sport"
                  aria-label="Sport"
                  value={formValues.sport}
                  onChange={(event) => setFormValues((current) => ({ ...current, sport: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hierarchical-create-type">Type</Label>
                <Input
                  id="hierarchical-create-type"
                  name="type"
                  aria-label="Type"
                  value={formValues.type}
                  onChange={(event) => setFormValues((current) => ({ ...current, type: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hierarchical-create-name">Workout name</Label>
              <Input
                id="hierarchical-create-name"
                name="name"
                aria-label="Workout name"
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hierarchical-create-description">Description</Label>
              <Textarea
                id="hierarchical-create-description"
                name="description"
                aria-label="Description"
                rows={4}
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hierarchical-create-duration">Duration</Label>
                <Input
                  id="hierarchical-create-duration"
                  name="durationMinutes"
                  aria-label="Duration"
                  type="number"
                  step="1"
                  value={formValues.durationMinutes}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, durationMinutes: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hierarchical-create-distance">Distance</Label>
                <Input
                  id="hierarchical-create-distance"
                  name="distanceKm"
                  aria-label="Distance"
                  type="number"
                  step="0.1"
                  value={formValues.distanceKm}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, distanceKm: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add workout"}
              </Button>
            </div>
          </form>
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
