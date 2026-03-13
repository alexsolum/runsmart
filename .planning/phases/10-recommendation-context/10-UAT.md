---
status: resolved
phase: 10-recommendation-context
source:
  - 10-01-SUMMARY.md
  - 10-02-SUMMARY.md
started: 2026-03-13T14:15:00+01:00
updated: 2026-03-13T16:35:00+01:00
---

## Current Test

[testing complete]

## Tests

### 1. Selected Week Intent In Ukeplan
expected: Open `Ukeplan` on a non-current selected week coming from `Treningsplan`. The AI setup card should show the same week type, target mileage, and notes that drive generation for that week. When you generate the week, the result should clearly be for that selected week rather than silently falling back to the current week.
result: resolved
reported: "Resolved by plan 10-03: `Ukeplan` now exposes AI week planning for any visible week in the current 4-week window."
severity: major

### 2. Philosophy Guardrail Override Explanation
expected: With a published philosophy document that contains a clear red-line rule, generate a weekly plan in a case where that red line should matter. If the generated week needs to deviate from the selected-week directive, the coaching feedback or adaptation summary should briefly explain the override in normal coaching language rather than silently changing the week.
result: resolved
reported: "Resolved by plan 10-04: selected-week taper and target mileage now ship as enforceable directives with override-language requirements."
severity: major

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Each visible week in `Ukeplan` can be planned with AI, not just the first week in the current 4-week window."
  status: resolved
  reason: "Plan 10-03 added an explicit selected AI week inside the visible window and regression coverage for non-first visible week generation."
  severity: major
  test: 1
  root_cause: "WeeklyPlanPage had coupled AI setup and generation to the first week of the currently rendered 4-week window instead of the actually selected week."
  artifacts:
    - path: "src/pages/WeeklyPlanPage.jsx"
      issue: "Resolved: AI setup and generation now follow a per-week selected planning target"
    - path: "tests/unit/weeklyplan.test.jsx"
      issue: "Resolved: regression now covers AI planning from a non-first week inside the 4-week window"
  missing:
    - "None"

- truth: "Generated AI week respects the selected block-plan intent, including taper phase and near-target mileage."
  status: resolved
  reason: "Plan 10-04 promoted selected-week intent into `weekDirective` constraints and added server-side enforcement plus contract coverage for taper/target-mileage adherence."
  severity: major
  test: 2
  root_cause: "The Replace-with-AI flow had allowed `gemini-coach` to optimize from generic training context instead of enforcing the selected week’s taper phase and target mileage as hard plan-generation constraints."
  artifacts:
    - path: "src/lib/coachPayload.js"
      issue: "Resolved: selected-week directive now includes explicit hard-constraint metadata for AI replacement behavior"
    - path: "supabase/functions/gemini-coach/index.ts"
      issue: "Resolved: prompt contract and sanitization now enforce taper/target-mileage adherence or require override explanation"
    - path: "tests/unit/coachPayload.test.js"
      issue: "Resolved: payload contract coverage now asserts explicit week-directive fields"
    - path: "tests/unit/gemini-instructions.test.jsx"
      issue: "Resolved: assertions now cover hard selected-week constraints and override rationale"
    - path: "tests/integration/edge-functions.spec.ts"
      issue: "Resolved: integration contract now checks taper-week mileage adherence or explained override behavior"
  missing:
    - "None"
