# Phase 11 Research: Constraint-Aware Weekly Plans

## Research Goal

Determine what the Phase 11 planner needs to know to implement:

- `WCON-01` day-specific weekly constraints and preferences
- `WCON-02` clear explanation of conflicts or relaxed preferences
- `WCON-03` protection for manual edits from silent overwrite

This research is grounded in the current `Ukeplan` architecture, not a greenfield redesign.

## Current Architecture Snapshot

The current weekly AI generation path is:

`WeeklyPlanPage.jsx` -> `buildCoachPayload()` -> `supabase/functions/gemini-coach` -> `workoutEntries.applyStructuredPlan()`

Relevant behavior already in place:

- `src/pages/WeeklyPlanPage.jsx`
  - Owns the AI setup card, selected visible week, and generate/replace button.
  - Pulls selected-week intent from training blocks or handoff state.
  - Confirms only once with `window.confirm()` when the selected week already has entries.
  - Immediately writes the returned plan via `applyStructuredPlan()` after Gemini responds.
- `src/lib/coachPayload.js`
  - Already normalizes `recommendationContext`.
  - Already builds `weekDirective` with hard constraints for week type and mileage.
  - Is the cleanest place to add a normalized `weeklyConstraints` contract.
- `supabase/functions/gemini-coach/index.ts`
  - Already has prompt precedence rules.
  - Already injects selected-week directive text into the plan prompt.
  - Already validates mileage drift and can fall back when constraints are violated without explanation.
  - Already returns `coaching_feedback` and `adaptation_summary`, but the weekly page currently ignores both.
- `src/hooks/useWorkoutEntries.js`
  - Central write path for create/update/delete/toggle.
  - `applyStructuredPlan()` currently deletes all entries in the generated date range, then inserts the non-rest days.
  - No provenance, protection, or review semantics exist today.

## Reusable Code Paths

### 1. Weekly setup surface

`WeeklyPlanPage.jsx` already contains the compact inline AI setup UI that Phase 11 should extend. This matches the phase context decision to keep constraint entry inside the existing `Ukeplan` setup card rather than create a new planner screen.

### 2. Payload normalization

`buildCoachPayload()` already translates page state into a normalized AI request. Phase 11 should extend that contract instead of stuffing constraints into free-text notes.

Recommended direction:

- Keep `recommendationContext` for selected week identity and intent.
- Keep `weekDirective` for hard tactical week-level directives.
- Add a separate normalized `weeklyConstraints` object for day-level preferences and restrictions.

### 3. Prompt enforcement and sanitization

`gemini-coach/index.ts` already has the right extension points:

- `normalizeWeekDirective()`
- `buildSelectedWeekDirective()`
- `buildPlanPrompt()`
- `validateAndSanitizePlan()`

Phase 11 should extend these patterns instead of introducing a second prompt builder or a second plan-validation pipeline.

### 4. Existing explanation fields

The edge function already returns:

- `coaching_feedback`
- `adaptation_summary`

Phase 11 can reuse one of these or add a dedicated `constraint_summary`, but the current response contract already supports an explanation block near the AI setup card. The missing piece is frontend rendering, not backend capability.

## Architectural Constraints The Planner Must Respect

## 1. The current write path silently replaces the whole target week

`applyStructuredPlan()` deletes all `workout_entries` between the generated start and end dates, then inserts the new rows. That is incompatible with `WCON-03`.

Implication:

- Phase 11 cannot satisfy manual-edit protection by prompt changes alone.
- It needs a write-path redesign, not just a UI warning.

## 2. Day-level protection cannot be derived reliably from current rows alone

The phase context says:

- any saved add, delete, or change on a day should mark that day as protected

Current schema usage does not expose any persisted signal for:

- AI-generated vs manually edited entries
- whether a day was manually cleared by deleting all entries
- whether a day is protected even if it now has zero rows

Implication:

- Entry-level flags alone are insufficient if the user deletes the last workout on a day.
- The safest design is a persisted day-level protection record, likely a new table keyed by `plan_id + workout_date` or an equivalent week-day metadata model.

Likely minimal schema direction:

- New table such as `workout_entry_day_overrides` or `weekly_plan_day_states`
- Columns: `plan_id`, `user_id`, `workout_date`, `is_protected`, `protection_source`, timestamps

Optional but useful:

- `last_generated_at`
- `last_manual_edit_at`
- `last_generated_summary`

## 3. Review-before-write requires decoupling generation from apply

Today `WeeklyPlanPage` invokes Gemini and immediately calls `applyStructuredPlan()`.

That must change for protected days:

- generate candidate week
- compare candidate against existing protected days
- show review UI
- require explicit override action before writing protected days

Implication:

- Phase 11 likely needs preview state in `WeeklyPlanPage`, not only one-shot generation.
- `applyStructuredPlan()` should accept an explicit overwrite policy instead of assuming full replacement.

## 4. Current server validation only understands mileage/week-level intent

`validateAndSanitizePlan()` currently enforces:

- normalized target dates
- mileage tolerance if the week directive says mileage is enforced

