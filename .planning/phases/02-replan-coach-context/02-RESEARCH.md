# Phase 2: Replan Coach Context - Research

**Phase:** 2  
**Goal:** Make manual replanning use active philosophy + latest training context for long-term and weekly plan outputs.  
**Requirements:** RPLN-01, RPLN-02, PHIL-03  
**Date:** 2026-03-05

## Objective Framing

Phase 2 should not add autonomous replanning. It should add a user-triggered replanning path in the long-term planning flow and ensure that replanning calls are context-rich and philosophy-aware.

For planning this phase well, the key question is not "can we call `gemini-coach`?" (already true). The key question is "where do we place a manual replan trigger and what exact contract must be stable so downstream weekly UI can consume output safely?"

## Current System Findings

### 1) No manual replan trigger in long-term planning flow yet
- `src/pages/LongTermPlanPage.jsx` currently supports plan CRUD and block CRUD only.
- There is no action that invokes `gemini-coach` from this page.
- This is the direct gap for RPLN-01 success criterion #1.

### 2) Replanning-related payload builder exists, but only inside Coach page
- `src/pages/CoachPage.jsx` has `buildBasePayload` used by modes `initial`, `followup`, `plan`, `plan_revision`.
- Current payload includes:
  - `weeklySummary`, `recentActivities`
  - `latestCheckin`
  - `planContext`
  - `dailyLogs`
  - `runnerProfile`
- This is a usable foundation, but it is page-local and not reusable from Long Term Plan flow.

### 3) "Latest context" is partially fresh, partially stale
- `dailyLogs` is refreshed via `dailyLogs.loadLogs()` inside payload builder.
- `activities` and `checkins` are not explicitly refreshed before each call.
- `activities` are loaded app-wide once (`src/App.jsx`) and can become stale relative to latest ingestion.
- `checkins` are also loaded app-wide once and then read from in-memory slice.
- This is the direct risk against RPLN-02.

### 4) Check-in shape mismatch currently weakens context quality
- `useCheckins` returns DB rows with snake_case fields (e.g. `sleep_quality`).
- `gemini-coach` `RequestBody.Checkin` currently expects `sleepQuality` (camelCase) and prompt text reads `c.sleepQuality`.
- In practice, latest check-in can be present but partially ignored in prompt rendering.
- Phase 2 should normalize this as part of context quality hardening.

### 5) `gemini-coach` runtime philosophy source is static + playbook entries, not active philosophy document
- `supabase/functions/gemini-coach/index.ts` builds system instruction from:
  - hardcoded `COACHING_PLAYBOOK` (`playbook.ts`)
  - dynamic `coach_playbook_entries`
- Phase 1 introduced `coach_philosophy_documents` with publish workflow, but this active document is not yet consumed at runtime.
- This is the direct PHIL-03 gap.

### 6) Structured weekly output contract already exists and is sanitised
- Plan modes return `{ coaching_feedback, structured_plan }`.
- `validateAndSanitizePlan` enforces workout type whitelist, number coercion, truncation, max 7 rows.
- `CoachPage` and `WeeklyPlanPage` already consume this shape.
- For Phase 2, this should remain the canonical downstream-safe contract.

## Requirement Mapping to Concrete Work

### RPLN-01 (manual long-term replanning trigger)
- Add explicit `Replan` UI control in `src/pages/LongTermPlanPage.jsx`.
- Trigger should call `gemini-coach` in plan-generation mode (or dedicated replan mode) using the selected plan context.
- On success, present structured weekly output and offer commit action to persist into `workout_entries` (same persistence pattern used in Coach plan tab).

### RPLN-02 (latest activities/daily logs/check-ins in payload)
- Extract shared payload construction into a reusable module (recommended: `src/lib/coachPayload.js`).
- Make payload builder actively refresh all three context domains before call:
  - `activities.loadActivities(...)`
  - `dailyLogs.loadLogs()`
  - `checkins.loadCheckins()`
- Normalize `latestCheckin` fields to the shape expected by edge function prompt code.

### PHIL-03 (`gemini-coach` applies active philosophy at runtime)
- In `supabase/functions/gemini-coach/index.ts`, fetch active philosophy document (`scope=global`, `status='published'`) each request.
- Convert published philosophy fields into a compact runtime addendum injected into `buildSystemInstruction` for `plan` and `plan_revision` modes first.
- Preserve precedence order:
  - output schema contract
  - safety/progression guardrails
  - active philosophy
  - static playbook fallback

## Planning Decisions To Lock Before Implementation

