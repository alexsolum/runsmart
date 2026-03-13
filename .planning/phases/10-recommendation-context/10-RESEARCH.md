# Phase 10 Research: Recommendation Context

## Goal

Implement weekly recommendation context so `Ukeplan` generation follows the selected week's intent from `Treningsplan` and the active admin coaching philosophy already stored in `coach_philosophy_documents`.

This phase should close the context contract gap, not add a new AI surface or a new admin flow.

## Current State

- `LongTermPlanPage.jsx` already builds a week handoff object with `planId`, `weekStart`, `weekEnd`, `phase`, `targetKm`, and `notes`, then stores it in `WEEKLY_PLAN_HANDOFF_KEY`.
- `WeeklyPlanPage.jsx` already reads that handoff and shows it in the AI setup card, but generation still calls `buildCoachPayload()` with only broad `planContext`.
- `src/lib/coachPayload.js` currently builds `planContext` from the block covering `today`, not the specifically focused week.
- `gemini-coach/index.ts` already fetches the active published philosophy document from `coach_philosophy_documents` and injects it into plan-mode system instructions.
- `buildPlanPrompt()` still hardcodes "Generate the 7-day plan starting from Monday ${nextMonday}" and only targets `planContext.targetMileage`, so selected-week intent is not a first-class contract yet.

## What Phase 10 Must Add

### WREC-01 / WREC-02

Weekly recommendation payload needs an explicit selected-week object, separate from generic `planContext`.

Recommended shape:

```js
recommendationContext: {
  weekStart: "YYYY-MM-DD",
  weekEnd: "YYYY-MM-DD",
  trainingType: "Base" | "Build" | "Peak" | "Taper" | "Recovery" | null,
  targetMileageKm: number | null,
  notes: string | null
}
```

Reason:

- `planContext` is still useful for race horizon, overall phase timing, and recent progression.
- `recommendationContext` should be the authoritative week-specific planning contract.
- This avoids overloading `planContext` with dual meanings and makes tests clearer.

### WREC-03 / WREC-04

Do not add a new frontend fetch for philosophy.

Reuse the existing server-side path:

- `fetchActivePhilosophyDocument()`
- `buildActivePhilosophyAddendum()`
- `buildReplanSystemInstruction()`

What needs to change is instruction structure, not data source:

- selected week intent should outrank philosophy preference
- philosophy red lines should still outrank selected intent when safety/guardrail language requires it
- philosophy principles and dos/donts should shape workout choices and rationale, not be quoted back to the user

## Recommended Architecture

### 1. Frontend payload contract

Extend `buildCoachPayload()` to accept an optional focused week input:

```js
buildCoachPayload({
  ...,
  recommendationWeek: {
    weekStart,
    weekEnd,
    trainingType,
    targetMileageKm,
    notes,
  }
})
```

Then return both:

- `planContext`: broader active-plan context
- `recommendationContext`: selected-week directive

Do not compute selected-week context inside the edge function. The page already knows the focused week and the handoff precedence.

### 2. WeeklyPlan ownership

`WeeklyPlanPage.jsx` should be the single place that resolves which week intent is authoritative:

- if handoff matches current `selectedPlanId` + `planningStartDate`, use handoff values
- otherwise derive from `getWeekIntent(trainingBlocks.blocks, selectedPlanId, planningStartDate)`
- pass the exact displayed values into `buildCoachPayload()`

This keeps the setup card and AI payload aligned.

### 3. Edge-function prompt contract

Extend `RequestBody` in `gemini-coach/index.ts` with:

```ts
recommendationContext?: {
  weekStart: string;
  weekEnd: string;
  trainingType: string | null;
  targetMileageKm: number | null;
  notes: string | null;
};
targetWeekStart?: string;
targetWeekEnd?: string;
```

Then change `buildPlanPrompt()` so it uses `recommendationContext` first and falls back safely:

- planning week comes from `recommendationContext.weekStart/weekEnd` or request `targetWeekStart/targetWeekEnd`
- weekly type comes from `recommendationContext.trainingType`
- weekly mileage comes from `recommendationContext.targetMileageKm`
- notes are included as direct coaching context

The prompt should explicitly state:

- selected week training type is the primary planning directive
- target mileage is a strong target, not a blind requirement
- philosophy may shape execution and rationale
- explicit philosophy red lines may force an override
- when override is necessary, preserve week type before exact mileage

### 4. Philosophy precedence

Current system precedence in `buildReplanSystemInstruction()` is close, but phase 10 needs one more layer inside plan-mode instructions:

1. output schema
2. safety/progression guardrails
3. selected-week directive (`recommendationContext`)
4. active published philosophy
5. runtime playbook
6. static fallback

Without this, Gemini can continue treating philosophy as more concrete than the selected week.

## Reusable Code Paths

- `src/pages/LongTermPlanPage.jsx`
  Already creates the handoff shape that phase 10 needs.
- `src/pages/WeeklyPlanPage.jsx`
  Already resolves display intent and owns generation.
- `src/lib/coachPayload.js`
  Best place to normalize and return a reusable `recommendationContext`.
- `supabase/functions/gemini-coach/index.ts`
  Already owns secure philosophy fetch and prompt assembly.