It does not validate:

- long run on preferred day
- hard workout on preferred day
- commute day restrictions
- double-threshold forbidden
- explanation completeness for relaxed day preferences

Implication:

- Prompt changes alone are brittle.
- Phase 11 should add deterministic post-generation validation for day-level rules, similar to the existing mileage enforcement pattern.

## 5. The current page discards explanation output

`WeeklyPlanPage` ignores `coaching_feedback` and `adaptation_summary` from the plan response. `WCON-02` needs the page to display explanation copy near the AI setup card or week header.

Implication:

- The phase is not just backend work.
- UI rendering and state management are required even if the edge function already returns usable text.

## 6. The current language is hardcoded to English in weekly generation

`WeeklyPlanPage` passes `lang: "en"` to `buildCoachPayload()`.

Implication:

- If the weekly page is meant to follow app language, this phase may otherwise ship explanation text in English even when the rest of the UI is localized.
- This is not core to `WCON-01/02/03`, but it is a likely UX gap for explanation output.

## Recommended Constraint Contract

Phase 11 should use an explicit structured payload, not note parsing.

Suggested shape:

```js
weeklyConstraints: {
  preferredLongRunDay: "Sat" | "Sun" | null,
  preferredHardWorkoutDay: "Tue" | "Wed" | "Thu" | null,
  commuteDays: ["Tue", "Thu"],
  doubleThresholdAllowed: true | false | null,
  protectManualDays: true,
}
```

More explicit server-side form:

```js
weeklyConstraints: {
  longRunDayPreference: { day: "Sun", priority: "preferred" },
  hardWorkoutDayPreference: { day: "Tue", priority: "preferred" },
  commuteDays: ["Tue", "Thu"],
  doubleThreshold: { allowed: false },
}
```

Why separate from `weekDirective`:

- `weekDirective` is already the selected-week tactical contract.
- These are scheduling constraints inside that week, not alternative block intent.
- Keeping them separate avoids turning `weekDirective` into a mixed week-intent and day-rule object.

## Recommended Manual-Edit Protection Model

## Preferred approach

Persist day-level protection outside individual workout rows.

Reasoning:

- A day can be protected even with zero workouts after manual deletion.
- Protection should survive reloads and future regenerations.
- Protection should be cheap to query for a 7-day review.

Recommended behavior:

- `createEntry`, `updateEntry`, and `deleteEntry` mark that day as protected.
- `toggleCompleted` should not mark a day protected unless the product explicitly decides completion status is a plan edit. Current context only mentions add/delete/change to the plan, so completion should probably stay unprotected.
- AI generation defaults to preserving protected days.
- A separate explicit full-week override clears/replaces protected days.

## Write-path implications

`useWorkoutEntries.js` likely needs:

- `loadProtectedDays(planId, weekStart, weekEnd)` or equivalent metadata fetch
- `markDayProtected(planId, workoutDate)`
- `applyStructuredPlan(planId, structuredPlan, options)`

Suggested options shape:

```js
{
  preserveProtectedDays: true,
  protectedDates: ["2026-03-17", "2026-03-19"],
  forceOverwriteDates: [],
}
```

This keeps the hook as the source of truth for safe writes instead of scattering overwrite logic in the page component.

## Recommended Explanation Model

`WCON-02` is best served by combining:

- deterministic server-generated explanation requirements
- compact frontend rendering near the AI setup card

Recommended response contract:

```js
{
  coaching_feedback: "...",
  adaptation_summary: "...",
  constraint_summary: "...",
  constraint_decisions: [
    { type: "applied", message: "Long run placed on Sunday as requested." },
    { type: "relaxed", message: "Thursday commute meant the quality session moved to Wednesday." }
  ],
  structured_plan: [...]
}
```

Why add explicit `constraint_summary` or `constraint_decisions`:

- `adaptation_summary` currently talks about load/wellness adaptations, not day-rule tradeoffs.
- The UI decision for Phase 11 is a single short explanation near the setup area, but structured decisions make testing and fallback text easier.

Minimum acceptable shortcut:

- Reuse `adaptation_summary` and tighten the prompt so it must mention day-constraint conflicts.

Better long-term option:

- Keep `adaptation_summary` for training/load logic.
- Add `constraint_summary` for schedule tradeoffs.

## Server-Side Changes Phase 11 Probably Needs

## Prompting

Extend `buildPlanPrompt()` and selected-week directive text with:

- preferred long-run day
- preferred hard-workout day
- commute days
- double-threshold allowed/forbidden
- instruction that preferences are flexible, not absolute
- instruction that conflicts must be explained plainly

## Validation

Extend `validateAndSanitizePlan()` or adjacent helpers to check:

- exactly one long run still exists
- long run lands on preferred day if feasible, otherwise explanation required
- quality session placement respects preferred hard-workout day if feasible
- commute days do not receive high-friction workouts unless explanation exists
- no same-day double quality when `doubleThresholdAllowed` is false

Important constraint:

