import React, { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import PageContainer from "../components/layout/PageContainer";

const EMPTY_DRAFT = {
  principles: "",
  dos: "",
  donts: "",
  workout_examples: "",
  phase_notes: "",
  koop_weight: 50,
  bakken_weight: 50,
};

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPhilosophyPage() {
  const { coachPhilosophy, auth } = useAppData();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [changelog, setChangelog] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (auth.user?.id) coachPhilosophy.load();
  }, [auth.user?.id, coachPhilosophy.load]);

  useEffect(() => {
    if (!coachPhilosophy.document) return;
    setDraft({
      principles: coachPhilosophy.document.principles ?? "",
      dos: coachPhilosophy.document.dos ?? "",
      donts: coachPhilosophy.document.donts ?? "",
      workout_examples: coachPhilosophy.document.workout_examples ?? "",
      phase_notes: coachPhilosophy.document.phase_notes ?? "",
      koop_weight: coachPhilosophy.document.koop_weight ?? 50,
      bakken_weight: coachPhilosophy.document.bakken_weight ?? 50,
    });
  }, [coachPhilosophy.document]);

  const hasRequiredSections = useMemo(() => {
    return Boolean(
      draft.principles.trim() &&
      draft.dos.trim() &&
      draft.donts.trim() &&
      draft.workout_examples.trim() &&
      draft.phase_notes.trim(),
    );
  }, [draft]);

  const onField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSaveDraft = async () => {
    setMessage("");
    setError("");
    try {
      await coachPhilosophy.saveDraft(draft);
      setMessage("Draft saved.");
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handlePublish = async () => {
    setMessage("");
    setError("");
    try {
      await coachPhilosophy.publish(changelog);
      setMessage("Published successfully.");
      setChangelog("");
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleRollback = async (versionId) => {
    setMessage("");
    setError("");
    try {
      await coachPhilosophy.rollback(versionId);
      setMessage("Rollback completed.");
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  const handleExport = async () => {
    setMessage("");
    setError("");
    try {
      const payload = await coachPhilosophy.exportPayload();
      if (!payload) throw new Error("No philosophy available to export.");
      downloadJson(`coach-philosophy-v${payload.version || "draft"}.json`, payload);
      setMessage("Export ready.");
    } catch (err) {
      setError(err.message || String(err));
    }
  };

  if (!coachPhilosophy.isAdmin) {
    return (
      <PageContainer id="admin-philosophy">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin</h2>
        <p className="text-sm text-slate-500">You are not authorized to edit coaching philosophy.</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer id="admin-philosophy">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Coaching Philosophy Admin</h2>
        <p className="text-sm text-slate-500">
          Maintain the template-enforced philosophy used by coaching logic.
        </p>
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-semibold">Current status:</span>{" "}
          {coachPhilosophy.document?.status === "published" ? "Published" : "Draft"}
          {" · "}
          <span className="font-semibold">Active version:</span> v{coachPhilosophy.document?.version ?? 0}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Principles (Required)</span>
          <textarea className="min-h-24 p-2 border border-slate-200 rounded-lg" value={draft.principles} onChange={(e) => onField("principles", e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Dos (Required)</span>
          <textarea className="min-h-20 p-2 border border-slate-200 rounded-lg" value={draft.dos} onChange={(e) => onField("dos", e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Donts (Required)</span>
          <textarea className="min-h-20 p-2 border border-slate-200 rounded-lg" value={draft.donts} onChange={(e) => onField("donts", e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Workout Examples (Required)</span>
          <textarea className="min-h-20 p-2 border border-slate-200 rounded-lg" value={draft.workout_examples} onChange={(e) => onField("workout_examples", e.target.value)} />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phase Notes (Required)</span>
          <textarea className="min-h-20 p-2 border border-slate-200 rounded-lg" value={draft.phase_notes} onChange={(e) => onField("phase_notes", e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Koop Weight</span>
            <input type="number" min="0" max="100" className="p-2 border border-slate-200 rounded-lg" value={draft.koop_weight} onChange={(e) => onField("koop_weight", Number(e.target.value))} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bakken Weight</span>
            <input type="number" min="0" max="100" className="p-2 border border-slate-200 rounded-lg" value={draft.bakken_weight} onChange={(e) => onField("bakken_weight", Number(e.target.value))} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white disabled:opacity-50"
            onClick={handleSaveDraft}
            disabled={!hasRequiredSections || coachPhilosophy.saving}
          >
            {coachPhilosophy.saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm bg-slate-200 text-slate-800"
            onClick={handleExport}
          >
            Export JSON
          </button>
        </div>
        {!hasRequiredSections && (
          <p className="text-xs text-amber-700">All required sections must be completed before saving.</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 grid gap-2">
        <h3 className="text-sm font-bold text-slate-800">Publish</h3>
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Changelog Note (Required)</span>
          <textarea className="min-h-16 p-2 border border-slate-200 rounded-lg" value={changelog} onChange={(e) => setChangelog(e.target.value)} />
        </label>
        <button
          type="button"
          className="w-fit px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white disabled:opacity-50"
          onClick={handlePublish}
          disabled={!hasRequiredSections || !changelog.trim() || coachPhilosophy.publishing}
        >
          {coachPhilosophy.publishing ? "Publishing..." : "Publish"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Version History</h3>
        {coachPhilosophy.versions.length === 0 ? (
          <p className="text-sm text-slate-500">No versions published yet.</p>
        ) : (
          <div className="grid gap-2">
            {coachPhilosophy.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2 border border-slate-100 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">v{v.version} - {v.source}</p>
                  <p className="text-xs text-slate-500">{v.changelog_note}</p>
                </div>
                <button
                  type="button"
                  className="px-2 py-1 rounded-md text-xs bg-slate-200 text-slate-700"
                  onClick={() => handleRollback(v.id)}
                >
                  Rollback
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </PageContainer>
  );
}
