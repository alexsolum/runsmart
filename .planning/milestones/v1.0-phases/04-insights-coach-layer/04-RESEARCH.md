# Phase 4: Insights Coach Layer - Research

**Researched:** 2026-03-06
**Domain:** React frontend analytics integration + Supabase Edge Function extension
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Training Load Trend overlay (INSG-01)**
- Presentation: Text callout block below the ComposedChart — no modifications to the chart itself
- Data source: Computed TSB thresholds from `compute.js` only — no Gemini call. Deterministic, instant, zero API cost
- States (4):
  - Good Form: TSB > 10
  - Neutral: TSB -5 to 10
  - Accumulating Fatigue: TSB -15 to -5
  - Overreaching Risk: TSB < -15
- State content: Current state (latest TSB) plus trend qualifier (Improving / Declining / Stable) based on TSB direction over last 2 weeks

**Insights synthesis comment (INSG-02)**
- Trigger: Auto on InsightsPage mount — calls `gemini-coach` once, cached in component state (no re-call on re-renders or back navigation)
- Placement: Top of Insights page, full-width, above KPI cards
- Format: Compact paragraph callout (2-4 sentences) in a left-border accent card — same design language as `adaptation_summary` callout from Phase 3
- Edge function mode: New `insights_synthesis` mode returning `{ synthesis: string }`

**Loading and error states**
- While loading: show `SkeletonBlock` placeholder in callout position
- If call fails or no activities: omit callout entirely (conditional render, no error shown)
- Overlay state callout is always computed client-side — no loading state needed

### Claude's Discretion
- Exact coach-voice text for the 4 overlay states and trend qualifiers
- Synthesis prompt wording and token budget for the new mode
- CSS class naming for the synthesis callout (follow Phase 3 pattern)
- Whether to session-cache or local-state-cache the synthesis result

### Deferred Ideas (OUT OF SCOPE)
- None surfaced
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INSG-01 | Training Load Trend chart shows coach overlay signals tied to current load/fatigue interpretation | `computeTrainingLoad()` returns `{ date, atl, ctl, tsb }` series. TSB threshold logic already exists in `generateCoachingInsights()`. New `computeTrainingLoadState()` function in `compute.js` classifies state and trend deterministically. |
| INSG-02 | Insights page shows one overall coach synthesis comment based on available training data | `gemini-coach` edge function supports multiple modes via `body.mode`. New `insights_synthesis` mode follows the same `buildDefaultSystemInstruction` + `buildPrompt` pattern as `initial` mode. Frontend calls via `client.functions.invoke`. |
</phase_requirements>

---

## Summary

Phase 4 is an additive integration layer — both deliverables attach to the existing `InsightsPage.jsx` without modifying the ComposedChart or any other page. All required primitives exist: `computeTrainingLoad()` already produces the TSB series, the edge function already dispatches on `mode`, `buildCoachPayload` is ready to call, and the CSS callout pattern (`.coach-adaptation-note`) was established in Phase 3.

The overlay (INSG-01) is purely deterministic: a new `computeTrainingLoadState(series)` pure function in `compute.js` reads the last entry's TSB, computes a 2-week direction, and returns a `{ state, trendLabel, message }` object. No API involved. The synthesis callout (INSG-02) requires one new edge function mode (`insights_synthesis`) that returns `{ synthesis: string }`, and frontend state management using `useState` + `useEffect` with an already-fetched flag to prevent re-calls.

**Primary recommendation:** Implement in two self-contained tasks: (1) add `computeTrainingLoadState` to `compute.js` and wire the overlay callout into `InsightsPage`, (2) add `insights_synthesis` mode to the edge function and wire the synthesis callout into `InsightsPage` with session-duration caching via a `useRef` flag.

---

## Standard Stack

### Core (all already present in project)
| Library / Module | Version | Purpose | Notes |
|------------------|---------|---------|-------|
| `src/domain/compute.js` | project | Pure TSB classification + trend logic | Add `computeTrainingLoadState` here |
| `src/pages/InsightsPage.jsx` | project | Integration point for both callouts | Add overlay + synthesis sections |
| `supabase/functions/gemini-coach/index.ts` | Deno | Edge function to extend with `insights_synthesis` mode | Follows existing mode-dispatch pattern |
| `src/lib/coachPayload.js` | project | `buildCoachPayload()` — assembles Gemini request body | Call directly from InsightsPage effect |
| `src/lib/supabaseClient.js` | project | Supabase JS client singleton | `client.functions.invoke("gemini-coach", { body })` |
| `src/lib/instructionSnippets.js` | project | Frontend-mirrored instruction constants for test assertions | Add `INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET` |

