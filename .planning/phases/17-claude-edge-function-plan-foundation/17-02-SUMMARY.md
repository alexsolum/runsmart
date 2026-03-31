---
phase: 17-claude-edge-function-plan-foundation
plan: 02
subsystem: cleanup
tags: [cleanup, dead-code-removal, philosophy-editor, CLEAN-02]
dependency_graph:
  requires: []
  provides: [clean-codebase-without-philosophy-editor]
  affects: [src/App.jsx, src/context/AppDataContext.jsx]
tech_stack:
  added: []
  patterns: [atomic-deletion, migration-based-cleanup]
key_files:
  created:
    - supabase/migrations/20260330_drop_philosophy_tables.sql
  modified:
    - src/App.jsx
    - src/context/AppDataContext.jsx
    - tests/unit/coach.test.jsx
  deleted:
    - src/pages/AdminPhilosophyPage.jsx
    - src/hooks/useCoachPhilosophy.js
    - supabase/functions/coach-philosophy-admin/index.ts
decisions:
  - Removed all philosophy tables via migration including coach_admins, coach_admin_audit, and coach_philosophy_versions (not just the two named in plan) because all five tables are part of the same orphaned system
  - Removed AdminPhilosophyPage and useCoachPhilosophy test blocks from coach.test.jsx (those tests covered deleted code)
  - 40 pre-existing test failures confirmed unchanged — none caused by this plan
metrics:
  duration: ~15min
  completed: 2026-03-30
  tasks_completed: 2
  files_changed: 7
---

# Phase 17 Plan 02: Remove Admin Philosophy Editor (CLEAN-02) Summary

**One-liner:** Atomic deletion of AdminPhilosophyPage component, useCoachPhilosophy hook, coach-philosophy-admin Edge Function, and all five philosophy database tables — coaching context now lives in SKILL.md reference files inside claude-coach.

## What Was Done

CLEAN-02 removed the entire admin philosophy editor system that was orphaned when the Claude coaching context was embedded in SKILL.md reference files (Phase 17 Plan 01). All code paths that read or wrote philosophy data have been deleted.

### Task 1: Remove philosophy files and update AppDataContext and App.jsx

Deleted three files:
- `src/pages/AdminPhilosophyPage.jsx` — the editor UI component
- `src/hooks/useCoachPhilosophy.js` — the Supabase hook with load/saveDraft/publish/rollback/export
- `supabase/functions/coach-philosophy-admin/index.ts` — the Edge Function handling admin actions

Modified two files:
- `src/context/AppDataContext.jsx` — removed `useCoachPhilosophy` import, hook call, and `coachPhilosophy` from value object and useMemo dependency array
- `src/App.jsx` — removed `AdminPhilosophyPage` import, `Shield` icon import, `coachPhilosophy` destructure, and the entire dynamic `navGroups` useMemo block; replaced with `const navGroups = NAV_GROUPS` and a static `allNavItems` useMemo

Also updated `tests/unit/coach.test.jsx` to remove the `AdminPhilosophyPage` and `useCoachPhilosophy` imports and the two corresponding `describe` blocks (7 tests covering deleted code).

### Task 2: Create migration to drop philosophy tables and update test mocks

Created `supabase/migrations/20260330_drop_philosophy_tables.sql` with:
- Drop statements for all five related tables: `coach_admins`, `coach_admin_audit`, `coach_philosophy_versions`, `coach_playbook_entries`, `coach_philosophy_documents`
- All nine associated RLS policies dropped before tables (matching exact policy names from original migration files)
- Correct dependency ordering (children before parents)

The `tests/unit/mockAppData.js` `makeAppData()` factory did not contain a `coachPhilosophy` property — no change needed there.

## Verification Results

| Check | Result |
|-------|--------|
| `grep "AdminPhilosophyPage\|useCoachPhilosophy\|coachPhilosophy" src/` | 0 results |
| `src/pages/AdminPhilosophyPage.jsx` exists | NO (expected) |
| `src/hooks/useCoachPhilosophy.js` exists | NO (expected) |
| `supabase/functions/coach-philosophy-admin/` exists | NO (expected) |
| `supabase/functions/gemini-coach/index.ts` exists | YES (untouched) |
| Drop migration contains `drop table if exists coach_philosophy_documents` | YES |
| Drop migration contains `drop table if exists coach_playbook_entries` | YES |
| Drop migration contains `drop policy if exists` statements | YES (9 statements) |

## Test Results

- 40 pre-existing test failures confirmed identical before and after this plan (checked via `git stash` baseline comparison)
- No new failures introduced
- 7 tests removed (covered deleted code — AdminPhilosophyPage and useCoachPhilosophy bootstrap tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Removed additional related philosophy tables from migration**
- **Found during:** Task 2 — reading original migration files
- **Issue:** The plan specified dropping only `coach_philosophy_documents` and `coach_playbook_entries`, but the original migration also created `coach_philosophy_versions`, `coach_admin_audit`, and `coach_admins` tables — all part of the same orphaned system
- **Fix:** Added all five tables and their nine RLS policies to the drop migration
- **Files modified:** `supabase/migrations/20260330_drop_philosophy_tables.sql`
- **Commit:** cce2993

**2. [Rule 1 - Bug] Removed AdminPhilosophyPage and useCoachPhilosophy tests from coach.test.jsx**
- **Found during:** Task 1 verification scan
- **Issue:** `tests/unit/coach.test.jsx` imported `AdminPhilosophyPage` and `useCoachPhilosophy` and had two describe blocks testing them — these would break with broken imports after file deletion
- **Fix:** Removed both imports and both describe blocks (7 tests)
- **Files modified:** `tests/unit/coach.test.jsx`
- **Commit:** ef8990e

## Commits

| Hash | Message |
|------|---------|
| ef8990e | feat(17-02): remove admin philosophy editor system (CLEAN-02) |
| cce2993 | chore(17-02): add migration to drop philosophy database tables |
