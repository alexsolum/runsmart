# Plan: Phase 6 - Strava Robustness

**Phase Number:** 6
**Goal:** Establish reliable, complete real-time data ingestion via Webhooks and pagination.
**Requirements:** STRV-01, STRV-02, STRV-03, STRV-04
**Success Criteria:** Webhook <5s sync, Pagination >100 items, Update event propagation.

## Phase Architecture
- **Standalone Webhook:** New Supabase Edge Function `strava-webhook` to handle Strava subscriptions and real-time events.
- **Background Sync:** Use `EdgeRuntime.waitUntil` to process events after acknowledging Strava's POST request within 2 seconds.
- **Stable Pagination:** Use `before` timestamp parameters to "walk" through a user's activity history without skipping or duplicating records.
- **Selective Sync:** Fetch `SummaryActivity` for deep history to preserve the 1,000 requests/day application-wide limit.

## Implementation Tasks

### 1. Database & Security Prep
- [ ] **DB Update:** Ensure `activities` table has `strava_id` (bigint unique) and columns for `heart_rate_zone_times` and metadata. (Verify against `supabase-schema.sql`).
- [ ] **Env Vars:** Set `STRAVA_VERIFY_TOKEN` and `STRAVA_CLIENT_SECRET` in Supabase project settings.
- [ ] **RLS Policies:** Verify that the `service_role` key can perform upserts on `activities` and `strava_connections`.

### 2. Strava Webhook Listener (`strava-webhook`)
- [ ] **Scaffold Function:** Create `supabase/functions/strava-webhook/index.ts`.
- [ ] **Handshake Logic (GET):** Implement verification of `hub.mode`, `hub.verify_token`, and return `hub.challenge`.
- [ ] **Event Handler (POST):**
    - [ ] Acknowledge with 200 OK immediately.
    - [ ] Route `create`, `update`, and `delete` events for `object_type: activity`.
    - [ ] Implement `processActivityEvent` using `EdgeRuntime.waitUntil`.
- [ ] **Sync Logic:**
    - [ ] **Create/Update:** Refresh OAuth token -> GET `DetailedActivity` -> GET `ActivityZones` -> Upsert to `activities`.
    - [ ] **Delete:** Hard delete activity from `activities` where `strava_id` matches `object_id`.
    - [ ] **Privacy:** If `updates.visible` is false, mark activity as hidden/private in DB.

### 3. History Pagination Sync (`strava-sync` upgrade)
- [ ] **Pagination Loop:** Upgrade `strava-sync` to use a `while` loop with the `before` parameter.
- [ ] **Batch Processing:** Fetch activities in chunks of 200.
- [ ] **Throttling:** Implement a 1-second delay between pages to respect the 100 req / 15 min limit.
- [ ] **Conflict Handling:** Skip existing records (check `strava_id`) to speed up deep history sync.

### 4. Frontend Integration
- [ ] **Sync Hook:** Update `src/hooks/useStrava.js` to support multi-page syncing and progress state.
- [ ] **Sync UI:**
    - [ ] Add "Sync Full History" button to the Data/Settings page.
    - [ ] Implement a progress bar and counter for the sync status.
    - [ ] Handle "Sync in Progress" state to prevent duplicate triggers.

### 5. Deployment & Subscription
- [ ] **Deploy Function:** `supabase functions deploy strava-webhook`.
- [ ] **Create Subscription:** Run a one-time CLI script (or manual cURL) to subscribe the webhook to Strava events using `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET`.

## Verification Plan

### Automated Tests
- [ ] **Unit:** Test `strava-webhook` handshake logic and payload routing.
- [ ] **Integration:** Mock Strava API responses for `DetailedActivity` and verify DB upserts.
- [ ] **Integration:** Verify that `delete` events remove records from the `activities` table.

### Manual Verification (UAT)
- [ ] **Handshake:** Confirm Strava successfully validates the webhook URL.
- [ ] **Real-time Sync:** Upload a 1-minute manual activity to Strava; verify it appears in Runsmart within 5 seconds.
- [ ] **Update Sync:** Rename an activity on Strava; verify the name updates in Runsmart.
- [ ] **Pagination:** Trigger "Sync Full History" for a user with >200 activities; verify all records are imported without gaps.
- [ ] **Rate Limiting:** Monitor Supabase logs during a full history sync to ensure no 429 errors from Strava.