- `tests/unit/weeklyplan.test.jsx`
  Already covers handoff rendering and invocation shape.
- `tests/integration/edge-functions.spec.ts`
  Already has plan-mode contract coverage with published/unpublished philosophy.

## Likely Integration Points

### Slice 1: Payload plumbing

- Update `buildCoachPayload()` to accept focused week intent.
- Update `WeeklyPlanPage.jsx` to pass displayed week intent into `buildCoachPayload()`.
- Keep `targetWeekStart/targetWeekEnd` in the function invoke body for compatibility, but stop relying on them alone.

### Slice 2: Prompt update

- Add `recommendationContext` to `RequestBody`.
- Update `buildPrompt()` and `buildPlanPrompt()` to print selected-week context explicitly.
- Replace `getNextMonday()` usage in plan mode with request week dates.

### Slice 3: Precedence and rationale

- Update plan-mode system instruction text so selected week intent outranks philosophy preferences.
- Add explicit instruction that philosophy `donts` act as red-line guardrails.
- Require `coaching_feedback` to mention when the week intent was adjusted by a red line.

### Slice 4: Test expansion

- unit: payload includes selected-week context
- unit: `WeeklyPlanPage` passes displayed week intent into `buildCoachPayload()`
- unit: plan invoke body includes the selected week dates and prompt-driving context
- integration: plan payload with `recommendationContext` still returns valid structured contract

## Risks

### 1. Dual source of truth for week intent

Risk:
`displayWeekIntent` in `WeeklyPlanPage.jsx` and `getWeekIntent()` in `coachPayload.js` can diverge.

Recommendation:
Resolve week intent once in `WeeklyPlanPage.jsx` and pass the resolved object into `buildCoachPayload()`. Do not let `coachPayload.js` silently re-derive it from "today".

### 2. Wrong week generation

Risk:
`buildPlanPrompt()` currently anchors output to "next Monday", which can ignore the actually selected week.

Recommendation:
Use request week dates directly and add a unit/integration assertion for non-current weeks.

### 3. Philosophy overwhelms tactical intent

Risk:
If prompt wording stays generic, the model may optimize around philosophy prose instead of the selected week type and mileage.

Recommendation:
Make selected-week directive explicit and ordered above philosophy in plan-mode instructions.

### 4. Hidden override behavior

Risk:
If philosophy red lines force a change, users may see a week that no longer matches setup context without explanation.

Recommendation:
Require a brief rationale in `coaching_feedback` whenever mileage or session structure materially deviates from the selected-week directive.

## Recommended Implementation Slices

### Slice A: Contract foundation

- Add `recommendationContext` payload support in `src/lib/coachPayload.js`
- Pass resolved display week intent from `WeeklyPlanPage.jsx`
- Add targeted unit tests around payload shape

### Slice B: Edge prompt alignment

- Extend `RequestBody`
- Update `buildPlanPrompt()` to use selected-week dates, type, mileage, and notes
- Remove hardcoded next-Monday behavior for plan mode

### Slice C: Philosophy precedence

- Tighten `buildReplanSystemInstruction()` wording for selected-week vs philosophy precedence
- Make `donts`/red lines explicit guardrails
- Add regression tests that inspect instruction source text

### Slice D: End-to-end contract confidence

- Expand `weeklyplan.test.jsx` to assert `buildCoachPayload()` receives focused week intent
- Expand edge-function integration payload builder to include `recommendationContext`
- Verify returned plan still sanitizes to 7-day structure

## Validation Architecture

### Unit validation

- `tests/unit/weeklyplan.test.jsx`
  Assert `WeeklyPlanPage` passes the resolved displayed week intent into `buildCoachPayload()`.
- New or expanded payload test
  Assert `buildCoachPayload()` returns `recommendationContext` with `weekStart`, `weekEnd`, `trainingType`, `targetMileageKm`, and `notes`.
- `tests/unit/gemini-instructions.test.jsx`
  Add assertions that plan-mode instruction source includes:
  - selected week directive precedence
  - philosophy red-line / do-not language
  - override rationale requirement

### Integration validation

- `tests/integration/edge-functions.spec.ts`
  Extend `buildPlanModePayload()` with `recommendationContext`.
- Add at least one payload using a non-current target week to prevent regression to `getNextMonday()`.
- Keep existing published/unpublished philosophy coverage; both should still satisfy structured plan contract.

### Behavioral acceptance checks

- A Build week handoff with 64 km target produces a week clearly anchored to Build characteristics and near 64 km.
- A published philosophy with restrictive `donts` can reshape session details or volume, but only with visible coaching rationale.
- When no published philosophy exists, week-specific context still works via fallback playbook.

## Planning Notes

- No schema migration is required for phase 10.
- No new frontend admin UI is required.
- The highest-value change is to separate selected-week recommendation context from generic active-plan context.
- The main regression target is plan-mode prompt anchoring, not UI rendering.

## RESEARCH COMPLETE

Phase 10 should be planned as a contract-tightening change across `WeeklyPlanPage`, `coachPayload`, and `gemini-coach`: add an explicit `recommendationContext`, make plan prompts use the selected week instead of "next Monday", and formalize precedence so selected-week intent drives the week while published philosophy shapes execution and red-line overrides.