### Supporting (reuse without modification)
| Asset | Purpose | Notes |
|-------|---------|-------|
| `SkeletonBlock` component (InsightsPage.jsx line 56) | Loading placeholder for synthesis callout | Already exported as inner component |
| `.coach-adaptation-note` CSS class (index.css line 1386) | Left-border accent callout styling | Use verbatim; add `.insights-coach-synthesis` following same pattern |
| `.ltp-adaptation-note` CSS class (index.css line 1405) | Reference for naming convention | Phase 3 established the `{scope}-{type}-note` pattern |
| `SAMPLE_ACTIVITIES` / `makeAppData()` (tests/unit/mockAppData.js) | Test data | No changes needed for overlay tests |

---

## Architecture Patterns

### Recommended File Changes
```
src/domain/compute.js               # Add computeTrainingLoadState() + export
src/pages/InsightsPage.jsx          # Wire overlay callout + synthesis callout
src/styles/index.css                # Add .insights-coach-synthesis CSS class
src/lib/instructionSnippets.js      # Add INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET
supabase/functions/gemini-coach/
  index.ts                          # Add insights_synthesis mode handler
tests/unit/
  insights.test.jsx                 # Add overlay + synthesis tests
  gemini-instructions.test.jsx      # Add insights_synthesis instruction test
```

### Pattern 1: Deterministic State Classification (INSG-01)

**What:** Pure function in `compute.js` — takes the full TSB series, returns state label, trend label, and coach-voice message string.

**When to use:** Called via `useMemo` in `InsightsPage` from the already-computed `trainingLoadSeries`.

```javascript
// compute.js — add after computeTrainingLoad()
function computeTrainingLoadState(series) {
  if (!series || series.length < 2) return null;

  const latest = series[series.length - 1];
  const tsb = latest.tsb;

  // State classification — matches existing generateCoachingInsights() thresholds
  let state, stateLabel;
  if (tsb > 10)       { state = "good_form";          stateLabel = "Good Form"; }
  else if (tsb >= -5) { state = "neutral";             stateLabel = "Neutral"; }
  else if (tsb >= -15){ state = "accumulating_fatigue";stateLabel = "Accumulating Fatigue"; }
  else                { state = "overreaching_risk";   stateLabel = "Overreaching Risk"; }

  // Trend: compare last 14 days of TSB direction
  const twoWeeksAgoIdx = Math.max(0, series.length - 15);
  const twoWeeksAgo = series[twoWeeksAgoIdx].tsb;
  const tsbDelta = tsb - twoWeeksAgo;
  let trendLabel;
  if (tsbDelta > 2)       trendLabel = "Improving";
  else if (tsbDelta < -2) trendLabel = "Declining";
  else                    trendLabel = "Stable";

  return { state, stateLabel, trendLabel, tsb };
}
```

Export: add `computeTrainingLoadState` to the `export { ... }` block.

### Pattern 2: Coach-Voice Overlay Messages

**What:** Pre-written message strings per state + trend qualifier. These are Claude's discretion per CONTEXT.md.

**Approach:** Define a constant map inside `InsightsPage.jsx` (not `compute.js` — strings are UI concern). Example structure:

```javascript
// InsightsPage.jsx — define near top
const OVERLAY_MESSAGES = {
  good_form: {
    Improving: "You're in excellent form right now (TSB +{tsb}, improving). This is a prime window for a quality session or long run.",
    Stable:    "You're in good form (TSB +{tsb}, stable). Training stress is well-controlled — a good time to hit your key sessions.",
    Declining: "Form is still positive (TSB +{tsb}) but trending down. Normal in a build week — monitor load and protect sleep.",
  },
  neutral: {
    Improving: "Load and form are balancing out (TSB {tsb}, improving). Stay consistent — fitness is accumulating.",
    Stable:    "Training load is balanced (TSB {tsb}). Neutral form is normal mid-block — stick to the plan.",
    Declining: "Form is sliding toward the neutral zone (TSB {tsb}). Consider whether fatigue is planned or unexpected.",
  },
  accumulating_fatigue: {
    Improving: "Fatigue is elevated but easing (TSB {tsb}, improving). A recovery day or easy session will accelerate the rebound.",
    Stable:    "Fatigue is accumulating (TSB {tsb}). This is expected in a hard block — keep quality low, volume easy.",
    Declining: "Fatigue is building and not recovering (TSB {tsb}, declining). Prioritize sleep and consider a rest day.",
  },
  overreaching_risk: {
    Improving: "High fatigue, but rebounding (TSB {tsb}, improving). You're coming out of a hard block — protect recovery.",
    Stable:    "Training stress is very high (TSB {tsb}). Overreaching risk is real — reduce load now.",
    Declining: "Overreaching risk: TSB at {tsb} and declining. Back off intensity immediately and prioritize recovery.",
  },
};
```

