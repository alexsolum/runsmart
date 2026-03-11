# Stack Research

## Existing Stack
- **Frontend:** React + Vite
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Charts:** Recharts
- **AI:** Google Gemini (via Edge Function)

## New Capabilities & Stack Additions

### 1. Robust Strava Integration (Webhooks)
- **Component:** New Supabase Edge Function `strava-webhook`
- **Trigger:** External HTTP POST from Strava (requires public endpoint)
- **Security:**
  - Verify `hub.verify_token` for subscription setup (GET)
  - Validate `owner_id` against database for events (POST)
  - **Constraint:** Must respond 200 OK within 2 seconds. Heavy processing (fetching activity details) must be asynchronous.
- **Async Pattern:**
  - **Option A (Simpler):** Just upsert the event into a `webhook_events` table and return 200. Use a separate scheduled function or Database Webhook (pg_net) to process the queue.
  - **Option B (Direct):** Fire-and-forget background promise in Deno (risky if runtime kills it).
  - **Recommendation:** Store event in DB `webhook_events`. Use Supabase Realtime (already in use) or a Database Trigger to fetch the new activity data.

### 2. Advanced Progress Analytics
- **Library:** Recharts (Existing)
- **Implementation:** `ComposedChart` combining `Scatter` (individual runs) and `Line` (trend).
- **Computation:** Client-side linear regression (Least Squares) in `src/domain/compute.js`.
  - Input: Array of `{ date, x: metric, y: heartRate }`
  - Output: Trend line coordinates `[{ x: min, y: start }, { x: max, y: end }]`
- **Data Source:** `activities` table. Needs rigorous filtering (e.g., "Easy Runs" only, excluding outliers).

### 3. Insight Synthesis Fixes
- **Stack:** No new libraries.
- **Pattern:** Strict Prompt Engineering + Output Sanitization (Regex).
- **Format:** Pure Markdown with enforced H4 headers. No JSON wrappers.

## Dependencies
- `recharts`: Already installed.
- `supabase-js`: Already installed.
- `Deno` standard library (for Edge Functions): Available in runtime.

## What NOT to add
- Do not add complex server-side queuing systems (Redis/Bull) â€” overkill. Use Postgres tables as queues if needed.
- Do not add a statistics library (Simple Statistics or regression-js) unless manual math proves insufficient. Least squares is ~10 lines of code.
