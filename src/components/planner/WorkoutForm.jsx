import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Trash2, Check } from "lucide-react";

import { WORKOUT_TYPES } from "../../domain/workoutTypes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const workoutSchema = z.object({
  workout_type: z.string().min(1),
  workout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  distance_km: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  duration_min: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  description: z.string().max(500).optional(),
  completed: z.boolean().optional(),
});

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function toDefaults(mode, entry) {
  if (mode === "edit" && entry) {
    return {
      workout_type: entry.workout_type || "EASY",
      workout_date: entry.workout_date || todayIso(),
      distance_km: entry.distance_km ?? "",
      duration_min: entry.duration_min ?? "",
      description: entry.description ?? "",
      completed: !!entry.completed,
    };
  }

  return {
    workout_type: "EASY",
    workout_date: entry?.workout_date || todayIso(),
    distance_km: "",
    duration_min: "",
    description: "",
    completed: false,
  };
}

export function WorkoutForm({
  entry,
  onSubmit,
  onDelete,
  onCancel,
  mode = "create",
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const defaultValues = useMemo(() => toDefaults(mode, entry), [mode, entry]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues,
    resolver: zodResolver(workoutSchema),
  });

  const selectedType = watch("workout_type");
  const meta = WORKOUT_TYPES[selectedType] ?? WORKOUT_TYPES.EASY;
  const isEdit = mode === "edit";
  const supportsBackdrop =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("(-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))");

  const headerStyle = {
    background: "rgba(0, 51, 113, 0.85)",
    ...(supportsBackdrop
      ? {
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }
      : {}),
  };

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        onSubmit?.(values);
      })}
    >
      <div className="rounded-xl p-4 text-white" style={headerStyle}>
        <div className="flex items-start justify-between gap-3">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "var(--pa-font-display)" }}
          >
            {isEdit ? "Rediger Okt" : "Ny Okt"}
          </h2>
          {isEdit && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete workout"
              className="text-white hover:bg-white/20 hover:text-white"
              onClick={() => setConfirmDelete((value) => !value)}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>

        <div
          style={{
            background: `var(${meta.colorContainerToken})`,
            borderLeft: `3px solid var(${meta.colorToken})`,
          }}
          className="mt-3 rounded-lg px-2 py-1.5"
        >
          <span
            style={{
              color: `var(${meta.colorToken})`,
              fontWeight: 700,
              fontSize: "var(--pa-text-label-md)",
            }}
          >
            {meta.icon} {meta.label}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout_type">Type</Label>
        <select
          id="workout_type"
          aria-label="Type"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          {...register("workout_type")}
        >
          {Object.entries(WORKOUT_TYPES).map(([key, typeMeta]) => (
            <option key={key} value={key}>
              {typeMeta.icon} {typeMeta.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout_date">Date</Label>
        <Input id="workout_date" type="date" aria-label="Date" {...register("workout_date")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="distance_km">Distance</Label>
        <Input
          id="distance_km"
          type="number"
          step="0.1"
          placeholder="km"
          aria-label="Distance"
          {...register("distance_km")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="duration_min">Duration</Label>
        <Input
          id="duration_min"
          type="number"
          step="1"
          placeholder="min"
          aria-label="Duration"
          {...register("duration_min")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={2}
          placeholder="Beskrivelse..."
          aria-label="Description"
          {...register("description")}
        />
      </div>

      {isEdit ? (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            {...register("completed")}
          />
          <span
            className="flex items-center justify-center w-5 h-5 rounded border border-input peer-checked:bg-[var(--pa-primary)] peer-checked:border-[var(--pa-primary)] transition-colors"
          >
            {watch("completed") ? <Check size={14} className="text-white" /> : null}
          </span>
          <span className="text-sm">Fullfort</span>
        </label>
      ) : null}

      {confirmDelete && isEdit && onDelete && entry?.id ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm font-medium">Slett denne okten?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="destructive" onClick={() => onDelete(entry.id)}>
              Bekreft
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Avbryt
            </Button>
          </div>
        </div>
      ) : null}

      {(errors.workout_type ||
        errors.workout_date ||
        errors.distance_km ||
        errors.duration_min ||
        errors.description) && (
        <p className="text-sm text-destructive">Kontroller feltene og prøv igjen.</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit">Lagre</Button>
      </div>
    </form>
  );
}
