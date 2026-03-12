# Context: Phase 6 - Strava Robustness

**Phase Number:** 6
**Goal:** Establish reliable, complete real-time data ingestion via Webhooks and pagination.

## Decisions

### Webhook Architecture
- **Function:** Standalone Supabase Edge Function `strava-webhook` (not integrated into `strava-sync`).
- **Security:** Token-based validation only. Uses `STRAVA_VERIFY_TOKEN` for both GET handshake and POST events.
- **Initialization:** Subscription with Strava will be created once via a manual CLI script (using `service_role` key).

### Event Granularity & Logic
- **Create:** Immediate full-object fetch from Strava API to meet the <5s sync requirement.
- **Update:** Re-fetch the entire activity object from the Strava API on any `UPDATE` event to ensure data consistency.
- **Metadata Sync:** Fully sync title, type, and description.
- **Privacy:** If an activity is changed to "Private" on Strava, mark it as hidden/private in Runsmart (do not delete).
- **Overwrite Policy:** Always overwrite local activity fields (including `effort_rating`) with fresh Strava data during an update.

### Pagination & Sync Strategy
- **Initial Connection:** Sync only the most recent 100 activities immediately.
- **Full History Sync:** Triggered via a manual "Sync All History" button in the UI.
- **Implementation:** The Edge Function will handle pagination loops internally with delays to respect Strava rate limits.
- **Duplicates:** Skip existing activities during full history sync for performance.
- **UX Feedback:** Display a detailed progress bar/counter (e.g., "400/1250 synced") during deep history syncs.

### Conflict & Deletion Policy
- **Deletion:** Hard delete the activity from Runsmart if it is deleted on Strava.
- **Overlap:** Keep both manual and synced activities if they occur at the same time (no automatic merging).
- **Source of Truth:**
    - **Activity Metrics (including exertion):** Strava is the source of truth for all synced data.
    - **Coaching Context:** Runsmart (local tables) is the source of truth for notes, feedback, and plan adjustments.

## Code Context

### Relevant Files
- `src/hooks/useStrava.js`: Main frontend hook for Strava interactions.
- `supabase/functions/strava-auth/`: Handles OAuth flow.
- `supabase/functions/strava-sync/`: Current manual sync implementation.
- `supabase/functions/strava-webhook/`: (To be created) New webhook listener.
- `supabase-schema.sql`: Contains `strava_connections` and `activities` table definitions.

### Reusable Patterns
- **Edge Function Auth:** Use `supabaseClient` with `service_role` for DB operations in the webhook.
- **Rate Limit Handling:** Use existing `sleep()` or timeout patterns in Deno for pagination loops.
- **Unique IDs:** Rely on `strava_id` (bigint unique) in `activities` table for conflict prevention.

## Deferred / Out of Scope
- Auto-merging manual and synced activities.
- Complex multi-account Strava syncing.
- "Undo" for activity deletions (Hard delete is final).
