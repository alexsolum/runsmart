# S01: Strava Robustness

**Vision:** Establish reliable, complete real-time data ingestion via Webhooks and pagination.

## Success Criteria

1. Webhook creates new activity in DB within 5s of upload.
2. Pagination loop successfully syncs history > 100 items.
3. Activity name change on Strava reflects in app via Update event.

## Implementation Tasks

### 1. Database & Security Prep
- [ ] **T01: DB Update:** Ensure `activities` table has `strava_id` (bigint unique) and columns for `heart_rate_zone_times` and metadata. (Verify against `supabase-schema.sql`).
- [ ] **T02: Env Vars:** Set `STRAVA_VERIFY_TOKEN` and `STRAVA_CLIENT_SECRET` in Supabase project settings.
- [ ] **T03: RLS Policies:** Verify that the `service_role` key can perform upserts on `activities` and `strava_connections`.

### 2. Strava Webhook Listener (`strava-webhook`)
- [ ] **T04: Scaffold Function:** Create `supabase/functions/strava-webhook/index.ts`.
- [ ] **T05: Handshake Logic (GET):** Implement verification of `hub.mode`, `hub.verify_token`, and return `hub.challenge`.
- [ ] **T06: Event Handler (POST):**
    - Acknowledge with 200 OK immediately.
    - Route `create`, `update`, and `delete` events for `object_type: activity`.
    - Implement `processActivityEvent` using `EdgeRuntime.waitUntil`.
- [ ] **T07: Sync Logic:**
    - Create/Update: Refresh OAuth token -> GET `DetailedActivity` -> GET `ActivityZones` -> Upsert to `activities`.
    - Delete: Hard delete activity from `activities` where `strava_id` matches `object_id`.
    - Privacy: If `updates.visible` is false, mark activity as hidden/private in DB.

### 3. History Pagination Sync (`strava-sync` upgrade)
- [ ] **T08: Pagination Loop:** Upgrade `strava-sync` to use a `while` loop with the `before` parameter.
- [ ] **T09: Batch Processing:** Fetch activities in chunks of 200.
- [ ] **T10: Throttling:** Implement a 1-second delay between pages to respect the 100 req / 15 min limit.
- [ ] **T11: Conflict Handling:** Skip existing records (check `strava_id`) to speed up deep history sync.

### 4. Frontend Integration
- [ ] **T12: Sync Hook:** Update `src/hooks/useStrava.js` to support multi-page syncing and progress state.
- [ ] **T13: Sync UI:**
    - Add "Sync Full History" button to the Data/Settings page.
    - Implement a progress bar and counter for the sync status.
    - Handle "Sync in Progress" state to prevent duplicate triggers.

### 5. Deployment & Subscription
- [ ] **T14: Deploy Function:** `supabase functions deploy strava-webhook`.
- [ ] **T15: Create Subscription:** Run a one-time CLI script (or manual cURL) to subscribe the webhook to Strava events using `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.

## Summary

This slice is currently in progress, focused on transitioning from polling to a webhook-driven architecture and ensuring historical completeness.
The quick tasks (S00) have already addressed some aspects of sync failure and performance analysis.
