# Pitfalls Research

## Strava Integration
- **Rate Limits:** 100 req/15 min is tight.
  - *Risk:* A "Deep Sync" (all history) for a user with 2,000 activities uses 20 requests. 5 users doing this simultaneously hits the app limit.
  - *Mitigation:* Implement incremental sync using `after` parameter. Only fetch full history on explicit user request.
- **Webhook Timeouts:** Strava requires < 2s response.
  - *Risk:* Fetching activity details inside the main handler thread will timeout.
  - *Mitigation:* Use `EdgeRuntime.waitUntil` for async processing. Return 200 OK immediately.
- **Duplicate Events:** Strava might retry webhooks.
  - *Mitigation:* Idempotent upsert logic (`ON CONFLICT (strava_id) DO UPDATE`).

## Analytics & Trends
- **Data Quality:** "Garbage in, garbage out."
  - *Risk:* Including warmups, cooldowns, or treadmill runs (bad pace data) in efficiency trend.
  - *Mitigation:* Filter aggressively: `type === "Run"`, `manual === false`, `avg_heartrate > 0`, `distance > 2km`.
- **Seasonality:** Pace/HR decouples in heat/humidity.
  - *Risk:* User sees "declining fitness" in summer when it's just heat drift.
  - *Mitigation:* AI insight should contextually mention temperature impact if weather data is available (unlikely for MVP), or generic disclaimer text.

## Insight Synthesis
- **Format Leakage:** LLMs love Markdown code blocks (` ```markdown `).
  - *Risk:* The UI renders the code block syntax instead of the formatted text.
  - *Mitigation:* Regex strip `^```(markdown|json)?` and trailing ````$`.
- **Validation Failure:**
  - *Risk:* Strict validation rejects a perfectly good response because of a missing header.
  - *Mitigation:* Relaxed validation (warn, don't fail). Or render "Raw" text in a `<pre>` block only in dev mode for debugging.

## General
- **Security:** Public webhook endpoint exposure.
  - *Risk:* malicious actors flooding the endpoint.
  - *Mitigation:* Verify `hub.verify_token` (GET) and `owner_id` check (POST).
