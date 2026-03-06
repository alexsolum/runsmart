---
phase: 04-insights-coach-layer
plan: 02
subsystem: ui
tags: [react, gemini, edge-function, insights, synthesis, coaching]

# Dependency graph
requires:
  - phase: 04-insights-coach-layer/04-01
    provides: InsightsPage with training load overlay, computeTrainingLoadState, SkeletonBlock component
  - phase: 03-feedback-loop-integration
    provides: buildDefaultSystemInstruction, buildPrompt, gemini-coach edge function patterns, instructionSnippets.js
provides:
  - insights_synthesis mode in gemini-coach edge function returning { synthesis: string }
  - INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET export in instructionSnippets.js for test assertions
  - synthesis callout (data-testid="synthesis-callout") above KPI strip in InsightsPage
  - .insights-coach-synthesis CSS class following left-border accent pattern
  - SkeletonBlock component extended to accept and pass through extra props (including data-testid)
affects: future InsightsPage enhancements, gemini-coach edge function extensions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "one-shot useEffect with useRef guard prevents duplicate API calls on re-render"
    - "silent-fail pattern: synthesis callout omitted on error, no error state displayed"
    - "early-return mode dispatch in gemini-coach edge function for each coach mode"

key-files:
  created: []
  modified:
    - supabase/functions/gemini-coach/index.ts
    - src/lib/instructionSnippets.js
    - src/pages/InsightsPage.jsx
    - src/styles/index.css
    - tests/unit/insights.test.jsx
    - tests/unit/gemini-instructions.test.jsx

key-decisions:
  - "INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET is inlined in the Deno edge function (cannot import from src/lib); instructionSnippets.js export exists for test assertion only"
  - "useRef guard (synthesisFetchedRef) prevents re-call on re-render; hasData is the only useEffect dependency"
  - "Silent fail: synthesis callout is simply absent on error — no error UI, no retry"
  - "SkeletonBlock extended with ...props spread to support data-testid for synthesis-skeleton testability"

patterns-established:
  - "Synthesis callout pattern: one-shot useEffect + useRef guard + silent fail + skeleton during load"
  - "instructionSnippets.js is for test assertion anchors only; edge function inlines the text"

requirements-completed: [INSG-02]

# Metrics
duration: 7min
completed: 2026-03-06
---

# Phase 4 Plan 02: Insights Synthesis Callout Summary

**Gemini insights_synthesis mode added to gemini-coach edge function, returning a 2-4 sentence coach paragraph rendered above the KPI strip in InsightsPage with skeleton loading state and silent failure**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T11:47:10Z
- **Completed:** 2026-03-06T11:54:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added `insights_synthesis` mode to gemini-coach edge function as an early-return block returning `{ synthesis: string }`
- Exported `INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET` from `instructionSnippets.js` for test assertions
- Wired synthesis callout into InsightsPage: one-shot useEffect with useRef guard, skeleton during load, silent omission on error
- Added `.insights-coach-synthesis` CSS class following the established left-border accent pattern
- Extended `SkeletonBlock` to accept extra props (including `data-testid`) for test accessibility
- All 387 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add insights_synthesis mode to gemini-coach + instruction snippet** - `712eb4b` (feat)
2. **Task 2: Wire synthesis callout into InsightsPage with CSS** - `a401208` (feat)

**Plan metadata:** next commit (docs)

_Note: TDD tasks have test → implementation commits per task_

## Files Created/Modified
- `supabase/functions/gemini-coach/index.ts` - Added insights_synthesis early-return mode block, extended CoachMode type and RequestBody.mode union
- `src/lib/instructionSnippets.js` - Added INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET export
- `src/pages/InsightsPage.jsx` - Added synthesis state, useRef guard, useEffect, JSX callout above KPI strip; SkeletonBlock extended with props spread
- `src/styles/index.css` - Added .insights-coach-synthesis class with left-border accent styling
- `tests/unit/insights.test.jsx` - Added mocks for supabaseClient/coachPayload; 4 new INSG-02 synthesis tests
- `tests/unit/gemini-instructions.test.jsx` - Added INSG-02 test asserting snippet contains "current fitness trend"

## Decisions Made
- INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET is inlined verbatim in the Deno edge function (Deno cannot import from src/lib). The instructionSnippets.js export exists solely for test assertions — the distinctive phrase "current fitness trend" is copied by value into both places.
- useRef guard prevents re-call on component re-renders; `hasData` is the only useEffect dependency to avoid stale closure re-fires.
- Silent fail: synthesis callout is absent on error with no error state displayed to the user.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SkeletonBlock component didn't accept extra props**
- **Found during:** Task 2 (synthesis callout implementation)
- **Issue:** SkeletonBlock only accepted `height` prop; passing `data-testid="synthesis-skeleton"` was silently ignored, causing the skeleton test to fail
- **Fix:** Added `...props` rest parameter and spread onto the div element
- **Files modified:** src/pages/InsightsPage.jsx
- **Verification:** `findByTestId("synthesis-skeleton")` test passes
- **Committed in:** a401208 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — single-line fix to SkeletonBlock. No scope creep.

## Issues Encountered
- Plan 04-01 was executed concurrently and committed its InsightsPage changes (load-state-callout) which included the INSG-01 test block already in insights.test.jsx. The synthesis tests from this plan were absorbed into the 04-01 commit at `265fcee`. The remaining CSS-only change was committed separately. No work was lost.

## User Setup Required
None - no external service configuration required. The edge function change deploys via Supabase CLI to the already-configured gemini-coach function.

## Next Phase Readiness
- Insights synthesis callout is live; athletes see a 2-4 sentence coach framing before viewing analytics
- INSG-02 complete; INSG-01 (load-state-callout) was also completed by concurrent plan 04-01 execution
- Both INSG requirements satisfied; phase 4 insights coach layer is functionally complete

---
*Phase: 04-insights-coach-layer*
*Completed: 2026-03-06*
