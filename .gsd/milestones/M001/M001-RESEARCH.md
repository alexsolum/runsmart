# M001 Research: Strava Sync & Insight Trends

**Focus:** Technical implementation details for Webhooks, Deep History Pagination, and Aerobic Efficiency analytics.

## Strava Webhook Implementation

### Handshake & Event Loop
Strava webhooks require a strict 2-second response time for both the handshake (GET) and event notifications (POST).
- **Handshake (GET):** Verify `hub.mode === "subscribe"` and `hub.verify_token`. Return `{"hub.challenge": "..."}` as JSON with status 200.
- **Event Notification (POST):** Acknowledge with `200 OK` within 2 seconds. Use `EdgeRuntime.waitUntil(promise)` to trigger background data fetching.

### Selective Deep Fetching (Rate Limiting)
Strava's default limits are **100 requests per 15 min** and **1,000 requests per day** for the entire application.
- **Strategy:** Fetch history as `SummaryActivity` (1 request per 200 items). Only fetch `DetailedActivity` and `Zones` for:
    - New activities (Webhooks).
    - Recent activities (last 90 days) needed for charts.
    - On-demand (specific activity views).

### Stable Pagination
Use `before` and `after` epoch timestamp parameters instead of page numbers for a stable pagination loop.
- **Max Page Size:** 200 items per request (`per_page=200`).
- **Throttling:** Implement a 1-second delay between requests to respect the 100 req / 15-min limit.

## Aerobic Efficiency Analytics

### Grade Adjusted Pace (GAP)
Use the **Minetti 5th-order polynomial** for grade adjustment to calculate adjusted speed on varying terrain.
- Grade (slope) is calculated from `elevation_gain / distance`.
- Adjusted Speed = `actual_speed * MinettiFactor(grade)`.

### Linear Regression for Trends
Implement a simple linear regression to find the slope and R² value of aerobic efficiency (Speed/HR) over time.
- **Easy Run Filter:** Only include runs with duration >= 20m and HR > 0.
- **Regression Strength:**
    - R² >= 0.5: Strong correlation.
    - R² >= 0.25: Moderate correlation.
    - R² < 0.25: Weak correlation (unreliable trend).

## Insight Synthesis Sanitization

### Regex Extraction (Plucking)
Use regex to find required sections (`Mileage Trend`, `Intensity Distribution`, `Long-Run Progression`, `Race Readiness`) and extract only the content between them.
- Discard markdown fences (```json) and AI "chatter" (intro/outro text).
- Rebuild as a structured Markdown string with H3 headers.

### Audit Logging
Log malformed AI responses to `ai_audit_logs` table for prompt engineering refinement.
- Track `user_id`, `mode`, `raw_response`, and `error_type`.
