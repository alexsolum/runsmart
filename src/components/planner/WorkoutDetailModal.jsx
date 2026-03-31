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

function metricLabel(value, suffix) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Not set";
  return `${value} ${suffix}`;
}

function WorkoutEditForm({ selection, saving, onCancel, onSave }) {
  const workout = selection?.workout;
  const [formValues, setFormValues] = useState(() => ({
    sport: workout?.sport ?? "",
    type: workout?.type ?? "",
    name: workout?.name ?? "",
    description: workout?.description ?? "",
    durationMinutes:
      typeof workout?.durationMinutes === "number" ? String(workout.durationMinutes) : "",
    distanceKm: typeof workout?.distanceKm === "number" ? String(workout.distanceKm) : "",
  }));

  const editKey = `${selection?.workout?.id}:edit`;

  useEffect(() => {
    setFormValues({
      sport: workout?.sport ?? "",
      type: workout?.type ?? "",
      name: workout?.name ?? "",
      description: workout?.description ?? "",
      durationMinutes:
        typeof workout?.durationMinutes === "number" ? String(workout.durationMinutes) : "",
      distanceKm: typeof workout?.distanceKm === "number" ? String(workout.distanceKm) : "",
    });
  }, [editKey, workout]);

  return (
    <form
      key={editKey}
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave?.(formValues);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hierarchical-sport">Sport</Label>
          <Input
            id="hierarchical-sport"
            name="sport"
            aria-label="Sport"
            value={formValues.sport}
            onChange={(event) => setFormValues((current) => ({ ...current, sport: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hierarchical-type">Type</Label>
          <Input
            id="hierarchical-type"
            name="type"
            aria-label="Type"
            value={formValues.type}
            onChange={(event) => setFormValues((current) => ({ ...current, type: event.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hierarchical-name">Workout name</Label>
        <Input
          id="hierarchical-name"
          name="name"
          aria-label="Workout name"
          value={formValues.name}
          onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hierarchical-description">Description</Label>
        <Textarea
          id="hierarchical-description"
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
          <Label htmlFor="hierarchical-duration">Duration</Label>
          <Input
            id="hierarchical-duration"
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
          <Label htmlFor="hierarchical-distance">Distance</Label>
          <Input
            id="hierarchical-distance"
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save workout"}
        </Button>
      </div>
    </form>
  );
}

export function WorkoutDetailModal({
  open,
  onOpenChange,
  selection,
  saving = false,
  onToggleCompleted,
  onSave,
}) {
  const [mode, setMode] = useState("summary");
  const workout = selection?.workout ?? null;
  const completionLabel = workout?.completed ? "Mark incomplete" : "Mark complete";
  const dayContext = useMemo(() => {
    if (!selection?.weekNumber || !selection?.dayLabel) return null;
    return `Week ${selection.weekNumber} · ${selection.dayLabel}`;
  }, [selection?.dayLabel, selection?.weekNumber]);

  useEffect(() => {
    if (!open) {
      setMode("summary");
    }
  }, [open, selection?.workout?.id]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setMode("summary");
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      <ResponsiveModalContent className="max-w-2xl border-0 bg-white px-0 pb-0 pt-0 sm:rounded-[28px]">
        {workout ? (
          <div className="space-y-6 px-6 py-6">
            <ResponsiveModalHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                {workout?.sport ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                    {workout.sport}
                  </span>
                ) : null}
                {workout?.type ? (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                    {workout.type}
                  </span>
                ) : null}
                {workout?.primaryZone ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    {workout.primaryZone}
                  </span>
                ) : null}
              </div>
              <ResponsiveModalTitle className="text-2xl font-semibold text-slate-950">
                {workout?.name ?? "Workout detail"}
              </ResponsiveModalTitle>
              <ResponsiveModalDescription className="text-sm text-slate-500">
                {dayContext ?? "Review the planned session before editing."}
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>

            {mode === "summary" ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Duration
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {metricLabel(workout?.durationMinutes, "min")}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Distance
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {metricLabel(workout?.distanceKm, "km")}
                    </p>
                  </div>
                </div>

                {workout?.description ? (
                  <div className="rounded-[24px] border border-slate-200 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Description
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{workout.description}</p>
                  </div>
                ) : null}

                {workout?.humanReadable ? (
                  <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                      Session structure
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-100">{workout.humanReadable}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onToggleCompleted?.()}
                    disabled={saving}
                  >
                    {completionLabel}
                  </Button>
                  <Button type="button" onClick={() => setMode("edit")} disabled={saving}>
                    Edit workout
                  </Button>
                </div>
              </div>
            ) : (
              <WorkoutEditForm
                selection={selection}
                saving={saving}
                onCancel={() => setMode("summary")}
                onSave={async (values) => {
                  await onSave?.(values);
                  setMode("summary");
                }}
              />
            )}
          </div>
        ) : null}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
