import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function ChangeCard({ patch, patchSummary, onAccept, onDismiss }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async () => {
    setApplying(true);
    setError(null);
    try {
      await onAccept(patch);
      setApplied(true);
    } catch (err) {
      setError(err.message || "Failed to apply changes");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-2" data-testid="change-card">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-600 font-bold text-sm" aria-hidden="true">&#9998;</span>
        <h4 className="text-sm font-bold text-amber-900 m-0">Suggested Plan Change</h4>
      </div>
      {patchSummary && (
        <p className="text-sm text-amber-800 mb-3 m-0">{patchSummary}</p>
      )}
      <ul className="list-none m-0 p-0 space-y-1 mb-3">
        {patch.map((entry, idx) => (
          <li key={idx} className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
            <span className="font-semibold">Week {entry.week}, {entry.dayDate}:</span>{" "}
            {Object.entries(entry.fields ?? {}).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-xs text-red-600 mb-2 m-0">{error}</p>
      )}
      {applied ? (
        <p className="text-sm text-green-700 font-semibold m-0" data-testid="change-card-applied">
          Changes applied — visible in plan viewer
        </p>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleAccept}
            disabled={applying}
            data-testid="change-card-apply"
          >
            {applying ? "Applying..." : "Apply Changes"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            disabled={applying}
            data-testid="change-card-dismiss"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