### Pattern 3: Synthesis Callout — Frontend (INSG-02)

**What:** `useEffect` + `useState` in `InsightsPage`. A `useRef` flag prevents re-calls on remount.

**When to use:** Fires once on mount if `hasData` is true. Skips if no activities or if synthesis already fetched.

```javascript
// InsightsPage.jsx — add to component body
const [synthesis, setSynthesis] = useState(null);
const [synthesisLoading, setSynthesisLoading] = useState(false);
const synthesisFetchedRef = useRef(false);

useEffect(() => {
  if (!hasData || synthesisFetchedRef.current) return;
  synthesisFetchedRef.current = true;
  setSynthesisLoading(true);

  (async () => {
    try {
      const client = getSupabaseClient();
      const payload = await buildCoachPayload({
        activities, dailyLogs, checkins, activePlan,
        trainingBlocks, runnerProfile, lang: undefined,
      });
      const { data, error } = await client.functions.invoke("gemini-coach", {
        body: { mode: "insights_synthesis", ...payload },
      });
      if (!error && data?.synthesis) setSynthesis(data.synthesis);
    } catch {
      // silent fail — omit callout
    } finally {
      setSynthesisLoading(false);
    }
  })();
}, [hasData]);
```

**Placement in JSX:** Above the KPI strip, below the page header:

```jsx
{/* Synthesis callout — above KPI strip */}
{synthesisLoading && <SkeletonBlock height={72} />}
{!synthesisLoading && synthesis && (
  <div className="insights-coach-synthesis" data-testid="synthesis-callout">
    <p>{synthesis}</p>
  </div>
)}
```

### Pattern 4: New Edge Function Mode (INSG-02)

**What:** `insights_synthesis` branch in the `Deno.serve` handler, using `buildDefaultSystemInstruction` + `buildPrompt`.

**Response schema:** `{ synthesis: string }` — trimmed to 600 chars max.

**System instruction approach:** Follows the same pattern as the `initial` mode handler but with a focused instruction for load/form/zone interpretation rather than full structured insights.

```typescript
// Edge function — add before "initial" mode (or after long_term_replan block)
if (mode === "insights_synthesis") {
  const INSIGHTS_SYNTHESIS_INSTRUCTION = [
    "You are Marius AI Bakken, an expert endurance running coach.",
    "Write a single concise paragraph (2-4 sentences) interpreting the athlete's current training state.",
    "Focus on: current fitness trend (CTL direction), form/fatigue balance (TSB), and one practical recommendation.",
    "Your tone is direct and supportive — like a coach summarizing a training week.",
    "Respond with a single valid JSON object: { \"synthesis\": \"<paragraph text>\" }",
    "No markdown fences. No other fields.",
  ].join(" ");

  const systemInstruction = buildDefaultSystemInstruction(
    INSIGHTS_SYNTHESIS_INSTRUCTION,
    body.lang,
    dynamicPlaybookAddendum,
    philosophyAddendum,
  );
  const userMessage = buildPrompt(body);

  const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 512 },
    }),
  });

  // parse + return { synthesis: string }
}
```

**TypeScript type extension:** Add `"insights_synthesis"` to `CoachMode` union type and `RequestBody.mode` union.

### Pattern 5: CSS Class (follow Phase 3 convention)

```css
/* src/styles/index.css — follow .coach-adaptation-note pattern */
.insights-coach-synthesis {
  border-left: 3px solid var(--accent, #3b82f6);
  padding-left: 0.75rem;
  margin-bottom: 1rem;
  color: var(--text, inherit);
  font-size: 0.875rem;
  line-height: 1.6;
}

.insights-coach-synthesis p {
  margin: 0;
}
```

### Anti-Patterns to Avoid

