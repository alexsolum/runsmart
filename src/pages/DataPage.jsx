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
    <section id="data" className="page">
      <div className="page-header">
        <h2>Reliable data ingestion</h2>
        <p>Sync Strava automatically, log workouts manually, and normalize everything for analytics.</p>
      </div>

      <div className="data-panel">
        <div>
          <h4>Connected sources</h4>
          <ul>
            <li>Strava activity sync</li>
            <li>Manual run + cross-training entry</li>
            <li>Heart-rate &amp; elevation support</li>
          </ul>
        </div>

        <div>
          <h4>Privacy-first storage</h4>
          <p>Supabase-backed, athlete-owned data with row-level security.</p>
          <button className="ghost" type="button">Review data policy</button>
        </div>

        <div id="strava-panel">
          <h4>Strava</h4>

          {!strava.connected ? (
            <div id="strava-disconnected">
              <p className="muted">Connect your Strava account to import training data.</p>
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
              <div className="sync-list">
                <div>
                  <span className="label">Status</span>
                  <strong className="positive">Connected</strong>
                </div>
                <div>
                  <span className="label">Last sync</span>
                  <strong id="last-sync-time">{formatLastSync(strava.lastSyncAt)}</strong>
                </div>
              </div>
              <div className="strava-actions">
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
              className="manual-note"
              role="status"
              aria-live="polite"
              style={{ marginTop: "0.75rem", color: strava.error ? "#dc2626" : "var(--muted)" }}
            >
              {strava.statusMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
