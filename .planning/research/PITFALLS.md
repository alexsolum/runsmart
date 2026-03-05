# Pitfalls Research (Milestone: Coach Integration)

## Pitfall 1: Philosophy text becomes unstructured prompt bloat
- Warning signs:
  - Prompt size growth causes unstable or generic responses.
  - Coach output drifts from strict response schema.
- Prevention:
  - Store philosophy in structured sections (principles, constraints, examples).
  - Enforce length and format guardrails before persistence.
  - Keep output contracts strict in function validation.
- Phase to address:
  - Phase 1 (philosophy platform), Phase 2 (runtime prompt integration).

## Pitfall 2: Replanning logic becomes opaque to user
- Warning signs:
  - User cannot tell why weekly targets changed.
  - Plan updates feel arbitrary and untrustworthy.
- Prevention:
  - Return explicit “what changed and why” summary with each replan.
  - Surface change rationale in plan UI.
- Phase to address:
  - Phase 2 and Phase 3.

## Pitfall 3: Insights overlays conflict with chart semantics
- Warning signs:
  - Visual clutter on load trend chart.
  - Overlays not tied to real data points/date windows.
- Prevention:
  - Limit overlays to a small set of coach states.
  - Bind overlays to computed intervals already present in domain compute outputs.
- Phase to address:
  - Phase 4.

## Pitfall 4: Admin edit path weakens security boundary
- Warning signs:
  - Non-owner users can mutate philosophy.
  - Direct client writes bypass intended policy.
- Prevention:
  - RLS owner-only policies plus explicit checks in update path.
  - Integration tests for unauthorized updates.
- Phase to address:
  - Phase 1.