- **Modifying the ComposedChart:** The chart is a 3-line CTL/ATL/TSB display. Adding overlays to the chart itself causes mobile readability and interaction problems. The overlay goes below, not inside.
- **Calling Gemini for the overlay:** The TSB threshold states are deterministic. No API call needed. Adding Gemini for the overlay adds latency, cost, and a new failure mode for what is pure math.
- **Re-calling synthesis on every re-render or navigation:** Use `useRef` flag (not just `useState`) to prevent the effect from re-running on remount. Session-duration caching is the locked decision.
- **Showing error UI for synthesis failure:** The locked decision is to omit the callout silently. No error message should appear to the user.
- **Placing synthesis below the KPI strip:** The locked placement is above KPIs — it sets the frame for the entire page.
- **Using `useEffect` with `hasData` as the only dependency without a fetched flag:** `hasData` can change (e.g., after data loads), and without a ref guard the effect would re-fire.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TSB classification logic | Custom if/else from scratch | Reuse threshold values from `generateCoachingInsights()` (line 376–399 of compute.js) | Thresholds are already established and tested |
| Payload assembly for synthesis | Custom payload | `buildCoachPayload()` from `src/lib/coachPayload.js` | Handles activities, checkins, logs, plan context, normalization |
| Supabase function call | Custom fetch | `client.functions.invoke("gemini-coach", { body })` | SDK handles auth header automatically — do NOT add manual Authorization header |
| JSON strip / parse | Custom regex | `stripMarkdownFences()` already in edge function | Handles markdown fence edge cases |
| Skeleton placeholder | Custom loading div | `SkeletonBlock` component (already in InsightsPage.jsx line 56) | Consistent with existing loading UX |
| Left-border callout card | Custom CSS | `.coach-adaptation-note` extended with new class | Design language established in Phase 3 |

---

## Common Pitfalls

### Pitfall 1: Re-calling synthesis on every navigation back to Insights
**What goes wrong:** Using only `useState(false)` as the "already fetched" guard means a remount (e.g., navigating away and back) resets state and triggers another Gemini call.
**Why it happens:** React unmounts/remounts pages on navigation; `useState` resets on unmount.
**How to avoid:** Use `useRef` as the guard (`synthesisFetchedRef.current = true`) alongside state for the result. Ref survives within the component lifetime but in SPA navigation this may still reset — acceptable since the locked decision is "component state for the session" (not truly persistent). If the component unmounts, the next mount re-fetches once, which is acceptable per the spec.
**Warning signs:** Network tab showing multiple calls to `gemini-coach` with `insights_synthesis` mode.

### Pitfall 2: TSB trend window too narrow
**What goes wrong:** Using only the latest vs. yesterday's TSB makes trend appear noisy (day-over-day TSB swings ±2–3 even without meaningful change).
**Why it happens:** ATL responds quickly to single sessions.
**How to avoid:** Compare TSB 14 days apart (index `-1` vs. index `-15`), not day-to-day. Apply a ±2 dead-band before labeling Improving/Declining.

### Pitfall 3: Edge function mode guard placement
**What goes wrong:** The `insights_synthesis` branch fires after `long_term_replan` and before `plan`/`plan_revision` but must be placed carefully in the if-chain to not fall through to the `initial` mode handler.
**Why it happens:** Current handler uses sequential `if` checks — no `else if` chain — so execution falls through to the `initial` handler if the mode check is missed.
**How to avoid:** Add `if (mode === "insights_synthesis") { ... return ... }` as a distinct early-return block. Verify the response returns before the `initial` mode block.

### Pitfall 4: TypeScript union type not extended
**What goes wrong:** TypeScript compile error in Deno: `mode === "insights_synthesis"` fails type narrowing if `CoachMode` union isn't updated.
**Why it happens:** `CoachMode` is defined as `"initial" | "followup" | "plan" | "plan_revision" | "long_term_replan"` on line 246 of index.ts.
**How to avoid:** Add `| "insights_synthesis"` to both the `CoachMode` type and the `RequestBody.mode?` field.

### Pitfall 5: Synthesis callout pushes KPIs off-screen on mobile
**What goes wrong:** A multi-sentence synthesis + padding pushes the 4 KPI cards below the fold on narrow screens.
**Why it happens:** Full paragraph text can be 3–5 lines tall on mobile.
**How to avoid:** Cap synthesis display at 2-4 sentences (enforced by edge function instruction + `slice(0, 600)` on the string). Keep `.insights-coach-synthesis` font-size at 0.875rem. No `margin-bottom` larger than 1rem before KPI strip.

