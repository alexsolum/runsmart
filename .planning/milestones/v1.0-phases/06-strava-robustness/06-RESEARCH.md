# Research: Phase 6 - Strava Robustness

**Phase:** 6
**Status:** Completed
**Focus:** Technical implementation details for Webhooks and Deep History Pagination using Deno/Supabase Edge Functions.

## Standard Stack
- **API:** Strava API v3.
- **Runtime:** Deno (Supabase Edge Functions).
- **Security:** Secret URL segment + `subscription_id` validation.
- **Database:** Supabase (PostgreSQL) with `service_role` for background sync.

## Architecture Patterns

### 1. Webhook Handshake & Event Loop
Strava webhooks require a strict 2-second response time for both the handshake (GET) and event notifications (POST).
- **Handshake (GET):**
  - Verify `hub.mode === "subscribe"` and `hub.verify_token === Deno.env.get("STRAVA_VERIFY_TOKEN")`.
  - Return `{"hub.challenge": "..."}` as JSON with status 200.
- **Event Notification (POST):**
  - Extract `object_id`, `owner_id`, `aspect_type` ("create", "update", "delete"), and `object_type` ("activity").
  - **Immediate Response:** Return `200 OK` within 2 seconds.
  - **Background Processing:** Use `EdgeRuntime.waitUntil(promise)` to trigger data fetching after the response is sent. This prevents Strava timeouts while allowing for the multiple API calls needed for full data (Details + Zones).

### 2. Deep History Pagination (Walking through time)
Instead of just using `page` numbers, use the `before` and `after` epoch timestamp parameters for a "stable" pagination loop.
- **Max Page Size:** 200 items per request (`per_page=200`).
- **Loop Logic:** 
  1. Fetch recent 200.
  2. Record the `start_date` of the oldest activity.
  3. Fetch next 200 with `before=[oldest_timestamp]`.
  4. Stop when the response array is empty or length < 200.
- **Throttling:** Use `await sleep(ms)` between requests to stay under the 100 requests / 15-minute limit.

## Don't Hand-Roll
- **Strava SDKs:** Most Deno/TypeScript Strava SDKs are either outdated or heavy. **Prefer direct fetch calls** for simplicity in Edge Functions.
- **OAuth:** Reuse the logic in `strava-auth` and `strava-sync` for token refresh.

## Common Pitfalls

### 1. Rate Limit Exhaustion (Critical)
Strava's default limits are **100 requests per 15 min** and **1,000 requests per day** for the **entire application** (not per user).
- **Problem:** Fetching `DetailedActivity` + `Zones` for a user's entire history (e.g., 500 runs) will use 1,000 requests, hitting the daily limit for all users instantly.
- **Solution:** 
  - **List Only:** Fetch all history as `SummaryActivity` (1 request per 200 items).
  - **Selective Deep Fetch:** Only fetch `DetailedActivity` and `Zones` for:
    - New activities (Webhooks).
    - Recent activities (last 90 days) needed for charts.
    - On-demand (when a user views a specific activity).

### 2. Webhook Timeout (2 Seconds)
Strava will disable your webhook if it consistently exceeds 2 seconds.
- **Solution:** Do NOT perform DB lookups or API calls before responding 200 OK to the POST. Capture the payload and use `EdgeRuntime.waitUntil`.

### 3. Field Differences
- `SummaryActivity` (from list): No `description`, no `zones`.
- `DetailedActivity` (from `GET /activities/{id}`): Has `description`, still no `zones`.
- `ActivityZones` (from `GET /activities/{id}/zones`): Necessary for Heart Rate / Power distribution.

### 4. Update Event Logic
The `UPDATE` webhook event only contains changed fields in the `updates` object (e.g., `{"title": "New Name"}`). 
- **Recommendation:** Always re-fetch the full activity from the Strava API on any `update` event to ensure the local DB stays perfectly in sync with the source of truth.

## Code Examples

### Deno Webhook Handler with Background Sync
```typescript
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // 1. Handshake Handlers (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    
    if (mode === "subscribe" && token === Deno.env.get("STRAVA_VERIFY_TOKEN")) {
      return new Response(JSON.stringify({ "hub.challenge": challenge }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  // 2. Event Handler (POST)
  if (req.method === "POST") {
    const payload = await req.json();
    const { object_type, object_id, aspect_type, owner_id } = payload;

    if (object_type === "activity") {
      // Trigger background sync - do NOT await
      EdgeRuntime.waitUntil(processActivityEvent(payload));
    }

    return new Response("ok", { status: 200 });
  }
});

async function processActivityEvent(payload: any) {
  // 1. Refresh token for owner_id
  // 2. GET /activities/{object_id}
  // 3. GET /activities/{object_id}/zones
  // 4. Upsert to DB
}
```

### Stable Pagination Loop
```typescript
let before = Math.floor(Date.now() / 1000);
let allSynced = false;

while (!allSynced) {
  const res = await fetch(`.../athlete/activities?before=${before}&per_page=200`);
  const activities = await res.json();
  
  if (activities.length === 0) break;

  // Process chunk...
  
  // Set next "before" to the start_date of the last activity in the array
  const last = activities[activities.length - 1];
  before = Math.floor(new Date(last.start_date).getTime() / 1000);
  
  if (activities.length < 200) allSynced = true;
  
  // Throttle to respect 100 req / 15 min
  await new Promise(r => setTimeout(r, 1000)); 
}
```
