---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Strava Sync & Insight Trends
current_phase: 8
status: in-progress
last_updated: "2026-03-11"
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
---

# State

**Initialized:** 2026-03-11
**Current Phase:** 8 (Insight Reliability)
**Status:** Decisions finalized, moving to research.

Last activity: 2026-03-12 - Completed quick task 5: Improve the aerobic efficiency trend chart (180-day window, regression quality badge, pace tooltip)

## Project Reference

See: .planning/PROJECT.md

**Core value:** The coaching guidance must produce practical, tailored training decisions that fit real life while preserving long-term progression and injury prevention.

## Artifacts

- Project: `.planning/PROJECT.md`
- Config: `.planning/config.json`
- Research: `.planning/research/`
- Requirements: `.planning/REQUIREMENTS.md`
- Roadmap: `.planning/ROADMAP.md`
- Codebase map: `.planning/codebase/`
- Context: `.planning/milestones/v1.0-phases/06-CONTEXT.md`
- Research: `.planning/milestones/v1.0-phases/06-RESEARCH.md`
- Plan: `.planning/milestones/v1.0-phases/06-PLAN.md`

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 6 | Strava Robustness | In-Progress |
| 7 | Advanced Analytics | Todo |
| 8 | Insight Reliability | Todo |

## Notes

- Milestone v1.1 started. Focus on Strava reliability and deeper analytics.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | debug why strava sync fails; reproduce with chromium MCP and inspect Supabase + Vercel | 2026-03-12 | 577d04c | [1-debug-why-strava-sync-fails-reproduce-wi](./quick/1-debug-why-strava-sync-fails-reproduce-wi/) |
| 2 | Resume the Insights / Innsikt AI card fix and finish deployment | 2026-03-12 | pending | [2-resume-the-insights-innsikt-ai-card-fix-](./quick/2-resume-the-insights-innsikt-ai-card-fix-/) |
| 3 | I need you to change the Innsikt page to norwegian as well (as i have selected norwegian in the sidebar navigation). All text on the page should be norwegian, as well as the response from the AI Coach (gemini) | 2026-03-12 | 36eeea2 | [3-i-need-you-to-change-the-innsikt-page-to](./quick/3-i-need-you-to-change-the-innsikt-page-to/) |
| 4 | Cache the AI coaching feedback on the InsightsPage (insights_synthesis mode) with 1-hour TTL keyed by language | 2026-03-12 | 68345f5 | [4-cache-the-ai-coaching-feedback-on-the-in](./quick/4-cache-the-ai-coaching-feedback-on-the-in/) |
| 5 | Improve the aerobic efficiency trend chart (180-day window, regression quality badge R²/strength/count, pace in tooltip) | 2026-03-12 | 2e00225 | [5-improve-the-aerobic-efficiency-trend-cha](./quick/5-improve-the-aerobic-efficiency-trend-cha/) |

## Decisions

- isAdmin bootstrap: tableEmpty (count=0) || existing row — OR logic resolves deadlock without changing App.jsx or edge function
- Server-side ensureAdminAccess() still handles actual row insertion on first saveDraft mutation
- [Phase 03-feedback-loop-integration]: gemini-instructions stubs use .jsx extension for jsdom pickup; module-not-found is intentional RED state for 03-01
- [Phase 03-feedback-loop-integration]: makeAppData default checkins updated to SAMPLE_CHECKINS with loadCheckins mock to prevent undefined.catch() crashes
- [Phase 03-feedback-loop-integration]: recentCheckins uses slice(0,3).map(normalizeCheckin).filter(Boolean); latestCheckin unchanged for backward compat
- [Phase 03-feedback-loop-integration]: instructionSnippets.js is frontend-only for test assertions; citation/methodology mandate strings are copied by value into Deno edge function instruction builders
- [Phase 03-feedback-loop-integration]: philosophyAddendum passed as optional 4th param to buildDefaultSystemInstruction — now injected into initial and followup Gemini calls alongside replan modes
- [Phase 03-feedback-loop-integration]: adaptation_summary stored as separate useState in CoachPage; embedded in replanData object in LongTermPlanPage — consistent with each page's existing state shape
- [Phase 04-insights-coach-layer]: computeTrainingLoadState: locked TSB thresholds (>10=good_form, >=-5=neutral, >=-15=accumulating_fatigue, else overreaching_risk); 15-day trend window ±2 dead-band; reuses coach-adaptation-note CSS class
- [Phase 04-insights-coach-layer]: INSG-02: INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET inlined in Deno edge function; instructionSnippets.js export for test assertions only
- [Phase 04-insights-coach-layer]: INSG-02: Synthesis callout silently omitted on error - no error UI displayed to user
- [Phase 05-insights-synthesis-hardening]: 05-01 migrated insights_synthesis to strict plain-text four-section contract (Mileage Trend, Intensity Distribution, Long-Run Progression, Race Readiness) with 10-12 week interpretation horizon wording
- [Phase 05-insights-synthesis-hardening]: 05-01 enforces sanitize -> section-validation -> deterministic fallback pipeline in edge function before returning synthesis
- [Phase 05-insights-synthesis-hardening]: 05-02 sets mode-aware payload windows (default 4w/7d, insights_synthesis 12w/84d) with deterministic chronology and explicit insights-mode wiring from InsightsPage
- [quick-4]: SYNTHESIS_CACHE uses module-level object (not localStorage) — survives SPA navigation, resets on browser reload; keyed by lang so en/no caches are independent
- [quick-5]: rStrength thresholds: >=0.5=strong, >=0.25=moderate, else weak; pace in tooltip = 60/speed(km/h) formatted M:SS min/km with "—" fallback for zero speed
