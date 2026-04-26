import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

const PRIORITY_OPTIONS = [
  { value: "A", label: "A — Målløp" },
  { value: "B", label: "B — Oppvarming / test" },
  { value: "C", label: "C — Treningsløp" },
];

/**
 * Dialog for adding a race from the user's race catalog into a season plan.
 *
 * Two-step flow:
 *  1. Pick a race from the searchable list (or jump to "+ Opprett nytt løp" via onCreateRaceRequest)
 *  2. Configure priority / target_date / notes
 */
export default function AddRaceToSeasonDialog({
  open,
  onClose,
  onSubmit,
  onCreateRaceRequest,
  availableRaces = [],
  defaultYear,
}) {
  const [selectedRace, setSelectedRace] = useState(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("B");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedRace(null);
      setSearch("");
      setPriority("B");
      setTargetDate("");
      setNotes("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableRaces;
    return availableRaces.filter((r) =>
      [r.name, r.location].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [availableRaces, search]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedRace) return;
    onSubmit({
      race_id: selectedRace.id,
      priority,
      target_date: targetDate || null,
      notes: notes.trim() || null,
    });
  }

  function preselectTargetDate(race) {
    // If the race has a next_race_date in the user's chosen season year, use it.
    if (race?.next_race_date) {
      const yr = new Date(race.next_race_date).getUTCFullYear();
      if (!defaultYear || yr === defaultYear) {
        setTargetDate(race.next_race_date);
        return;
      }
    }
    // Otherwise estimate from typical_month + typical_week_in_month + defaultYear.
    if (defaultYear && race?.typical_month) {
      const month = race.typical_month;
      const wk = race.typical_week_in_month;
      let day;
      if (!wk || wk === 1) day = 5;
      else if (wk === 2) day = 12;
      else if (wk === 3) day = 19;
      else if (wk === 4) day = 26;
      else day = 28; // "last week"
      const iso = `${defaultYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setTargetDate(iso);
      return;
    }
    setTargetDate("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedRace ? "Legg til i sesongen" : "Velg løp"}</DialogTitle>
        </DialogHeader>

        {!selectedRace ? (
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Søk i løpsbiblioteket…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="border rounded-md max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">Ingen løp matcher søket.</p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((race) => (
                    <li
                      key={race.id}
                      className="p-3 cursor-pointer hover:bg-muted/40"
                      onClick={() => {
                        setSelectedRace(race);
                        preselectTargetDate(race);
                      }}
                    >
                      <div className="font-semibold text-sm">{race.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[race.location, race.distance_km ? `${race.distance_km} km` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={onCreateRaceRequest}>
                + Opprett nytt løp
              </Button>
              <Button type="button" variant="ghost" onClick={onClose}>Avbryt</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="font-semibold text-sm">{selectedRace.name}</div>
              <div className="text-xs text-muted-foreground">
                {[selectedRace.location, selectedRace.distance_km ? `${selectedRace.distance_km} km` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <button
                type="button"
                onClick={() => setSelectedRace(null)}
                className="text-xs underline mt-1"
              >
                Endre løp
              </button>
            </div>
            <div>
              <Label htmlFor="sp-priority">Prioritet</Label>
              <select
                id="sp-priority"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sp-target-date">Måldato</Label>
              <Input
                id="sp-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Forhåndsutfylt fra typisk dato hvis kjent. Kan endres.
              </p>
            </div>
            <div>
              <Label htmlFor="sp-notes">Notater</Label>
              <Textarea
                id="sp-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Taktikk, mål, ev. spesielle hensyn"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Avbryt</Button>
              <Button type="submit">Legg til</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
