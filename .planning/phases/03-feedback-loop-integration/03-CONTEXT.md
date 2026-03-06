# Phase 3: Feedback Loop Integration - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Strengthen how check-in and daily-log data drives coach outputs: enforce explicit data citation in responses, add a structured adaptation summary to replan outputs, and make Koop/Bakken methodology alignment a required element of every coaching response. This phase is prompt engineering + schema changes in `gemini-coach`. No new pages, no auto-replan, no new data sources.

</domain>

<decisions>
## Implementation Decisions

### Adaptation summary (RPLN-03)
- Add `adaptation_summary` as a **new dedicated field** in the replan response JSON, alongside `coaching_feedback`.
- Applies to **all replan modes**: `plan`, `plan_revision`, and `long_term_replan`.
- The summary must reference whichever of these signals are present: latest check-in scores, daily log trends, and training load trajectory. Absent signals are skipped gracefully.
- Length: 2-3 sentences — short enough to scan, long enough to explain the key driver.
- Frontend displays `adaptation_summary` distinctly above the plan (e.g., highlighted coaching note).

### Check-in/log citation depth (FDBK-01)
- **Explicit citation required**: system instruction must mandate that at least one insight or response element cites actual check-in or log values (e.g., "Your fatigue score of 4/5 over the past 3 days indicates...").
- When check-in/log data is **absent**: coach explicitly acknowledges the gap (e.g., "No wellness data this week — recommendations based on training load only"). Does not silently ignore.
- Citation applies to **all coach modes**: initial insights, plan, plan_revision, long_term_replan.
- **Check-in trend**: send the 2-3 most recent check-ins (not just `latestCheckin`) so the coach can detect multi-week patterns. `useCheckins` already loads 8 weeks — frontend selects the 2-3 most recent to include in the payload.

### Feedback surface & trigger (FDBK-01)
- Coach page only — no new surfaces (Daily Log page, inline notifications, etc.).
- Improve **quality of existing initial insights** so they always reference available wellness data. No new edge function mode needed.
- Use `initial` mode with enriched system instructions (no `mode='feedback'` variant).
- A quick-action button in the chat area (e.g., "Analyze my recent wellness logs") is a candidate UX addition — Claude's discretion on whether to include it as a minor enhancement within scope.

### Methodology alignment in outputs (FDBK-02)
- **Required element in every response**: system instruction mandates at least one insight body or coaching note explicitly mentions long-run positioning or intensity distribution (e.g., "Your long run this week should be..." or "Keep 80% of sessions at easy aerobic effort...").
- Methodology alignment is **woven into insight body text** — not a standalone methodology insight card.
- For replan outputs: `coaching_feedback` must include at least one mention of long-run centric structure or 80/20 intensity distribution.
- **Philosophy weight governs the blend**: the published `koop_weight`/`bakken_weight` values from `coach_philosophy_documents` inform how the coach balances long-run emphasis (Koop) vs. specific intensity distribution (Bakken). Already fetched for replan modes — needs to be applied to initial mode too.

### Claude's Discretion
- Exact system instruction phrasing (as long as explicit citation and methodology requirements are met).
- Whether to add a quick-action "Analyze my wellness logs" button to the Coach page chat area.
- How to format absent-data acknowledgment text.
- Whether philosophy is fetched for initial mode via a new call or by including it in an existing fetch path.

</decisions>

<specifics>
## Specific Ideas

- The adaptation summary should feel like a coaching note explaining "here's what I'm responding to" — not a generic summary of the plan. Grounded in actual signals, not template text.
- When fatigue is chronically high across multiple check-ins, the coach should name the trend (not just the latest value).
- Methodology references should feel natural, not preachy — "your long run is the week's anchor" rather than "as per Jason Koop methodology, long runs are primary."

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildPrompt()` in `gemini-coach/index.ts`: already includes `latestCheckin` and `dailyLogs` — extend to include 2-3 most recent check-ins.
- `useCheckins.js`: already loads 8 weeks of check-ins — frontend can pass the 2-3 most recent to the edge function payload.
- `fetchActivePhilosophyDocument()`: currently only called for `plan`, `plan_revision`, and `long_term_replan` modes — needs to be called (or results passed) for `initial` mode too so koop/bakken weights can inform the system instruction.
- `buildReplanSystemInstruction()` and `buildDefaultSystemInstruction()`: the two instruction builders are where citation and methodology requirements go.

### Established Patterns
- All replan modes (`plan`, `plan_revision`, `long_term_replan`) already use `buildReplanSystemInstruction()` with philosophy addendum.
- `initial` mode uses `buildDefaultSystemInstruction()` — philosophy addendum currently excluded here.
- JSON response validation (`validateAndSanitizePlan`, `validateAndSanitizeLongTermWeeks`) exists — new `adaptation_summary` field needs similar sanitization (string truncation, fallback text).
- `RequestBody` interface defines the payload contract — needs a `recentCheckins` array field alongside the existing `latestCheckin`.

### Integration Points
- **Edge function**: `supabase/functions/gemini-coach/index.ts` — primary change location (system instructions, new field, check-in array).
- **Frontend payload assembly**: wherever coach invocations are built (CoachPage.jsx, LongTermPlanPage.jsx) — extend to include `recentCheckins` array.
- **Frontend rendering**: CoachPage.jsx (adaptation_summary display), LongTermPlanPage.jsx (adaptation_summary above applied plan).
- **Type interfaces**: `RequestBody`, `Checkin`, and the response type all need extension.

</code_context>

<deferred>
## Deferred Ideas

- Inline coach comment on Daily Log page after save — future phase (new UI surface).
- Suggestion chip from Daily Log → Coach page — future phase.
- Automated feedback triggered by log entry — explicitly out of scope (manual-trigger only constraint).

</deferred>

---

*Phase: 03-feedback-loop-integration*
*Context gathered: 2026-03-06*
