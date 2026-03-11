---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Strava Sync & Insight Trends
current_phase: 0
status: planning
last_updated: "2026-03-11"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# State

**Initialized:** 2026-03-11
**Current Phase:** 0 (Planning)
**Status:** Defining requirements

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

## Phase Status

| Phase | Name | Status |
|-------|------|--------|
| - | - | - |

## Notes

- Milestone v1.1 started. Focus on Strava reliability and deeper analytics.

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
