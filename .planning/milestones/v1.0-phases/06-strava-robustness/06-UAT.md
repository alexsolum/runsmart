# UAT: Phase 6 - Strava Robustness

**Status:** In-Progress
**Phase Goal:** Establish reliable, complete real-time data ingestion via Webhooks and pagination.

## Test Sessions

| Session | Date | Outcome | Issues |
|---------|------|---------|--------|
| Manual UAT | 2026-03-11 | Partial Pass | Real-time sync pending user test |

## Test Cases

### 1. Webhook Handshake (STRV-01)
- **Goal:** Verify that the `strava-webhook` function correctly responds to Strava's GET verification request.
- **Result:** **PASSED** (Subscription ID 269550 returned from Strava API)

### 2. Real-time Activity Import (STRV-01)
- **Goal:** Verify that a new Strava activity is automatically imported to Runsmart within 5 seconds.
- **Result:** **PENDING** (User unable to test at this time)

### 3. Activity Update Propagation (STRV-02)
- **Goal:** Verify that renaming an activity on Strava reflects in Runsmart.
- **Result:** **PENDING**

### 4. Activity Deletion (STRV-03)
- **Goal:** Verify that deleting an activity on Strava removes it from Runsmart.
- **Result:** **PENDING**

### 5. Full History Pagination Sync (STRV-04)
- **Goal:** Sync a user's entire Strava history (>100 items).
- **Result:** **PASSED** (User confirmed sync worked)

## Issue Tracker

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| - | - | - | - |