1. **Mode contract decision:**
Use existing `mode: "plan"` for manual replan, or introduce `mode: "replan"`.
- Lowest-risk choice for this codebase: keep `plan`/`plan_revision` and add a `trigger_source` marker for analytics/audit.

2. **Persistence behavior decision:**
Should manual replan auto-write workouts, or stage preview then confirm?
- Recommended: preview + explicit "Apply replan" confirmation to avoid accidental overwrite.

3. **Overwrite policy decision:**
When applying replan, which date range is replaced?
- Recommended: next Monday to plan horizon boundary for selected scope, with explicit confirmation text.

4. **Horizon decision for "long-term + weekly outputs":**
Current downstream contract supports 7-day structured plan. Long-term flow still needs a tactical weekly data output.
- Recommended for Phase 2 scope: keep weekly structured output as required artifact, and avoid introducing a new long-horizon schema in this phase.

## Recommended Implementation Shape (Codebase-Specific)

### Frontend
- `src/pages/LongTermPlanPage.jsx`
  - Add replan action UI and result panel.
  - Reuse weekly structured-plan rendering pattern from `CoachPage` where practical.
- `src/pages/CoachPage.jsx`
  - Replace local payload builder with shared helper.
- `src/lib/coachPayload.js` (new)
  - Build normalized payload from app data slices.
  - Force-refresh latest activities/logs/check-ins before request.
  - Return deterministic payload for all coach modes.
- `src/context/AppDataContext.jsx`
  - No structural change required if helper takes existing slices.

### Edge Function
- `supabase/functions/gemini-coach/index.ts`
  - Add `fetchActivePhilosophyDocument(...)` helper.
  - Add `buildPhilosophyAddendum(...)` mapper from published document to prompt text.
  - Inject addendum into plan/revision mode system instruction.
  - Make check-in handling tolerant to both `sleep_quality` and `sleepQuality` for backward compatibility.

### Tests
- `tests/unit/trainingplan.test.jsx`
  - Add coverage for replan trigger presence and interaction state.
- `tests/unit/coach.test.jsx`
  - Add assertions that shared payload includes latest activities/check-ins/logs.
- `tests/integration/edge-functions.spec.ts`
  - Add/extend contract test for plan mode response shape (`structured_plan` array with valid day schema).
- Optional targeted edge unit test (if adding edge test harness) for philosophy injection behavior when published document exists vs absent.

## Key Pitfalls and Mitigations

- **Pitfall:** stale activities/check-ins produce low-quality replans.
  - **Mitigation:** force-refresh all required slices before payload build.

- **Pitfall:** check-in field naming mismatch silently drops sleep signal.
  - **Mitigation:** normalize payload in shared builder and add defensive parsing in edge function.

- **Pitfall:** active philosophy overpowers schema/safety instructions.
  - **Mitigation:** keep instruction precedence explicit and stable in `buildSystemInstruction`.

- **Pitfall:** UI expects 7 valid days; model occasionally returns malformed rows.
  - **Mitigation:** keep `validateAndSanitizePlan` as hard gate and reject empty/invalid output client-side.

## Validation Architecture

### Contract Layers
- **Layer 1: UI trigger contract (RPLN-01)**
  - Long-term page exposes manual replan action only when a plan is selected.
- **Layer 2: Payload freshness contract (RPLN-02)**
  - Replan invocation contains non-stale `recentActivities`, `dailyLogs`, `latestCheckin` after explicit reload calls.
- **Layer 3: Runtime philosophy contract (PHIL-03)**
  - Plan/revision system instruction includes active published philosophy content when available.
- **Layer 4: Downstream schema contract**
  - Response always conforms to weekly plan structure consumable by weekly UI.

### Suggested Verification Matrix
- Unit: Long-term page renders and executes replan action.
- Unit: Shared payload builder normalizes check-in fields and includes refreshed context.
- Unit/integration: `gemini-coach` plan mode with active philosophy yields valid parsed response shape.
- Integration: End-to-end replan flow can persist plan rows into `workout_entries` without schema errors.

## What You Need To Know Before Writing Phase 2 PLAN files

- The biggest architectural win is introducing a shared, normalized coach payload builder used by both Coach and Long Term Plan flows.
- PHIL-03 is not solved by existing `coach_playbook_entries`; Phase 2 must wire `coach_philosophy_documents` published content into `gemini-coach` runtime for plan/revision.
- To satisfy RPLN-02 reliably, "latest" must mean explicit refresh at invocation time, not just relying on app bootstrap state.
- Do not introduce a new long-horizon response schema in this phase; preserve existing weekly structured-plan contract and focus on trigger + context + philosophy integration quality.

## RESEARCH COMPLETE
