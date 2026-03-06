---
phase: 03-feedback-loop-integration
plan: "01"
subsystem: gemini-coach
tags: [edge-function, system-instructions, feedback-loop, coaching-mandates]
dependency_graph:
  requires: [03-00]
  provides: [FDBK-01, FDBK-02, RPLN-03]
  affects: [gemini-coach/index.ts, src/lib/instructionSnippets.js]
tech_stack:
  added: []
  patterns:
    - Promise.all for parallel philosophy + playbook fetch before mode branching
    - philosophyAddendum injected into all Gemini system instructions (initial, followup, replan)
    - Citation and methodology mandate strings shared between edge function and test assertions
key_files:
  created:
    - src/lib/instructionSnippets.js
  modified:
    - supabase/functions/gemini-coach/index.ts
decisions:
  - instructionSnippets.js is frontend-only (Deno cannot import src/); strings are copied verbatim into edge function instruction builders
  - philosophyAddendum passed as optional 4th param to buildDefaultSystemInstruction for backward compat
  - recentCheckins declared optional in RequestBody for zero-breaking-change rollout
  - adaptation_summary sanitized with .slice(0, 600) and has fallback string to avoid null in response
metrics:
  duration: "3 minutes"
  completed: "2026-03-06"
  tasks_completed: 2
  files_changed: 2
---

# Phase 3 Plan 01: Gemini Coach Instruction Mandates Summary

**One-liner:** Citation mandate, methodology mandate, philosophy-in-all-modes, recentCheckins trend, and adaptation_summary schema injected into gemini-coach edge function system instructions.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create instructionSnippets.js and turn Wave 0 stubs green | d538586 | src/lib/instructionSnippets.js |
| 2 | Update gemini-coach/index.ts with all Phase 3 instruction and schema changes | 578732e | supabase/functions/gemini-coach/index.ts |

## What Was Built

### Task 1: src/lib/instructionSnippets.js

Created a thin JS module that exports two named constants:
- `CITATION_MANDATE_SNIPPET` — the verbatim text of the data citation requirement clause
- `METHODOLOGY_MANDATE_SNIPPET` — the verbatim text of the methodology alignment requirement clause

These strings exist solely for unit test assertions (gemini-instructions.test.jsx). The Deno edge function cannot import from `src/`, so the strings are duplicated by value in the instruction builders. The 4 Wave 0 stub tests (previously RED / module-not-found) are now GREEN.

### Task 2: gemini-coach/index.ts — 5 Changes Applied

**Change 1 — recentCheckins in RequestBody:** Added `recentCheckins?: Checkin[]` as optional field. Backward compatible.

**Change 2 — Philosophy fetch before mode branching:** Replaced two separate `fetchActivePhilosophyDocument` calls (one inside `long_term_replan` branch, one inside `plan/plan_revision` branch) with a single `Promise.all` at the top:
```typescript
const [dynamicPlaybookAddendum, activePhilosophy] = await Promise.all([
  fetchDynamicPlaybookAddendum(supabase, body, mode),
  fetchActivePhilosophyDocument(supabase),
]);
const philosophyAddendum = buildActivePhilosophyAddendum(activePhilosophy);
```
All branches now share the pre-computed `philosophyAddendum`.

**Change 3 — Citation and methodology mandates in ALL instruction builders:** Both `buildDefaultSystemInstruction` (initial/followup modes) and `buildReplanSystemInstruction` (plan/plan_revision/long_term_replan modes) now include the citation mandate and methodology mandate strings verbatim. `buildReplanSystemInstruction` also includes the adaptation_summary mandate. `buildDefaultSystemInstruction` gained a 4th optional `philosophyAddendum` parameter and injects it when present (initial and followup call sites now pass it).

**Change 4 — Multi-week check-in trend in buildPrompt:** After the existing `latestCheckin` block, a `checkinList` is derived from `recentCheckins` (with fallback to `[latestCheckin]`). When length > 1, a trend section is rendered. When length === 0 and no dailyLogs, an explicit absent-data acknowledgment is appended.

**Change 5 — adaptation_summary in replan response schemas:** All three replan system instruction strings now declare `adaptation_summary` as a REQUIRED top-level JSON field. Parse/sanitize code in each mode extracts `parsedResult.adaptation_summary`, applies `.slice(0, 600)`, and includes it in the response body alongside `coaching_feedback`.

## Verification Results

- `npm test -- --run tests/unit/gemini-instructions.test.jsx` — 4/4 PASS
- `npm test -- --run tests/unit/coach.test.jsx` — 73/73 PASS
- Full suite `npm test -- --run` — 364/364 PASS (zero regressions)

## Deviations from Plan

None — plan executed exactly as written. The TypeScript cast `(c as Checkin & { weekOf?: string; week_of?: string })` was added inline for the `checkinList.forEach` block to handle the optional date fields cleanly without adding a new interface, which is a minor implementation detail not deviating from the spec.

## Self-Check

- [x] src/lib/instructionSnippets.js exists and exports CITATION_MANDATE_SNIPPET and METHODOLOGY_MANDATE_SNIPPET
- [x] gemini-coach/index.ts includes recentCheckins?: Checkin[] in RequestBody
- [x] Philosophy fetch is before mode branching via Promise.all
- [x] buildDefaultSystemInstruction accepts philosophyAddendum (4th param) and uses it for initial/followup
- [x] adaptation_summary sanitized and returned in plan, plan_revision, long_term_replan response bodies
- [x] 364/364 tests pass
