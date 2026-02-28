import React, { useCallback, useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PHASES = ["Base", "Build", "Peak", "Taper", "Recovery"];

function weeksBetween(start, end) {
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24 * 7)));
}

function formatDateRange(start, end) {
  const fmt = (d) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const weeks = weeksBetween(start, end);
  return `${fmt(start)} — ${fmt(end)} (${weeks} wk${weeks !== 1 ? "s" : ""})`;
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

const BLANK_BLOCK = {
  phase: "Base",
  label: "",
  start_date: todayIso(),
  end_date: "",
  target_km: "",
  notes: "",
};

const BLANK_PLAN = {
  race: "",
  race_date: "",
  availability: 5,
  current_mileage: "",
  constraints: "",
  b2b_long_runs: false,
};

// Phase colors map
const PHASE_COLORS = {
  Base:     "bg-sky-500",
  Build:    "bg-blue-600",
  Peak:     "bg-violet-700",
  Taper:    "bg-amber-600",
  Recovery: "bg-green-600",
};

const PHASE_BADGE_COLORS = {
  Base:     "bg-sky-500 text-white",
  Build:    "bg-blue-600 text-white",
  Peak:     "bg-violet-700 text-white",
  Taper:    "bg-amber-600 text-white",
  Recovery: "bg-green-600 text-white",
};

function PhaseSummaryBar({ blocks }) {
  if (!blocks.length) return null;
  const earliest = new Date(blocks[0].start_date);
  const latest = new Date(blocks[blocks.length - 1].end_date);
  const totalDays = (latest - earliest) / (1000 * 60 * 60 * 24) || 1;

  return (
    <div className="ltp-phase-bar flex rounded-xl overflow-hidden min-h-[38px] mb-4 gap-0.5 bg-slate-100" aria-label="Training phase timeline">
      {blocks.map((block) => {
        const spanDays =
          (new Date(block.end_date) - new Date(block.start_date)) / (1000 * 60 * 60 * 24) || 1;
        const flex = spanDays / totalDays;
        const colorClass = PHASE_COLORS[block.phase] ?? "bg-slate-400";
        return (
          <div
            key={block.id}
            className={`flex items-center px-2.5 py-1.5 text-[11px] font-bold text-white min-w-0 overflow-hidden whitespace-nowrap ${colorClass}`}
            style={{ flex }}
            title={`${block.label || block.phase}: ${formatDateRange(block.start_date, block.end_date)}`}
          >
            {spanDays / totalDays > 0.12 ? (block.label || block.phase) : ""}
          </div>
        );
      })}
    </div>
  );
}

const selectClass = "w-full border border-input rounded-md px-2.5 py-2 font-inherit text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1";

function BlockForm({ initial, planId, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ ...BLANK_BLOCK, ...initial });
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      plan_id: planId,
      phase: form.phase,
      label: form.label || null,
      start_date: form.start_date,
      end_date: form.end_date,
      target_km: form.target_km !== "" ? Number(form.target_km) : null,
      notes: form.notes || null,
    });
  }

  return (
    <form className="ltp-block-form border-t border-slate-200 pt-3.5" onSubmit={handleSubmit} noValidate>
      <h4 className="m-0 mb-3 text-sm font-bold">{initial?.id ? "Edit block" : "Add training block"}</h4>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Phase</span>
        <select className={selectClass} value={form.phase} onChange={(e) => set("phase", e.target.value)} required>
          {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Label>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Label (optional, e.g. "Base 1")</span>
        <Input
          type="text"
          placeholder="Leave blank to use phase name"
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </Label>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <Label className="block">
          <span className="block text-xs text-slate-500 font-medium mb-1">Start date</span>
          <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
        </Label>
        <Label className="block">
          <span className="block text-xs text-slate-500 font-medium mb-1">End date</span>
          <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} min={form.start_date} required />
        </Label>
      </div>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Weekly target (km, optional)</span>
        <Input type="number" min="0" max="500" step="0.5" placeholder="e.g. 60" value={form.target_km} onChange={(e) => set("target_km", e.target.value)} />
      </Label>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Notes (optional)</span>
        <Textarea rows={2} placeholder="e.g. Focus on aerobic base, keep HR in zone 2" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </Label>

      <div className="flex gap-2 flex-wrap">
        <Button type="submit" size="sm" disabled={loading || !form.start_date || !form.end_date}>
          {loading ? "Saving…" : initial?.id ? "Update block" : "Add block"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CreatePlanForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({ ...BLANK_PLAN });
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      race: form.race,
      race_date: form.race_date,
      availability: Number(form.availability),
      current_mileage: form.current_mileage !== "" ? Number(form.current_mileage) : null,
      constraints: form.constraints || null,
      b2b_long_runs: form.b2b_long_runs,
    });
  }

  return (
    <form className="border-t border-slate-200 pt-3.5" onSubmit={handleSubmit} noValidate>
      <h4 className="m-0 mb-3 text-sm font-bold">New training plan</h4>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Goal race</span>
        <Input type="text" placeholder="e.g. Stockholm Marathon" value={form.race} onChange={(e) => set("race", e.target.value)} required />
      </Label>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Race date</span>
        <Input type="date" value={form.race_date} onChange={(e) => set("race_date", e.target.value)} min={todayIso()} required />
      </Label>

      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <Label className="block">
          <span className="block text-xs text-slate-500 font-medium mb-1">Days/week available</span>
          <select className={selectClass} value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Label>
        <Label className="block">
          <span className="block text-xs text-slate-500 font-medium mb-1">Current weekly km</span>
          <Input type="number" min="0" max="300" placeholder="e.g. 50" value={form.current_mileage} onChange={(e) => set("current_mileage", e.target.value)} />
        </Label>
      </div>

      <Label className="block mb-2.5">
        <span className="block text-xs text-slate-500 font-medium mb-1">Constraints / injuries (optional)</span>
        <Textarea rows={2} placeholder="e.g. Knee niggle, avoid hills for now" value={form.constraints} onChange={(e) => set("constraints", e.target.value)} />
      </Label>

      <Label className="flex items-center gap-2 mb-2.5 cursor-pointer">
        <input type="checkbox" checked={form.b2b_long_runs} onChange={(e) => set("b2b_long_runs", e.target.checked)} />
        <span className="text-sm">Back-to-back long runs</span>
      </Label>

      <div className="flex gap-2 flex-wrap">
        <Button type="submit" size="sm" disabled={loading || !form.race || !form.race_date}>
          {loading ? "Creating…" : "Create plan"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function LongTermPlanPage() {
  const { plans, trainingBlocks } = useAppData();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);   // null | {} (new) | block obj (edit)
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [formError, setFormError] = useState(null);
  const [goalDraft, setGoalDraft] = useState("");

  // Auto-select first plan
  useEffect(() => {
    if (!selectedPlanId && plans.plans.length > 0) {
      setSelectedPlanId(plans.plans[0].id);
    }
  }, [plans.plans, selectedPlanId]);

  // Load blocks when plan changes
  useEffect(() => {
    if (selectedPlanId) {
      trainingBlocks.loadBlocks(selectedPlanId).catch(() => {});
    }
  }, [selectedPlanId, trainingBlocks.loadBlocks]);

  // Sync goal draft when selected plan changes
  useEffect(() => {
    const plan = plans.plans.find((p) => p.id === selectedPlanId);
    setGoalDraft(plan?.goal ?? "");
  }, [selectedPlanId, plans.plans]);

  const selectedPlan = plans.plans.find((p) => p.id === selectedPlanId) ?? null;

  const handleCreatePlan = useCallback(
    async (planData) => {
      setFormError(null);
      try {
        const newPlan = await plans.createPlan(planData);
        setSelectedPlanId(newPlan.id);
        setShowCreatePlan(false);
      } catch (err) {
        setFormError(err.message);
      }
    },
    [plans],
  );

  const handleSaveBlock = useCallback(
    async (blockData) => {
      setFormError(null);
      try {
        if (editingBlock?.id) {
          await trainingBlocks.updateBlock(editingBlock.id, blockData);
        } else {
          await trainingBlocks.createBlock(blockData);
        }
        setEditingBlock(null);
      } catch (err) {
        setFormError(err.message);
      }
    },
    [editingBlock, trainingBlocks],
  );

  const handleDeleteBlock = useCallback(
    async (block) => {
      if (!window.confirm(`Delete "${block.label || block.phase}" block?`)) return;
      setFormError(null);
      try {
        await trainingBlocks.deleteBlock(block.id);
      } catch (err) {
        setFormError(err.message);
      }
    },
    [trainingBlocks],
  );

  const handleSaveGoal = useCallback(async () => {
    if (!selectedPlanId) return;
    try {
      await plans.updatePlan(selectedPlanId, { goal: goalDraft || null });
    } catch (err) {
      setFormError(err.message);
    }
  }, [selectedPlanId, goalDraft, plans]);

  const daysToRace = selectedPlan
    ? Math.max(0, Math.round((new Date(selectedPlan.race_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="page">
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">Training Plan</h2>
        <p className="m-0 text-sm text-slate-500">Build your macro plan — phases and training blocks towards your goal race.</p>
      </div>

      <div className="grid gap-6 grid-cols-[minmax(280px,380px)_minmax(0,1fr)] max-[960px]:grid-cols-1 items-start">
        {/* ── Left panel ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid gap-4">
          {/* Plan selector */}
          <div>
            <h3 className="m-0 mb-1 text-sm font-bold">Your plan</h3>
            {plans.plans.length > 0 ? (
              <select
                className={`${selectClass} mb-2.5`}
                value={selectedPlanId ?? ""}
                onChange={(e) => { setSelectedPlanId(e.target.value); setEditingBlock(null); }}
              >
                {plans.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.race} · {new Date(p.race_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[13px] text-slate-500 m-0 mb-2.5">No plans yet.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowCreatePlan((v) => !v); setEditingBlock(null); }}
            >
              {showCreatePlan ? "Cancel" : "+ New plan"}
            </Button>
          </div>

          {/* Plan details */}
          {selectedPlan && !showCreatePlan && (
            <div>
              <p className="my-0.5 font-bold text-sm">{selectedPlan.race}</p>
              <p className="my-0.5 text-[13px] text-slate-500">
                {new Date(selectedPlan.race_date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {daysToRace !== null && ` · ${daysToRace} days away`}
              </p>
              {selectedPlan.current_mileage && (
                <p className="my-0.5 text-[13px]">Base volume: {selectedPlan.current_mileage} km/week</p>
              )}
              <div className="mt-3">
                <Label className="block text-xs font-semibold text-slate-600 mb-1">
                  Goal for this plan
                </Label>
                <Textarea
                  rows={2}
                  className="text-[13px]"
                  placeholder="e.g. Finish my first 100K under 12 hours, stay healthy, enjoy the process"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  onBlur={handleSaveGoal}
                  disabled={plans.loading}
                />
                <p className="text-[11px] text-slate-400 mt-0.5 mb-0">
                  Sent to the AI coach. Saved automatically on blur.
                </p>
              </div>
            </div>
          )}

          {/* Create plan form */}
          {showCreatePlan && (
            <CreatePlanForm
              onSave={handleCreatePlan}
              onCancel={() => setShowCreatePlan(false)}
              loading={plans.loading}
            />
          )}

          {/* Add / edit block form */}
          {editingBlock !== null && !showCreatePlan && (
            <BlockForm
              initial={editingBlock}
              planId={selectedPlanId}
              onSave={handleSaveBlock}
              onCancel={() => setEditingBlock(null)}
              loading={trainingBlocks.loading}
            />
          )}

          {/* Add block button */}
          {editingBlock === null && !showCreatePlan && selectedPlanId && (
            <Button
              type="button"
              size="sm"
              onClick={() => setEditingBlock({})}
            >
              + Add training block
            </Button>
          )}

          {formError && (
            <p className="text-sm text-red-600 m-0">{formError}</p>
          )}
        </div>

        {/* ── Right panel — timeline ── */}
        <div className="ltp-timeline bg-white border border-slate-200 rounded-2xl p-4">
          <h3 className="m-0 mb-3.5 text-sm font-bold">Training phases</h3>

          {!selectedPlanId && (
            <p className="text-sm text-slate-400 text-center py-8">Select or create a training plan to start building phases.</p>
          )}

          {selectedPlanId && trainingBlocks.loading && (
            <p className="text-[13px] text-slate-500">Loading blocks…</p>
          )}

          {selectedPlanId && !trainingBlocks.loading && trainingBlocks.blocks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              No training phases yet. Add your first block using the panel on the left.
            </p>
          )}

          {trainingBlocks.blocks.length > 0 && (
            <>
              <PhaseSummaryBar blocks={trainingBlocks.blocks} />
              <div className="grid gap-2.5">
                {trainingBlocks.blocks.map((block) => (
                  <div key={block.id} className="border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50">
                    <div className="flex justify-between items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 uppercase tracking-wide ${PHASE_BADGE_COLORS[block.phase] ?? "bg-slate-400 text-white"}`}>
                          {block.phase}
                        </span>
                        {block.label && <strong className="text-sm">{block.label}</strong>}
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto text-xs px-2.5 py-1"
                          onClick={() => { setEditingBlock(block); setShowCreatePlan(false); }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto text-xs px-2.5 py-1 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteBlock(block)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="my-0.5 text-[13px] text-slate-500">{formatDateRange(block.start_date, block.end_date)}</p>
                    {block.target_km && (
                      <p className="my-0.5 text-[13px] text-slate-500">Target: {block.target_km} km/week</p>
                    )}
                    {block.notes && (
                      <p className="my-0.5 text-[13px] text-slate-500 italic">{block.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