### Pitfall 6: `supabaseClient` import in InsightsPage
**What goes wrong:** InsightsPage currently uses `useAppData()` for all data — it does not import `supabaseClient` directly.
**Why it happens:** Coach page uses `client.functions.invoke` directly (not via AppDataContext), which is a one-off pattern for AI calls.
**How to avoid:** Import `getSupabaseClient` from `src/lib/supabaseClient.js` in InsightsPage for the synthesis call only. This is consistent with how CoachPage makes its gemini-coach calls.

---

## Code Examples

### computeTrainingLoadState — verified against existing TSB thresholds in compute.js

The existing `generateCoachingInsights()` in `compute.js` (lines 376–399) uses these thresholds:
- `tsb > 10` → "well rested" (positive)
- `tsb < -15` → "deep fatigue" (warning)
- `tsb >= -5 && tsb <= 5` → "balanced" (info)

The new function uses the same breakpoints adjusted to 4-state coverage:
- TSB > 10: Good Form
- TSB -5 to 10: Neutral (extends the existing "balanced" range to include positive-but-below-10)
- TSB -15 to -5: Accumulating Fatigue
- TSB < -15: Overreaching Risk

This matches the locked CONTEXT.md thresholds exactly.

### Edge function `buildPrompt` reuse for synthesis

`buildPrompt(body)` (lines 573–681 of index.ts) assembles:
- Runner profile background + goal
- Inferred athlete level
- 4-week weekly summaries (distance, runs, longest)
- Plan context (race, phase, target km, days to race)
- Latest check-in + recent check-in trend
- Daily wellness logs (last 7 days)
- Recent activities (last 7 days)

This is exactly the payload the synthesis mode needs — no custom prompt builder required.

### How to test the overlay callout (component test pattern)

```javascript
// tests/unit/insights.test.jsx — add describe block
describe("Insights — training load overlay", () => {
  it("renders overlay callout with state label when TSB series is available", async () => {
    const richActivities = Array.from({ length: 14 }, (_, i) => ({
      id: `a-${i}`, user_id: "user-1", name: `Run ${i}`, type: "Run",
      started_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      distance: 10000, moving_time: 3600, elevation_gain: 50,
    }));
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: richActivities, loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<InsightsPage />);
    // Overlay renders below the chart — one of the 4 state labels should be present
    const overlay = await screen.findByTestId("load-state-callout");
    expect(overlay).toBeInTheDocument();
  });
});
```

### How to test synthesis callout (mock edge function call)

```javascript
// tests/unit/insights.test.jsx — synthesis describe block
describe("Insights — synthesis callout", () => {
  it("renders synthesis paragraph when edge function returns synthesis", async () => {
    const mockInvoke = vi.fn().mockResolvedValue({
      data: { synthesis: "Your training load is building steadily." },
      error: null,
    });
    vi.mock("../../src/lib/supabaseClient", () => ({
      getSupabaseClient: vi.fn(() => ({ functions: { invoke: mockInvoke } })),
    }));
    useAppData.mockReturnValue(makeAppData());
    render(<InsightsPage />);
    const callout = await screen.findByTestId("synthesis-callout");
    expect(callout).toHaveTextContent("Your training load");
  });

  it("omits synthesis callout if edge function fails", async () => {
    const mockInvoke = vi.fn().mockResolvedValue({ data: null, error: new Error("fail") });
    vi.mock("../../src/lib/supabaseClient", () => ({
      getSupabaseClient: vi.fn(() => ({ functions: { invoke: mockInvoke } })),
    }));
    useAppData.mockReturnValue(makeAppData());
    render(<InsightsPage />);
    await waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(screen.queryByTestId("synthesis-callout")).not.toBeInTheDocument();
  });
});
```

---

## State of the Art

| Old Pattern | Phase 4 Pattern | Notes |
|-------------|-----------------|-------|
| `generateCoachingInsights()` for all TSB classification | New `computeTrainingLoadState()` pure function for single-value state | More focused — returns one state object, not a full insight list |
| Coach integration only in CoachPage | Coach overlay signals in Insights analytics surface | Extends coach to non-chat surfaces |
| Synthesis only via conversation | One-shot synthesis callout auto-triggered on page load | Frames page context without requiring a conversation |

---

## Open Questions

