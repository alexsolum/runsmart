import React, { useState } from "react";

export default function StravaSync({ strava }) {
  const [status, setStatus] = useState("idle");
  const syncing = status === "syncing" || strava?.isSyncingHistory || strava?.loading;
  const hasError = status === "error" || Boolean(strava?.error);

  async function handleSync() {
    if (!strava?.sync || syncing) return;
    setStatus("syncing");
    try {
      await strava.sync();
      setStatus("synced");
    } catch {
      setStatus("error");
    }
  }

  const label = syncing ? "Synker..." : hasError ? "Feil" : status === "synced" ? "Synket" : "Synk Strava";

  return (
    <button type="button" className="rs-m-btn-ghost" onClick={handleSync} disabled={syncing || !strava?.sync}>
      {label}
    </button>
  );
}