The current plan schema has one workout object per day. That means "double-threshold allowed" is mostly about whether a day can contain a description implying two quality stimuli, not about representing two separate same-day workouts. The planner should decide whether Phase 11 only forbids double-threshold in placement logic or also needs a richer daily structure later. For this phase, the safer interpretation is:

- if forbidden, prevent descriptions/workout types that imply dual threshold on one day
- if allowed, do not require implementing multi-session day rendering yet

## Fallback behavior

If generated output violates a hard constraint and has no explanation:

- either repair deterministically when safe
- or replace with a fallback plan / reject apply

Because date-placement constraints are more semantic than mileage, deterministic repair may be limited. The planner should expect some rules to be validate-and-reject rather than auto-rewrite.

## Likely Decomposition Into Plans

## Plan 11-01: Constraint UI and payload contract

Scope:

- Extend `WeeklyPlanPage.jsx` AI setup card with compact constraint inputs
- Add normalized `weeklyConstraints` in `buildCoachPayload()`
- Add or update tests around selected-week generation payload

Why first:

- Locks the data contract before backend enforcement and review UX

## Plan 11-02: Edge-function constraint reasoning and explanation output

Scope:

- Extend `gemini-coach` prompt and normalization helpers
- Add day-level validation for generated weekly plans
- Return visible explanation data for applied and relaxed preferences

Why second:

- Makes generation constraint-aware before changing the overwrite flow

## Plan 11-03: Manual-edit protection and protected-day review

Scope:

- Add persisted day-protection model
- Mark days protected on manual create/update/delete
- Change regeneration from immediate apply to review-first when protected days exist
- Add explicit full-week override path

Why separate:

- This is the riskiest part because it touches data model, write semantics, and UI flow

## Plan 11-04: Verification hardening

Scope:

- Add hook-level tests for protected-day write behavior
- Add page tests for review/override UX and visible explanation summary
- Add edge-function tests for constraint prompt/validation/explanation requirements

Why separate:

- Prevents the phase from shipping prompt-only behavior without deterministic safeguards

If the planner wants fewer plans, `11-04` can be merged into the execution of the first three. If the team wants lower risk, keeping it explicit is better.

## Verification Strategy

## 1. Payload/unit tests

Extend `tests/unit/coachPayload.test.js` to verify:

- `weeklyConstraints` normalization from page state
- `weekDirective` remains unchanged for week-level intent
- missing constraints remain optional and do not slow quick generation

## 2. Weekly page component tests

Extend `tests/unit/weeklyplan.test.jsx` to verify:

- constraint inputs render in the AI week setup card
- selected constraint values are passed into `buildCoachPayload()`
- returned explanation summary is rendered near the AI setup/week header
- protected days trigger review UI instead of immediate overwrite
- explicit full-week override proceeds only after user action

## 3. Hook tests for write semantics

There are currently no focused `useWorkoutEntries` tests. Phase 11 should add them.

Critical cases:

- manual create marks day protected
- manual update marks day protected
- manual delete marks day protected even when no rows remain on that day
- `applyStructuredPlan()` preserves protected days by default
- explicit override replaces protected days only when requested

## 4. Edge-function tests

Add targeted tests around `gemini-coach/index.ts` or prompt-mandate smoke tests to verify:

- constraint instructions are present in plan mode
- relaxed preference explanation is mandated
- validation rejects or falls back when mileage/day constraints are violated without explanation

## 5. End-to-end behavior checks

Manual or integration verification should cover:

1. User marks Tuesday manually, regenerates week, and Tuesday is preserved by default.
2. User manually deletes all workouts from Friday, regenerates week, and Friday still counts as protected.
3. User sets Sunday long run + Tuesday hard day + Thursday commute, and the visible explanation mentions any moved session.
4. User chooses explicit full-week override and all protected days are replaced only after that action.

## Risks And Planner Notes

## 1. Schema work is probably unavoidable

Without persisted day-level protection, `WCON-03` will be leaky. In particular, deleted-all-session days cannot be protected reliably.

## 2. Prompt-only constraint handling will be fragile

The current architecture already learned this lesson for mileage enforcement in Phase 10. Phase 11 should follow the same model: prompt guidance plus deterministic validation.

## 3. Review UI can sprawl if not kept compact

The phase context explicitly rejects a heavy planner workspace. The review step should likely be a compact inline summary or modal diff, not a separate route.

## 4. Current 1-entry-per-day structure limits future doubles

Phase 11 should treat double-threshold as an allow/forbid planning rule, not as a mandate to add full multi-session day support. Otherwise the phase scope expands beyond the stated boundary.

## Recommended Planning Stance

The planner should treat Phase 11 as three real implementation problems, not one:

1. Add structured day-level constraints to the existing weekly generation contract.
2. Make the AI response visibly explain tradeoffs in normal coaching language.
3. Redesign the write path so manual day edits are persisted as protected state and regeneration becomes review-first instead of silent replacement.

The key planning insight is that `WCON-03` is the architectural anchor. If the phase only adds constraint inputs and explanation text, the user can still lose manual edits through the existing delete-and-insert flow, and the phase will miss its most important safety requirement.
