---
phase: 01-philosophy-platform
plan: 04
subsystem: auth
tags: [react, supabase, hooks, tdd, admin, coach-philosophy]

requires:
  - phase: 01-philosophy-platform
    provides: useCoachPhilosophy hook and coach_admins table schema

provides:
  - isAdmin bootstrap detection: first authenticated user gets admin access when coach_admins table is empty
  - Three TDD unit tests covering empty-table, populated-no-match, populated-match cases

affects:
  - App.jsx (Admin nav conditional render already reads coachPhilosophy.isAdmin)
  - AdminPhilosophyPage (now reachable for first user without prior bootstrap mutation)

tech-stack:
  added: []
  patterns:
    - "Bootstrap detection: count query on coach_admins table alongside existing row check in Promise.all"
    - "isAdmin = tableEmpty || Boolean(adminRow.data?.role) — OR logic for bootstrapping"

key-files:
  created: []
  modified:
    - src/hooks/useCoachPhilosophy.js
    - tests/unit/coach.test.jsx

key-decisions:
  - "Use count query with { head: true, count: 'exact' } — no WHERE clause — to detect empty table state"
  - "isAdmin is true if table is empty (first user) OR if user has an existing row; server-side edge function handles actual row insertion on first saveDraft"
  - "Three Promise.all entries: adminCheck (count), adminRow (row), readData (edge function)"

patterns-established:
  - "TDD with renderHook for testing hooks that mock Supabase client chains"
  - "Call-order-based from() mock: first call returns count chain, second call returns row chain"

requirements-completed:
  - PHIL-01
  - PHIL-02

duration: 15min
completed: 2026-03-06
---

# Phase 01 Plan 04: Fix isAdmin Bootstrap Deadlock Summary

**Supabase count query on coach_admins breaks the bootstrapping deadlock so the first authenticated user sees the Admin nav without needing a prior mutation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-06T00:15:00Z
- **Completed:** 2026-03-06T00:30:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Fixed the isAdmin bootstrap deadlock in `useCoachPhilosophy.load()` with a single logic change
- Added a count query on `coach_admins` to detect empty-table state (first user scenario)
- Wrote three TDD unit tests (RED phase failed as expected, GREEN phase all pass)
- Full test suite remains green: 359/359 tests pass

## Task Commits

1. **Task 1: Fix isAdmin bootstrap detection** - `9ed8b0a` (feat — includes TDD tests + production fix)

## Files Created/Modified

- `src/hooks/useCoachPhilosophy.js` - Added count query in Promise.all; isAdmin now uses tableEmpty OR existing row logic
- `tests/unit/coach.test.jsx` - Added `useCoachPhilosophy bootstrap` describe block with 3 test cases

## Decisions Made

- Used `{ head: true, count: "exact" }` on the count query — no body returned, just the count header — efficient for bootstrap detection
- Kept the existing row check alongside the count query (both in Promise.all) so existing admins still work correctly
- Did NOT change `saveDraft`, `publish`, `rollback` — server-side `ensureAdminAccess()` still handles actual row insertion on first mutation
- Did NOT change `App.jsx` — the Admin nav conditional already reads `coachPhilosophy.isAdmin` from context

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

During TDD RED phase, test 3 (existing row → isAdmin=true) also failed because the mock structure assumed call-order-based `from()` behavior matching the new 3-query code. This was expected — the mock was written for the target implementation, not the current broken state. Both failing tests confirmed the fix was needed.

## Self-Check: PASSED

- `src/hooks/useCoachPhilosophy.js` includes count query and `tableEmpty` check: confirmed via Read
- Commit `9ed8b0a` exists: confirmed via git log
- 359/359 tests pass: confirmed via full test run

## Next Phase Readiness

- Admin bootstrap deadlock resolved: first user sees Admin nav immediately on app load
- UAT tests 2-7 (admin philosophy editing workflow) are now unblocked
- No changes to App.jsx, AdminPhilosophyPage, or edge function required

---
*Phase: 01-philosophy-platform*
*Completed: 2026-03-06*
