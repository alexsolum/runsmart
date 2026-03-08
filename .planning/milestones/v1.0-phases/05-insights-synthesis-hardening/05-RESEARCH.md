# Phase 05: Insights Synthesis Hardening - Research

**Researched:** 2026-03-07
**Requirement:** INSG-02
**Goal:** Eliminate JSON wrapper leakage and enforce rich sectioned plain-text synthesis over a 10-12 week context window.
**Confidence:** High (repo-derived)

## Standard Stack

Use only the existing project stack and extension points:

- `supabase/functions/gemini-coach/index.ts`
  - Keep `mode === "insights_synthesis"` in the edge function.
  - Change contract to plain text synthesis (not JSON object output contract from model).
  - Add strict sanitization + validation before returning `synthesis`.
- `src/lib/coachPayload.js`
  - Expand payload window builders from 4 weeks to configurable 10-12 weeks for synthesis use.
  - Keep existing shape (`weeklySummary`, `recentActivities`, `dailyLogs`, etc.), but increase time horizon and add deterministic ordering.
- `src/pages/InsightsPage.jsx`
  - Keep current one-call effect flow (`useRef` guard + skeleton + silent omission on error).
  - Add UI-side final sanitization to guarantee wrapper text never reaches DOM.
- `tests/unit/insights.test.jsx`
  - Expand from rendering/error/loading checks to regression coverage for malformed wrappers and section richness assertions.

## Architecture Patterns

1. Contract hardening: model returns plain text, API returns validated plain text.
- In `insights_synthesis`, instruct Gemini to output plain text only with fixed section headings.
- Do not require JSON object output from the model for this mode.
- Edge function returns `{ synthesis: string }` only after sanitizing and validating required sections.

2. Defense in depth sanitization.
- Layer 1 (edge): normalize model output, remove markdown fences, unwrap simple JSON wrappers if present, strip keys like `"synthesis":`, reject leaked braces/quotes wrappers, then validate headings.
- Layer 2 (UI): lightweight `sanitizeSynthesisText(...)` in `InsightsPage.jsx` before `setSynthesis` as a final guard.

3. Context-window expansion by mode-aware payload assembly.
- `buildCoachPayload` should support synthesis-specific horizon (10-12 weeks) while preserving existing shorter windows for other coach modes.
- Keep week summaries chronologically ascending and bounded to last N full/partial weeks.
- Keep daily logs and recent activities long enough to support sectioned interpretation, not just 7-day snapshots.

4. Explicit section contract.
- Required sections in final text:
  - `Mileage Trend`
  - `Intensity Distribution`
  - `Long-Run Progression`
  - `Race Readiness`
- Each section must contain at least one concrete data-backed statement.
- Enforce minimum richness (length and section count) server-side.

## Don't Hand-Roll

- Do not add a new endpoint/function; harden existing `gemini-coach` mode.
- Do not bypass `buildCoachPayload`; extend it.
- Do not rely on regex-only cleanup in one place; implement shared sanitizer helper logic in edge + minimal UI guard.
- Do not move synthesis logic into client-side AI calls; keep AI calls in Supabase Edge Function.
- Do not introduce separate state manager/cache for this phase; current `useRef`+state behavior is sufficient.

## Common Pitfalls

- Keeping the old JSON-output prompt (`{ "synthesis": "..." }`) causes wrapper leakage risk to persist.
- Expanding `weeklySummary` to 10-12 weeks but leaving `recentActivities`/`dailyLogs` at 7 days produces shallow sections.
- Accepting parse-fail fallback as raw text in edge function reintroduces UAT failure.
- Testing only happy-path synthesis misses malformed wrappers (`{"synthesis":"..."`, fenced JSON, key-value prefix text).
- Rendering unvalidated text directly in `InsightsPage` allows regressions from backend drift.

## Code Examples

```ts
// supabase/functions/gemini-coach/index.ts (pattern)
const INSIGHTS_SYNTHESIS_INSTRUCTION = [
  "You are Marius AI Bakken, an expert endurance running coach.",
  "Write plain text only (no JSON, no markdown).",
  "Use exactly these headings: Mileage Trend, Intensity Distribution, Long-Run Progression, Race Readiness.",
  "Base interpretation on last 10-12 weeks of training context.",
  "Each section: 2-3 concise sentences with concrete training interpretation and one practical recommendation.",
].join(" ");

function sanitizeSynthesisResponse(raw: string): string {
  const cleaned = stripMarkdownFences(raw).trim();
  // unwrap trivial JSON wrappers if model still returns them
  try {
    const parsed = JSON.parse(cleaned);
    const candidate = typeof parsed?.synthesis === "string" ? parsed.synthesis : "";
    if (candidate) return candidate.trim();
  } catch {
    // continue with plain text path
  }
  return cleaned
    .replace(/^\s*\{\s*"?synthesis"?\s*:\s*/i, "")
    .replace(/\}\s*$/, "")
    .replace(/^"|"$/g, "")
    .trim();
}
```

```js
// src/lib/coachPayload.js (pattern)
function buildWeeklySummaries(activities, weeks = 4) {
  // same logic as today, but parameterized and bounded (e.g. weeks=12 for synthesis)
}

function getRecentActivities(activities, days = 7) {
  // synthesis path should request a longer horizon (e.g. 70-84 days)
}

function getRecentDailyLogs(logs, days = 7) {
  // synthesis path should request a longer horizon aligned with the section contract
}
```

```jsx
// src/pages/InsightsPage.jsx (pattern)
const safe = sanitizeSynthesisText(data?.synthesis);
if (!error && safe) setSynthesis(safe);
```

## Planning Notes

Implementation plan for INSG-02 hardening:

1. Edge contract hardening (`supabase/functions/gemini-coach/index.ts`)
- Replace JSON-object synthesis instruction with strict plain-text sectioned contract.
- Add `sanitizeSynthesisResponse` + `validateSynthesisSections` helpers.
- If sections are missing after sanitization, return fallback sectioned synthesis template populated from available metrics.

2. Payload horizon expansion (`src/lib/coachPayload.js`)
- Parameterize windows (`weeks`, `days`) and use synthesis-specific defaults for 10-12 weeks.
- Ensure deterministic sort and bounded arrays so prompt remains stable.

3. UI guard (`src/pages/InsightsPage.jsx`)
- Add final sanitizer before rendering.
- Keep current UX behavior: skeleton during load, silent omit on failure, single fetch guarded by ref.

4. Test hardening (`tests/unit/insights.test.jsx` + new edge tests if present in repo conventions)
- Add assertions that callout never contains wrapper artifacts (`{"synthesis"`, raw braces prefix, fenced JSON markers).
- Add assertions that successful synthesis contains all required headings.
- Add regression cases for malformed model outputs transformed into safe plain text.
- Add payload-window unit assertions (10-12 week summary coverage).

Acceptance strategy (phase gate):

- AC1 Wrapper safety: No rendered synthesis may include JSON wrapper leakage patterns.
- AC2 Section contract: Rendered synthesis must include all four required headings.
- AC3 Context depth: Synthesis prompt input uses 10-12 weeks of data (not 4 weeks).
- AC4 Regression safety: Unit tests fail if contract, sanitizer, or window logic regresses.

Recommended test commands:

- `npm test -- --run tests/unit/insights.test.jsx`
- `npm test -- --run` (full phase gate)

Out of scope for this phase:

- Multi-comment synthesis feed
- New analytics UI surface redesign
- Any non-INSG-02 feature work
