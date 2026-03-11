# Research Summary

## Stack Decisions
- **New Edge Function:** `strava-webhook` handling GET/POST from Strava.
- **Async Processing:** Use `EdgeRuntime.waitUntil` to fetch/upsert activity data without blocking the 2s webhook response window.
- **Charts:** Recharts `ComposedChart` (Scatter + Line) for trend analysis.
- **Math:** Client-side Linear Regression (Least Squares) in `compute.js`.
- **AI Output:** Pure Markdown contract (no JSON wrappers), enforced via system prompt and client-side regex sanitization.

## Feature Scope
### 1. Robust Strava Integration
- **Webhooks:** Create, Update, Delete, Deauthorize events.
- **Unlimited Sync:** Pagination loop (`per_page=200`) until date limit or empty response.
- **Incremental Sync:** Use `after` parameter to fetch only new activities since last sync (saves API quota).

### 2. Advanced Progress Analytics
- **Metric:** Aerobic Efficiency (Speed / HR) or Pace vs HR trend.
- **Filters:** "Run" type, >10min duration, >0 Avg HR, Manual=False.
- **Visualization:** Scatter plot of individual runs with a regression trend line.

### 3. Insight Synthesis Fixes
- **Reliability:** Eliminate "not shown" errors by removing strict JSON dependency.
- **Format:** Prompt for Markdown headers (H4). Strip code blocks before rendering.
- **Fallback:** Deterministic local summary if AI fails.

## Key Risks & Mitigations
- **Rate Limits:** Strava 100 req/15 min. Use incremental sync aggressively.
- **Timeouts:** Webhook must respond < 2s. Move heavy lifting to `waitUntil` or background task.
- **Data Noise:** Bad HR data ruins trends. Filter out zeros and short runs.
- **AI Hallucinations:** Regex strip `^```(json|markdown)?` to prevent raw block rendering.
