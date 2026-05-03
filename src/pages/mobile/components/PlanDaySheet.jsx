import React, { useMemo, useState } from "react";
import { normalizeType, typeMeta, TYPE_OPTIONS } from "../lib/typeColors";

const DAY_NAMES = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function initialFields(workout) {
  const type = normalizeType(workout?.type, workout);
  return {
    sport: workout?.sport ?? "Run",
    type,
    name: workout?.name ?? "",
    distanceKm: workout?.distanceKm ?? "",
    durationMinutes: workout?.durationMinutes ?? "",
    primaryZone: workout?.primaryZone ?? "",
    description: workout?.description ?? workout?.humanReadable ?? "",
  };
}

function parseFields(fields) {
  return {
    sport: fields.sport || "Run",
    type: fields.type,
    name: fields.name.trim() || TYPE_OPTIONS.find((option) => option.key === fields.type)?.label || "Økt",
    distanceKm: fields.distanceKm === "" ? null : Number(fields.distanceKm),
    durationMinutes: fields.durationMinutes === "" ? null : Number(fields.durationMinutes),
    primaryZone: fields.primaryZone.trim() || null,
    description: fields.description.trim(),
  };
}

export default function PlanDaySheet({
  day,
  weekNumber,
  workout,
  isAdd = false,
  days = [],
  onClose,
  onSave,
  onDelete,
}) {
  const [editing, setEditing] = useState(isAdd || !workout);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedDate, setSelectedDate] = useState(day?.date ?? days[0]?.date ?? "");
  const [fields, setFields] = useState(() => initialFields(workout));
  const meta = typeMeta(fields.type, fields);
  const dayLabel = useMemo(() => {
    const selectedIndex = days.findIndex((candidate) => candidate?.date === selectedDate);
    if (selectedIndex >= 0) return DAY_NAMES[selectedIndex] ?? days[selectedIndex]?.dayOfWeek;
    return day?.dayOfWeek ?? selectedDate;
  }, [day?.dayOfWeek, days, selectedDate]);

  function updateField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    await onSave?.({ fields: parseFields(fields), dayDate: selectedDate || day?.date });
    onClose?.();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete?.();
    onClose?.();
  }

  return (
    <div className="rs-m-sheet-scrim" role="dialog" aria-modal="true" aria-labelledby="rs-m-plan-sheet-title">
      <form className="rs-m-sheet" onSubmit={handleSave}>
        <div className="rs-m-sheet-header">
          <div>
            <h2 id="rs-m-plan-sheet-title" className="rs-m-card-title" style={{ color: "var(--rs-m-text)" }}>
              {isAdd ? "Legg til økt" : editing ? "Rediger økt" : "Øktdetaljer"}
            </h2>
            <div className="rs-m-card-sub" style={{ color: "var(--rs-m-text-muted)" }}>
              Uke {weekNumber} · {dayLabel}
            </div>
          </div>
          <button type="button" className="rs-m-sheet-close" aria-label="Lukk" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rs-m-sheet-body">
          {editing && days.length > 0 ? (
            <div>
              <div className="rs-m-field-label">Dag</div>
              <div className="rs-m-day-chips">
                {days.map((candidate, index) => (
                  <button
                    key={candidate?.date ?? index}
                    type="button"
                    className={`rs-m-day-chip ${candidate?.date === selectedDate ? "is-selected" : ""}`}
                    onClick={() => setSelectedDate(candidate?.date)}
                  >
                    {DAY_NAMES[index] ?? candidate?.dayOfWeek}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {editing ? (
            <>
              <div>
                <div className="rs-m-field-label">Type</div>
                <div className="rs-m-type-chips">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      className="rs-m-type-chip"
                      style={{
                        borderColor: fields.type === option.key ? option.border : undefined,
                        background: fields.type === option.key ? option.bg : undefined,
                        color: fields.type === option.key ? option.color : undefined,
                      }}
                      onClick={() => updateField("type", option.key)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label>
                <div className="rs-m-field-label">Navn</div>
                <input className="rs-m-input" value={fields.name} onChange={(event) => updateField("name", event.target.value)} />
              </label>

              <label>
                <div className="rs-m-field-label">Distanse (km)</div>
                <input className="rs-m-input is-num" type="number" min="0" step="0.1" value={fields.distanceKm} onChange={(event) => updateField("distanceKm", event.target.value)} />
              </label>

              <label>
                <div className="rs-m-field-label">Varighet (min)</div>
                <input className="rs-m-input is-num" type="number" min="0" step="1" value={fields.durationMinutes} onChange={(event) => updateField("durationMinutes", event.target.value)} />
              </label>

              <label>
                <div className="rs-m-field-label">Innsats / sone</div>
                <input className="rs-m-input" value={fields.primaryZone} onChange={(event) => updateField("primaryZone", event.target.value)} placeholder="Z2, terskel, lett..." />
              </label>

              <label>
                <div className="rs-m-field-label">Notater</div>
                <textarea className="rs-m-textarea" rows={4} value={fields.description} onChange={(event) => updateField("description", event.target.value)} />
              </label>

              <div className="rs-m-today-actions">
                <button type="submit" className="rs-m-btn-primary">
                  Lagre
                </button>
                <button type="button" className="rs-m-btn-ghost" onClick={onClose}>
                  Avbryt
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rs-m-today-card" style={{ margin: 0 }}>
                <div className="rs-m-today-bar" style={{ background: meta.color }} />
                <div className="rs-m-today-inner">
                  <span className="rs-m-today-badge" style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                  <div className="rs-m-today-name">{workout?.name || "Planlagt økt"}</div>
                  <div className="rs-m-today-stats">
                    <div className="rs-m-today-stat">
                      <div className="rs-m-today-stat-val">{workout?.distanceKm ?? "–"}</div>
                      <div className="rs-m-today-stat-lbl">km</div>
                    </div>
                    <div className="rs-m-today-stat">
                      <div className="rs-m-today-stat-val">{workout?.durationMinutes ?? "–"}</div>
                      <div className="rs-m-today-stat-lbl">min</div>
                    </div>
                    <div className="rs-m-today-stat">
                      <div className="rs-m-today-stat-val">{workout?.primaryZone ?? "–"}</div>
                      <div className="rs-m-today-stat-lbl">sone</div>
                    </div>
                  </div>
                  <div className="rs-m-today-note">{workout?.description || workout?.humanReadable || "Ingen trener-notater for denne økten."}</div>
                </div>
              </div>

              <div className="rs-m-today-actions">
                <button type="button" className="rs-m-btn-primary" onClick={() => setEditing(true)}>
                  Rediger økt
                </button>
                <button type="button" className="rs-m-btn-ghost" onClick={handleDelete}>
                  {confirmDelete ? "Bekreft sletting" : "Slett"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
