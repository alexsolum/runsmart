# M001 Context: Strava Sync & Insight Trends

**Vision:** Enhance coaching insights with deeper trend analysis and robust, real-time Strava integration.

## Decisions

### 1. Strava Webhook Architecture
- **Real-time Truth:** Move from polling to webhooks for `create`, `update`, and `delete` events.
- **Immediate Ack:** The `strava-webhook` Edge Function must acknowledge Strava POST requests within 2 seconds.
- **Background Processing:** Use `EdgeRuntime.waitUntil` to process the activity data after acknowledging the event.

### 2. Insight Synthesis Sanitization
- **Server-Side Truth:** The `gemini-coach` Edge Function is 100% responsible for sanitizing the output. It must return a "ready-to-render" Markdown string.
- **Strict Plucking:** Use regex to extract required sections (`Mileage Trend`, `Intensity Distribution`, `Long-Run Progression`, `Race Readiness`) and discard AI "chatter."
- **Audit Logging:** Log malformed or failed AI responses to a new `ai_audit_logs` table for prompt engineering refinement.

### 3. Aerobic Efficiency Trends
- **Easy Run Filter:** Duration >= 20m, type === 'run', HR > 0.
- **GAP Adjustment:** Use the Minetti 5th-order polynomial for Grade Adjusted Pace (GAP).
- **Regression Window:** Default to 180 days for trend analysis, with R² strength indicators.

## Code Context

- `supabase/functions/strava-webhook/index.ts`: New webhook listener.
- `supabase/functions/gemini-coach/index.ts`: Updated synthesis and sanitization logic.
- `src/pages/InsightsPage.jsx`: Updated to use `react-markdown` for coaching summaries.
- `src/hooks/useStrava.js`: Updated for multi-page sync and webhook events.
- `package.json`: Added `react-markdown` dependency.

## Deferred / Out of Scope
- AI interpretation of efficiency trends (deferred to v1.2).
- Local fallback repair logic for failed synthesis plucking.
- Interactive editing of AI summaries by the user.
