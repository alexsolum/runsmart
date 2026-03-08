# Phase 4: Insights Coach Layer - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add coach overlay signals to the Training Load Trend chart and a single overall synthesis comment to the Insights page. Both are additive to the existing InsightsPage.jsx — no new pages, no major redesign. Coach integration is analytics-surface only.

</domain>

<decisions>
## Implementation Decisions

### Training Load Trend overlay (INSG-01)
- **Presentation:** Text callout block below the ComposedChart — no modifications to the chart itself. Avoids clutter on the already 3-line CTL/ATL/TSB chart. Mobile-safe.
- **Data source:** Computed TSB thresholds from `compute.js` only — no Gemini call. Deterministic, instant, zero API cost. Pre-written coach-voice strings per state.
- **States (4):**
  - Good Form: TSB > 10
  - Neutral: TSB -5 to 10
  - Accumulating Fatigue: TSB -15 to -5
  - Overreaching Risk: TSB < -15
  - (Matches existing threshold logic already in `compute.js`)
- **State content:** Show current state (latest TSB classification) plus a trend qualifier (Improving / Declining / Stable) based on TSB direction over the last 2 weeks. More informative than a single snapshot.

### Insights synthesis comment (INSG-02)
- **Trigger:** Auto on InsightsPage mount — calls `gemini-coach` once, cached in component state for the session (no re-call on re-renders or navigation back to page).
- **Placement:** Top of Insights page, full-width, above KPI cards. Sets the frame for interpreting all charts below.
- **Format:** Compact paragraph callout (2-4 sentences) in a left-border accent card — same design language as the `adaptation_summary` callout from Phase 3.
- **Edge function mode:** New `insights_synthesis` mode in `gemini-coach` returning `{ synthesis: string }`. Focused prompt tuned for load/form/zone interpretation rather than general coaching. Keeps the schema clean and response testable.

### Loading & error states
- While synthesis is loading: show a skeleton placeholder in the callout position (consistent with existing `SkeletonBlock` usage in InsightsPage).
- If synthesis call fails or no activities: omit the callout entirely (conditional render, no error message shown to user).
- Overlay state callout is always computed client-side — no loading state needed.

### Claude's Discretion
- Exact coach-voice text for each of the 4 overlay states and trend qualifiers.
- Synthesis prompt wording and token budget for the new mode.
- CSS class naming for the synthesis callout (follow Phase 3 pattern).
- Whether to session-cache or local-state-cache the synthesis result.

</decisions>

<specifics>
## Specific Ideas

- The overlay callout should feel like a brief coach note, not a technical readout — e.g., "You're in good form right now (TSB +12, improving). This is a good window for a quality session or long run."
- The synthesis comment frames the page — athlete reads it first, then looks at charts to see the detail behind it.
- Keep the synthesis short enough that it fits above the fold on mobile without pushing KPIs off-screen.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeTrainingLoad()` in `src/domain/compute.js`: returns array of `{ date, atl, ctl, tsb }` — TSB threshold logic already present (tsb > 10, tsb < -15, tsb -5..5)
- `SkeletonBlock` component in `InsightsPage.jsx`: existing skeleton for chart loading states — reuse for synthesis callout placeholder
- `adaptation_summary` callout CSS from Phase 3 (`src/styles/index.css`): `.coach-adaptation-note` / `.ltp-adaptation-note` — reuse the left-border accent pattern
- `buildCoachPayload` in `src/lib/coachPayload.js`: existing payload builder — extend or call directly for the insights synthesis call

### Established Patterns
- InsightsPage uses `useAppData()` for all data — no direct Supabase calls from the page
- `gemini-coach` edge function already supports multiple modes via `mode` field in request body — `insights_synthesis` follows the same pattern
- Page-level coach calls use `client.functions.invoke("gemini-coach", { body: { mode, ...payload } })`

### Integration Points
- **Edge function:** `supabase/functions/gemini-coach/index.ts` — add `insights_synthesis` mode handler returning `{ synthesis: string }`
- **InsightsPage.jsx:** Add synthesis callout (top of page) + overlay state callout (below Training Load Trend chart)
- **compute.js:** Add `computeTrainingLoadState(series)` pure function returning `{ state, trendLabel, message }` — pure, testable, no React
- **Tests:** `tests/unit/insights.test.jsx` (existing) for overlay callout; `tests/unit/gemini-instructions.test.jsx` for new mode instruction string

</code_context>

<deferred>
## Deferred Ideas

- None surfaced — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-insights-coach-layer*
*Context gathered: 2026-03-06*
