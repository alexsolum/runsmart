# Requirements: v1.1 Strava Sync & Insight Trends

**Goal:** Enhance coaching insights with deeper trend analysis and robust, real-time Strava integration.

## 1. Strava Integration (STRV)
Real-time data ingestion and historical completeness.

- [ ] **STRV-01**: User's new activities appear automatically via Webhook (Create event).
- [ ] **STRV-02**: User's activity updates (title, privacy) reflect automatically via Webhook (Update event).
- [ ] **STRV-03**: User's deleted activities are removed automatically via Webhook (Delete event).
- [ ] **STRV-04**: User can sync full activity history beyond the default 100-item limit (pagination support).

## 2. Progress Analytics (ANLY)
Visual proof of fitness efficiency independent of race results.

- [ ] **ANLY-01**: User can view an Aerobic Efficiency trend chart (Speed/HR over time) with regression line.
- [ ] **ANLY-02**: System filters analytics data to exclude non-runs, short durations (<10m), and invalid heart rate (0 or null).

## 3. Insight Synthesis (INSG)
Reliable coaching summary presentation.

- [ ] **INSG-03**: User sees a formatted Markdown coaching summary without JSON wrappers or raw code blocks.

## Out of Scope
- **ANLY-03**: AI interpretation of efficiency trends (deferred to v1.2).
- **INSG-05**: Local fallback summary if AI fails (deferred; focus on fixing the AI contract first).

## Traceability
| Req ID | Phase | Plan | Status |
|--------|-------|------|--------|
| STRV-01 | 6 | - | Pending |
| STRV-02 | 6 | - | Pending |
| STRV-03 | 6 | - | Pending |
| STRV-04 | 6 | - | Pending |
| ANLY-01 | 7 | - | Pending |
| ANLY-02 | 7 | - | Pending |
| INSG-03 | 8 | - | Pending |
