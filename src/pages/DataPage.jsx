import React from "react";
import { useAppData } from "../context/AppDataContext";

function formatLastSync(dateString) {
  if (!dateString) return "Never";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return parsed.toLocaleString();
}

export default function DataPage() {
  const { auth, strava } = useAppData();

  const onConnect = () => {
    try {
      strava.startConnect();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.message);
    }
  };

  const onSync = async () => {
    try {
      await strava.sync();
    } catch (_error) {
      // handled via status message
    }
  };

  const onDisconnect = async () => {
    if (!window.confirm("Disconnect Strava? Your synced activities will remain.")) return;
    try {
      await strava.disconnect();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.message);
    }
  };

  return (
    <section className="page">
      <div className="mb-5">
        <h2 className="m-0 mb-1 text-2xl font-bold text-slate-900">Reliable data ingestion</h2>
        <p className="m-0 text-sm text-slate-500">Sync Strava automatically, log workouts manually, and normalize everything for analytics.</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="m-0 mb-3 text-sm font-bold text-slate-900">Connected sources</h4>
          <ul className="m-0 pl-5 text-sm text-slate-700 flex flex-col gap-1">
            <li>Strava activity sync</li>
            <li>Manual run + cross-training entry</li>
            <li>Heart-rate &amp; elevation support</li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h4 className="m-0 mb-3 text-sm font-bold text-slate-900">Privacy-first storage</h4>
          <p className="m-0 mb-3 text-sm text-slate-600">Supabase-backed, athlete-owned data with row-level security.</p>
          <button className="ghost" type="button">Review data policy</button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5" id="strava-panel">
          <h4 className="m-0 mb-3 text-sm font-bold text-slate-900">Strava</h4>

          {!strava.connected ? (
            <div id="strava-disconnected">
              <p className="m-0 mb-3 text-sm text-slate-500">Connect your Strava account to import training data.</p>
              <button
                className="cta"
                id="strava-connect-btn"
                type="button"
                onClick={onConnect}
                disabled={!auth.user || strava.loading}
                title={!auth.user ? "Sign in first" : ""}
              >
                Connect Strava
              </button>
            </div>
          ) : (
            <div id="strava-connected">
              <div className="grid gap-2 mb-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status</span>
                  <strong className="text-green-600">Connected</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Last sync</span>
                  <strong id="last-sync-time">{formatLastSync(strava.lastSyncAt)}</strong>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="cta"
                  id="strava-sync-btn"
                  type="button"
                  onClick={onSync}
                  disabled={strava.loading}
                >
                  {strava.loading ? "Syncing…" : "Sync now"}
                </button>
                <button
                  className="ghost"
                  id="strava-disconnect-btn"
                  type="button"
                  onClick={onDisconnect}
                  disabled={strava.loading}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {strava.statusMessage && (
            <p
              id="strava-sync-feedback"
              className={`mt-3 text-sm ${strava.error ? "text-red-600" : "text-slate-500"}`}
              role="status"
              aria-live="polite"
            >
              {strava.statusMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
