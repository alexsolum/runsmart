# Roadmap: v1.1 Strava Sync & Insight Trends

**Created:** 2026-03-11
**Project:** RunSmart
**Total Requirements:** 7
**Starting Phase:** 6

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 6 | Strava Robustness | Establish reliable, complete real-time data ingestion via Webhooks and pagination. | STRV-01, STRV-02, STRV-03, STRV-04 | 1. Webhook creates new activity in DB within 5s of upload.<br>2. Pagination loop successfully syncs history > 100 items.<br>3. Activity name change on Strava reflects in app via Update event. |
| 7 | Advanced Analytics | Visualize aerobic efficiency trends to prove fitness gains independent of race results. | ANLY-01, ANLY-02 | 1. Chart displays individual "Easy Run" scatter points with regression trend line.<br>2. Filter logic correctly excludes short runs (<10m) and invalid HR (0).<br>3. Trend line updates reactively when data changes. |
| 8 | Insight Reliability | Ensure coaching synthesis is always presented as clean, formatted Markdown. | INSG-03 | 1. Synthesis callout never renders raw JSON or code block syntax.<br>2. Sanitize pipeline strips artifacts before render.<br>3. AI response adheres to strict Markdown contract. |

## Phase Details

### Phase 6: Strava Robustness
**Goal:** Establish reliable, complete real-time data ingestion via Webhooks and pagination.
**Requirements:**
- [x] **STRV-01**: User's new activities appear automatically via Webhook (Create event).
- [x] **STRV-02**: User's activity updates (title, privacy) reflect automatically via Webhook (Update event).
- [x] **STRV-03**: User's deleted activities are removed automatically via Webhook (Delete event).
- [x] **STRV-04**: User can sync full activity history beyond the default 100-item limit (pagination support).

**Success Criteria:**
1. Webhook creates new activity in DB within 5s of upload.
2. Pagination loop successfully syncs history > 100 items.
3. Activity name change on Strava reflects in app via Update event.

### Phase 7: Advanced Analytics
**Goal:** Visualize aerobic efficiency trends to prove fitness gains independent of race results.
**Requirements:**
- [x] **ANLY-01**: User can view an Aerobic Efficiency trend chart (Speed/HR over time) with regression line.
- [x] **ANLY-02**: System filters analytics data to exclude non-runs, short durations (<10m), and invalid heart rate (0 or null).

**Success Criteria:**
1. Chart displays individual "Easy Run" scatter points with regression trend line.
2. Filter logic correctly excludes short runs (<10m) and invalid HR (0).
3. Trend line updates reactively when data changes.

### Phase 8: Insight Reliability
**Goal:** Ensure coaching synthesis is always presented as clean, formatted Markdown.
**Requirements:**
- [x] **INSG-03**: User sees a formatted Markdown coaching summary without JSON wrappers or raw code blocks.

**Success Criteria:**
1. Synthesis callout never renders raw JSON or code block syntax.
2. Sanitize pipeline strips artifacts before render.
3. AI response adheres to strict Markdown contract.
