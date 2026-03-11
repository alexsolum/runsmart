# Architecture Research

## Existing Architecture
- **Auth:** Supabase Auth + Strava OAuth (via `strava-auth` function).
- **Data:** `activities` table stores raw Strava data + computed metrics.
- **Sync:** `strava-sync` function (manual trigger) fetches recent activities.
- **AI:** `gemini-coach` function generates insights.

## Architectural Changes

### 1. Webhook Ingestion Pipeline
- **New Edge Function:** `strava-webhook` (Public endpoint).
  - **GET:** Returns `hub.challenge`.
  - **POST:** Verifies `owner_id`, logs event to `webhook_events` table (new table), returns 200 OK.
- **Processing:**
  - **Option 1 (Client-driven):** `useStrava` hook subscribes to `webhook_events` INSERT. When triggered, client calls `syncActivity(id)` (new method) or refetches all.
    - *Pros:* Simple, reuses existing client auth/context.
    - *Cons:* Requires client to be online/active to process the hook. If user isn't on the app, data doesn't update until they open it.
  - **Option 2 (Server-driven):** Database Trigger on `webhook_events` calls `strava-sync` (or `fetch-activity`) Edge Function via `pg_net` or similar.
    - *Pros:* Updates happen in background.
    - *Cons:* More complex setup (pg_net, internal API keys).
  - **Decision:** Start with **Option 1 (Client-driven)** for v1.1 simplicity, or **Hybrid**: Webhook function attempts to fetch and upsert activity immediately *if* it can do so within 2s (risky), or spawns a background task (Deno `EdgeRuntime.waitUntil`).
  - **Refined Decision:** Use `EdgeRuntime.waitUntil` in `strava-webhook` to fetch and upsert the activity *after* returning 200 OK. This keeps it server-side and robust.

### 2. Analytics Computation
- **Location:** Client-side (`src/domain/compute.js`).
- **Logic:**
  - `computeEfficiencyTrend(activities)`: Filters for "Run" + "Easy", sorts by date.
  - Calculates Linear Regression (Slope/Intercept).
  - Returns series for Recharts.
- **Performance:** Low impact for < 1000 activities.

### 3. Insight Synthesis Hardening
- **Location:** `supabase/functions/gemini-coach/index.ts`.
- **Logic:**
  - **Prompt:** Enforce "Return ONLY Markdown. Do not use JSON. Do not use code blocks."
  - **Sanitization:** Regex strip `^```json` and ````$` before parsing.
  - **Fallback:** If parsing/validation fails, return a safe, pre-canned "Data received, analysis pending..." message or a simple stat-based summary generated in the Edge Function (deterministic).

## Data Model Changes
- **New Table:** `webhook_events` (audit log).
  - Columns: `id`, `owner_id`, `object_id`, `object_type`, `aspect_type`, `event_time`, `processed_at`.
- **Modified Table:** `strava_connections` (add `subscription_id` maybe, but not strictly needed if we use one global subscription).

## Integration Points
- `strava-webhook` -> `activities` table (Upsert).
- `InsightsPage` -> `computeEfficiencyTrend` -> `Recharts`.
- `InsightsPage` -> `gemini-coach` (Synthesis).