1. **`useRef` vs. sessionStorage for synthesis caching**
   - What we know: CONTEXT.md says "cached in component state for the session (no re-call on re-renders or navigation back to page)"
   - What's unclear: Whether "navigation back" means within a single SPA session (component stays mounted) or across unmount/remount cycles
   - Recommendation: Use `useRef` for in-render guard + `useState` for the value. If the page unmounts and remounts (e.g., user navigates away and back), the component re-fetches once — acceptable behavior. If truly persistent within session is required, sessionStorage could store the result keyed by user ID, but CONTEXT.md says "component state" so `useState` + `useRef` is correct.

2. **`activePlan` shape in `buildCoachPayload` call from InsightsPage**
   - What we know: `buildCoachPayload` expects `{ activities, dailyLogs, checkins, activePlan, trainingBlocks, runnerProfile, lang }`. InsightsPage currently only destructures `{ activities, checkins, plans, strava }` from `useAppData()`.
   - What's unclear: Whether `dailyLogs`, `trainingBlocks`, `runnerProfile` are available in `useAppData()` for InsightsPage.
   - Recommendation: Check `AppDataContext` — these slices exist (all hooks are composed there). InsightsPage needs to expand its `useAppData()` destructure to include `dailyLogs`, `trainingBlocks`, `runnerProfile`. `activePlan` = `plans.plans[0] ?? null`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vitest.config.js) |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- --run tests/unit/insights.test.jsx` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INSG-01 | `computeTrainingLoadState()` returns correct state for TSB > 10 | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ exists (add cases) |
| INSG-01 | `computeTrainingLoadState()` returns trend label (Improving/Declining/Stable) | unit | `npm test -- --run tests/unit/compute.test.js` | ✅ exists (add cases) |
| INSG-01 | InsightsPage renders overlay callout with correct state text when activities present | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |
| INSG-01 | Overlay callout is absent when trainingLoadSeries has < 2 entries | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |
| INSG-02 | InsightsPage calls `gemini-coach` with `mode: "insights_synthesis"` on mount | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |
| INSG-02 | Synthesis callout renders when edge function returns `{ synthesis: string }` | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |
| INSG-02 | Synthesis callout is omitted when edge function returns error | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |
| INSG-02 | `insights_synthesis` instruction snippet contains synthesis-focused language | unit | `npm test -- --run tests/unit/gemini-instructions.test.jsx` | ✅ exists (add cases) |
| INSG-02 | Skeleton placeholder shown while synthesis is loading | component | `npm test -- --run tests/unit/insights.test.jsx` | ✅ exists (add cases) |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/unit/insights.test.jsx tests/unit/compute.test.js`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — all test files exist. New test cases are added to existing files, not new files. No new test infrastructure needed.

---

## Sources

### Primary (HIGH confidence)
- Direct code read: `src/domain/compute.js` — verified TSB thresholds in `generateCoachingInsights()` (lines 376–399) and `computeTrainingLoad()` output shape
- Direct code read: `src/pages/InsightsPage.jsx` — verified `SkeletonBlock` component, `useAppData()` destructure, `trainingLoadSeries` computation, ComposedChart structure
- Direct code read: `supabase/functions/gemini-coach/index.ts` — verified mode dispatch pattern, `CoachMode` type, `buildDefaultSystemInstruction`, `buildPrompt`, `stripMarkdownFences`, `validateAndSanitizePlan` patterns
- Direct code read: `src/lib/coachPayload.js` — verified `buildCoachPayload()` signature and payload fields
- Direct code read: `src/styles/index.css` (lines 1386–1422) — verified `.coach-adaptation-note` and `.ltp-adaptation-note` CSS pattern from Phase 3
- Direct code read: `src/lib/instructionSnippets.js` — verified export pattern for gemini-instructions test assertions
- Direct code read: `tests/unit/insights.test.jsx` — verified existing test structure, mock pattern, `makeAppData` usage
- Direct code read: `tests/unit/mockAppData.js` — verified `makeAppData()` shape, no changes needed for overlay tests

### Secondary (MEDIUM confidence)
- `.planning/phases/04-insights-coach-layer/04-CONTEXT.md` — all locked decisions for this phase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components read directly from source
- Architecture patterns: HIGH — all patterns derived from existing code (Phase 3 precedent + compute.js shape)
- Pitfalls: HIGH — derived from code structure analysis (TypeScript union, useRef behavior, if-chain placement)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable stack)
