---
phase: 03-feedback-loop-integration
plan: "00"
subsystem: testing
tags: [vitest, fixtures, mock-data, check-ins, gemini-coach]

# Dependency graph
requires: []
provides:
  - SAMPLE_CHECKINS fixture exported from mockAppData.js (3 entries, weeks -1/-2/-3)
  - makeAppData default checkins slice with loadCheckins mock resolving to SAMPLE_CHECKINS
  - tests/unit/gemini-instructions.test.jsx with 4 failing stubs for FDBK-01 and FDBK-02
  - adaptation_summary field in SAMPLE_PLAN_DATA in coach.test.jsx
affects:
  - 03-01-PLAN.md (creates src/lib/instructionSnippets.js to turn stubs GREEN)
  - 03-02-PLAN.md (uses SAMPLE_CHECKINS in check-in context tests)
  - 03-03-PLAN.md (uses adaptation_summary in long_term_replan tests)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Test stubs fail on missing module (module-not-found RED) rather than on logic — valid Nyquist RED state"
    - "SAMPLE_CHECKINS uses weeksAgoOnDow helper for stable relative dates"

key-files:
  created:
    - tests/unit/gemini-instructions.test.jsx
  modified:
    - tests/unit/mockAppData.js
    - tests/unit/coach.test.jsx

key-decisions:
  - "gemini-instructions stubs use .jsx extension to be picked up by jsdom test project (vitest config includes tests/unit/**/*.test.jsx)"
  - "Stubs import from src/lib/instructionSnippets.js (not yet created) — module-not-found counts as RED state"
  - "makeAppData default checkins slice now includes loadCheckins mock to prevent undefined.catch() crashes in component effects"

patterns-established:
  - "Test stubs referencing future modules create clean RED state without false failures"

requirements-completed: [FDBK-01, FDBK-02]

# Metrics
duration: 10min
completed: 2026-03-06
---

# Phase 3 Plan 00: Feedback Loop Integration — Test Infrastructure Summary

**SAMPLE_CHECKINS fixture added to mockAppData, gemini-instructions stubs created (4 failing), and SAMPLE_PLAN_DATA extended with adaptation_summary to unblock Wave 1 plans**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-06T08:43:21Z
- **Completed:** 2026-03-06T08:53:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `SAMPLE_CHECKINS` export to mockAppData.js with 3 check-in entries covering fatigue, sleep_quality, motivation, and niggles across 3 prior Mondays
- Updated `makeAppData` default checkins slice from empty array to SAMPLE_CHECKINS with stable `loadCheckins` mock
- Created `tests/unit/gemini-instructions.test.jsx` with 4 stub tests that fail cleanly on missing module (FDBK-01 citation mandate, FDBK-02 methodology/philosophy blend)
- Added `adaptation_summary` field to `SAMPLE_PLAN_DATA` in coach.test.jsx
- All 359 pre-existing tests remain green; only 4 new stubs fail (expected RED state)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add SAMPLE_CHECKINS and update makeAppData checkins slice** - `f6c0a61` (feat)
2. **Task 2: Create gemini-instructions.test.jsx stubs + update SAMPLE_PLAN_DATA** - `75a2bfe` (test)

## Files Created/Modified
- `tests/unit/mockAppData.js` - Added SAMPLE_CHECKINS export (3 entries) and updated makeAppData checkins slice to include loadCheckins mock
- `tests/unit/gemini-instructions.test.jsx` - New file: 4 failing stub tests for instruction mandate assertions (FDBK-01, FDBK-02)
- `tests/unit/coach.test.jsx` - Added adaptation_summary field to SAMPLE_PLAN_DATA fixture

## Decisions Made
- Used `.jsx` extension for gemini-instructions tests so vitest's jsdom project picks them up automatically (the `tests/unit/**/*.test.jsx` glob)
- Module-not-found on `src/lib/instructionSnippets.js` is the intentional RED state — 03-01 will create this module to turn the stubs GREEN
- `makeAppData` checkins default updated to SAMPLE_CHECKINS (not empty) so component effects calling `checkins.loadCheckins()` don't crash with undefined

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Test infrastructure in place: SAMPLE_CHECKINS, gemini-instructions stubs, adaptation_summary fixture all ready
- 03-01 can now create `src/lib/instructionSnippets.js` and the 4 stubs will turn GREEN
- 03-02 can use SAMPLE_CHECKINS in check-in context assembly tests
- 03-03 can use adaptation_summary in long_term_replan mock response assertions

---
*Phase: 03-feedback-loop-integration*
*Completed: 2026-03-06*
