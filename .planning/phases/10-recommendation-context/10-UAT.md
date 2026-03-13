---
status: diagnosed
phase: 10-recommendation-context
source:
  - 10-01-SUMMARY.md
  - 10-02-SUMMARY.md
started: 2026-03-13T14:15:00+01:00
updated: 2026-03-13T14:25:00+01:00
---

## Current Test

[testing complete]

## Tests

### 1. Selected Week Intent In Ukeplan
expected: Open `Ukeplan` on a non-current selected week coming from `Treningsplan`. The AI setup card should show the same week type, target mileage, and notes that drive generation for that week. When you generate the week, the result should clearly be for that selected week rather than silently falling back to the current week.
result: issue
reported: "The AI week setup is only available for the first week in the four weeks that is presented in Ukeplan. If i change week with next button it skips four weeks and then the week four in the future has the AI week setup feature. Each week should have the possilbity to plan with AI"
severity: major

### 2. Philosophy Guardrail Override Explanation
expected: With a published philosophy document that contains a clear red-line rule, generate a weekly plan in a case where that red line should matter. If the generated week needs to deviate from the selected-week directive, the coaching feedback or adaptation summary should briefly explain the override in normal coaching language rather than silently changing the week.
result: issue
reported: "When i press \"Replace with AI week\" i get a plan but it does not incorporate the guidelines from the block plan. For instance the week i was planning was a taper week with 60 km goal. The plan generated suggested 110 km. See screenshot."
severity: major

## Summary

total: 2
passed: 0
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Each visible week in `Ukeplan` can be planned with AI, not just the first week in the current 4-week window."
  status: failed
  reason: "User reported: The AI week setup is only available for the first week in the four weeks that is presented in Ukeplan. If i change week with next button it skips four weeks and then the week four in the future has the AI week setup feature. Each week should have the possilbity to plan with AI"
  severity: major
  test: 1
  root_cause: "WeeklyPlanPage couples AI setup and generation to the first week of the currently rendered 4-week window instead of the actually selected week, so only visibleWeeks[0] can drive AI planning."
  artifacts:
    - path: "src/pages/WeeklyPlanPage.jsx"
      issue: "AI setup and generation are anchored to the window start rather than a per-week selected planning target"
    - path: "tests/unit/weeklyplan.test.jsx"
      issue: "Missing regression for AI planning from a non-first week inside the 4-week window"
  missing:
    - "Make the selected week the single source of truth for AI setup and generation inputs"
    - "Expose AI planning controls for each visible week or add per-week selection before generation"
    - "Add a regression test for AI generation from a non-first visible week"
  debug_session: ".planning/debug/weeklyplan-ai-setup-selected-week.md"

- truth: "Generated AI week respects the selected block-plan intent, including taper phase and near-target mileage."
  status: failed
  reason: "User reported: When i press \"Replace with AI week\" i get a plan but it does not incorporate the guidelines from the block plan. For instance the week i was planning was a taper week with 60 km goal. The plan generated suggested 110 km. See screenshot."
  severity: major
  test: 2
  root_cause: "The Replace-with-AI flow still allows gemini-coach to optimize from generic training context instead of enforcing the selected week’s taper phase and target mileage as hard plan-generation constraints, so the model can return a 110 km week with no override explanation."
  artifacts:
    - path: "src/pages/WeeklyPlanPage.jsx"
      issue: "Starts generation from the selected UI state but does not guarantee that state is enforced downstream"
    - path: "src/lib/coachPayload.js"
      issue: "Selected-week directive is not treated as a hard constraint for AI replacement behavior"
    - path: "supabase/functions/gemini-coach/index.ts"
      issue: "Prompt contract does not sufficiently enforce taper/target-mileage adherence or require override explanation"
    - path: "tests/unit/weeklyplan.test.jsx"
      issue: "Missing regression that catches taper-week mileage drift during AI replacement"
    - path: "tests/unit/gemini-instructions.test.jsx"
      issue: "Missing assertion that selected week phase and target mileage are enforced as constraints"
    - path: "tests/integration/edge-functions.spec.ts"
      issue: "Missing end-to-end contract check for taper/60 km weeks"
  missing:
    - "Make selected week phase and target mileage required structured inputs to gemini-coach plan generation"
    - "Enforce selected-week adherence and explicit override rationale in the plan prompt"
    - "Add regression coverage for taper/target-mileage adherence through UI, prompt, and integration layers"
  debug_session: ".planning/debug/uat-gap-ai-week-ignores-block.md"
