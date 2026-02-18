import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "runsmart.dailyLogs";

const FORM_OPTIONS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "flat", label: "Flat" },
  { value: "fatigued", label: "Fatigued" },
];

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DailyLogPage() {
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    date: todayIsoDate(),
    form: "good",
    workout: "",
    reflection: "",
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setLogs(parsed);
      }
    } catch (error) {
      console.error("Unable to load saved daily logs", error);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  const canSave = useMemo(
    () => formData.workout.trim().length > 0 && formData.reflection.trim().length > 0,
    [formData.reflection, formData.workout],
  );

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!canSave) return;

    const entry = {
      id: `${Date.now()}`,
      date: formData.date,
      form: formData.form,
      workout: formData.workout.trim(),
      reflection: formData.reflection.trim(),
      createdAt: new Date().toISOString(),
    };

    setLogs((prev) => [entry, ...prev].slice(0, 14));
    setFormData((prev) => ({
      ...prev,
      date: todayIsoDate(),
      workout: "",
      reflection: "",
    }));
    setMessage("Daily log saved.");
  };

  return (
    <section className="page daily-log-page" id="daily-log">
      <div className="page-header">
        <h2>Daily log</h2>
        <p>Comment on your current form and capture how today&apos;s workout went.</p>
      </div>

      <div className="daily-log-grid">
        <form className="daily-log-form" onSubmit={onSubmit}>
          <h3>Add today&apos;s reflection</h3>

          <label>
            <span>Date</span>
            <input type="date" name="date" value={formData.date} onChange={onChange} required />
          </label>

          <label>
            <span>Current form</span>
            <select name="form" value={formData.form} onChange={onChange}>
              {FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Workout completed</span>
            <input
              type="text"
              name="workout"
              value={formData.workout}
              onChange={onChange}
              placeholder="e.g. 10km easy + 6x20s strides"
              required
            />
          </label>

          <label>
            <span>How did it go?</span>
            <textarea
              name="reflection"
              value={formData.reflection}
              onChange={onChange}
              rows="4"
              placeholder="Felt smooth on flats, slight tightness in the last 2km."
              required
            />
          </label>

          <button type="submit" className="cta" disabled={!canSave}>
            Save daily log
          </button>
          <p className="form-note" role="status">
            {message}
          </p>
        </form>

        <section className="daily-log-history" aria-label="Recent daily logs">
          <h3>Recent entries</h3>
          {logs.length === 0 && <p className="muted">No entries yet. Add your first daily reflection.</p>}

          <div className="daily-log-list">
            {logs.map((log) => (
              <article key={log.id} className="daily-log-item">
                <header>
                  <strong>{formatDate(log.date)}</strong>
                  <span className={`daily-log-pill is-${log.form}`}>{log.form}</span>
                </header>
                <p>
                  <strong>Workout:</strong> {log.workout}
                </p>
                <p>{log.reflection}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
