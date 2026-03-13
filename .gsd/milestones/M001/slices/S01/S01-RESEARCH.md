# S01 Research: Strava Robustness

**Focus:** Technical implementation details for real-time Webhooks, stable history pagination, and rate limit management.

## Requirements Traceability
| Req ID | Requirement | Status | Research Note |
|--------|-------------|--------|---------------|
| STRV-01 | Webhook Create | Implemented | `strava-webhook` handles `aspect_type: create`. Fetches detailed activity and zones. |
| STRV-02 | Webhook Update | Implemented | `strava-webhook` handles `aspect_type: update`. Re-fetches and upserts entire activity. |
| STRV-03 | Webhook Delete | Implemented | `strava-webhook` handles `aspect_type: delete`. Deletes by `strava_id`. |
| STRV-04 | History Pagination | Implemented | `strava-sync` + `useStrava.js` use `before` timestamp loop. |

## Technical Findings

### 1. Webhook Architecture (`strava-webhook`)
- **Handshake (GET):** Successfully implemented. Requires `STRAVA_VERIFY_TOKEN` env var.
- **Event Loop (POST):** Uses `EdgeRuntime.waitUntil` for background processing, ensuring the required 2-second response time to Strava is met.
- **Token Management:** Refreshes Strava access tokens automatically using the stored `refresh_token` if expired.
- **Deep Fetching:** For new/updated activities, it performs two additional requests:
    1. `GET /activities/{id}` (DetailedActivity)
    2. `GET /activities/{id}/zones` (Heart Rate Zones)
- **Gap:** Currently only handles `object_type: "activity"`. Deauthorization events (`object_type: "athlete"`) are ignored.

### 2. History Sync (`strava-sync`)
- **Strategy:** Uses `before` epoch timestamp for stable pagination (avoids skipping items if new ones are added during sync).
- **Rate Limit Protection:** 
    - `fullSync` mode explicitly skips fetching detailed zones to stay within Strava's 100 req / 15 min limit.
    - Implements a `sleep(500)` between pages (50 items/page).
- **Frontend Loop:** `useStrava.js` manages the loop, allowing the UI to show progress and handle large histories across multiple Edge Function calls if needed (though `strava-sync` has a 10-page limit per call).

### 3. Database & Schema
- `activities` table is well-defined with `strava_id` (unique), heart rate zone columns, and standard metrics.
- `strava_connections` table maps `user_id` to `strava_athlete_id`, enabling webhooks to route events to the correct user.

## Implementation Constraints & Risks

### 1. Strava Rate Limits
- **Limits:** 100 requests per 15 minutes / 1,000 requests per day.
- **Risk:** If many users sync simultaneously, the application might hit the global limit.
- **Mitigation:** The "Summary Activity" list fetch is efficient (1 req per 50-200 items). Detailed zone fetching is restricted to real-time events and the last 90 days.

### 2. Webhook Deauthorization
- Strava sends a webhook when a user disconnects the app from their Strava settings.
- **Action:** Need to add a handler for `object_type: "athlete"` to remove the connection in `strava_connections`.

### 3. Stability of Pagination
- The current implementation uses `before` which is stable. 
- **Improvement:** If a `strava-sync` call fails due to rate limiting (429), it should ideally return the `next_before` timestamp so the frontend can resume later.

## Proposed Implementation Plan

1.  **Harden `strava-webhook`:**
    *   Add `athlete` event handling (deauthorization).
    *   Ensure robust error logging.
2.  **Verify Webhook Registration:**
    *   The webhook must be registered once with Strava via their API (`POST /push_subscriptions`). This is an infra setup step.
3.  **Validate Pagination:**
    *   Test with a large history mock or account.
    *   Ensure `next_before` is always returned on partial failure.

## Skill Discovery
- **Directly Relevant Skills:**
    - `supabase-edge-functions`: Highly relevant for managing the webhook and sync logic.
    - `strava-api`: Essential for understanding the nuances of the data model and limits.
- **Promising Skills (to suggest):**
    - `supabase-auth`: For ensuring secure JWT handling in Edge Functions.
