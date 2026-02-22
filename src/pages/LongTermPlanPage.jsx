import React, { useCallback, useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";

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

function PhaseSummaryBar({ blocks }) {
  if (!blocks.length) return null;
  const earliest = new Date(blocks[0].start_date);
  const latest = new Date(blocks[blocks.length - 1].end_date);
  const totalDays = (latest - earliest) / (1000 * 60 * 60 * 24) || 1;

  return (
    <div className="ltp-phase-bar" aria-label="Training phase timeline">
      {blocks.map((block) => {
        const spanDays =
          (new Date(block.end_date) - new Date(block.start_date)) / (1000 * 60 * 60 * 24) || 1;
        const flex = spanDays / totalDays;
        return (
          <div
            key={block.id}
            className={`ltp-phase-seg is-${block.phase}`}
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
    <form className="ltp-block-form" onSubmit={handleSubmit} noValidate>
      <h4 style={{ margin: "0 0 12px" }}>{initial?.id ? "Edit block" : "Add training block"}</h4>

      <label>
        <span>Phase</span>
        <select value={form.phase} onChange={(e) => set("phase", e.target.value)} required>
          {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </label>

      <label>
        <span>Label (optional, e.g. "Base 1")</span>
        <input
          type="text"
          placeholder="Leave blank to use phase name"
          value={form.label}
          onChange={(e) => set("label", e.target.value)}
        />
      </label>

      <div className="ltp-form-row">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            required
          />
        </label>
        <label>
          <span>End date</span>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            min={form.start_date}
            required
          />
        </label>
      </div>

      <label>
        <span>Weekly target (km, optional)</span>
        <input
          type="number"
          min="0"
          max="500"
          step="0.5"
          placeholder="e.g. 60"
          value={form.target_km}
          onChange={(e) => set("target_km", e.target.value)}
        />
      </label>

      <label>
        <span>Notes (optional)</span>
        <textarea
          rows={2}
          placeholder="e.g. Focus on aerobic base, keep HR in zone 2"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>

      <div className="ltp-panel-actions">
        <button type="submit" className="cta" disabled={loading || !form.start_date || !form.end_date}>
          {loading ? "Saving…" : initial?.id ? "Update block" : "Add block"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
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
    <form className="ltp-block-form" onSubmit={handleSubmit} noValidate>
      <h4 style={{ margin: "0 0 12px" }}>New training plan</h4>

      <label>
        <span>Goal race</span>
        <input
          type="text"
          placeholder="e.g. Stockholm Marathon"
          value={form.race}
          onChange={(e) => set("race", e.target.value)}
          required
        />
      </label>

      <label>
        <span>Race date</span>
        <input
          type="date"
          value={form.race_date}
          onChange={(e) => set("race_date", e.target.value)}
          min={todayIso()}
          required
        />
      </label>

      <div className="ltp-form-row">
        <label>
          <span>Days/week available</span>
          <select value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          <span>Current weekly km</span>
          <input
            type="number"
            min="0"
            max="300"
            placeholder="e.g. 50"
            value={form.current_mileage}
            onChange={(e) => set("current_mileage", e.target.value)}
          />
        </label>
      </div>

      <label>
        <span>Constraints / injuries (optional)</span>
        <textarea
          rows={2}
          placeholder="e.g. Knee niggle, avoid hills for now"
          value={form.constraints}
          onChange={(e) => set("constraints", e.target.value)}
        />
      </label>

      <label className="ltp-checkbox-label">
        <input
          type="checkbox"
          checked={form.b2b_long_runs}
          onChange={(e) => set("b2b_long_runs", e.target.checked)}
        />
        <span>Back-to-back long runs</span>
      </label>

      <div className="ltp-panel-actions">
        <button type="submit" className="cta" disabled={loading || !form.race || !form.race_date}>
          {loading ? "Creating…" : "Create plan"}
        </button>
        <button type="button" className="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
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

  const daysToRace = selectedPlan
    ? Math.max(0, Math.round((new Date(selectedPlan.race_date) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <section className="page ltp-page">
      <div className="page-header">
        <h2>Training Plan</h2>
        <p>Build your macro plan — phases and training blocks towards your goal race.</p>
      </div>

      <div className="ltp-grid">
        {/* ── Left panel ── */}
        <div className="ltp-panel">
          {/* Plan selector */}
          <div>
            <h3>Your plan</h3>
            {plans.plans.length > 0 ? (
              <select
                value={selectedPlanId ?? ""}
                onChange={(e) => { setSelectedPlanId(e.target.value); setEditingBlock(null); }}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                {plans.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.race} · {new Date(p.race_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </option>
                ))}
              </select>
            ) : (
              <p className="muted" style={{ fontSize: "13px" }}>No plans yet.</p>
            )}
            <button
              type="button"
              className="ghost"
              style={{ fontSize: "13px", padding: "6px 12px" }}
              onClick={() => { setShowCreatePlan((v) => !v); setEditingBlock(null); }}
            >
              {showCreatePlan ? "Cancel" : "+ New plan"}
            </button>
          </div>

          {/* Plan details */}
          {selectedPlan && !showCreatePlan && (
            <div className="ltp-plan-meta">
              <p><strong>{selectedPlan.race}</strong></p>
              <p className="muted" style={{ fontSize: "13px" }}>
                {new Date(selectedPlan.race_date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                {daysToRace !== null && ` · ${daysToRace} days away`}
              </p>
              {selectedPlan.current_mileage && (
                <p style={{ fontSize: "13px" }}>Base volume: {selectedPlan.current_mileage} km/week</p>
              )}
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
            <button
              type="button"
              className="cta"
              style={{ fontSize: "13px", padding: "8px 14px" }}
              onClick={() => setEditingBlock({})}
            >
              + Add training block
            </button>
          )}

          {formError && (
            <p className="feedback is-error">{formError}</p>
          )}
        </div>

        {/* ── Right panel — timeline ── */}
        <div className="ltp-timeline">
          <h3>Training phases</h3>

          {!selectedPlanId && (
            <p className="empty-state">Select or create a training plan to start building phases.</p>
          )}

          {selectedPlanId && trainingBlocks.loading && (
            <p className="muted" style={{ fontSize: "13px" }}>Loading blocks…</p>
          )}

          {selectedPlanId && !trainingBlocks.loading && trainingBlocks.blocks.length === 0 && (
            <p className="empty-state">
              No training phases yet. Add your first block using the panel on the left.
            </p>
          )}

          {trainingBlocks.blocks.length > 0 && (
            <>
              <PhaseSummaryBar blocks={trainingBlocks.blocks} />
              <div className="ltp-block-list">
                {trainingBlocks.blocks.map((block) => (
                  <div key={block.id} className="ltp-block-card">
                    <div className="ltp-block-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className={`ltp-phase-badge is-${block.phase}`}>{block.phase}</span>
                        {block.label && <strong style={{ fontSize: "14px" }}>{block.label}</strong>}
                      </div>
                      <div className="ltp-block-card-actions">
                        <button
                          type="button"
                          className="ghost"
                          style={{ fontSize: "12px", padding: "4px 10px" }}
                          onClick={() => { setEditingBlock(block); setShowCreatePlan(false); }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          style={{ fontSize: "12px", padding: "4px 10px", color: "var(--color-danger)" }}
                          onClick={() => handleDeleteBlock(block)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p>{formatDateRange(block.start_date, block.end_date)}</p>
                    {block.target_km && (
                      <p>Target: {block.target_km} km/week</p>
                    )}
                    {block.notes && (
                      <p style={{ fontStyle: "italic", color: "var(--color-text-muted)" }}>{block.notes}</p>
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
