# Phase 3: Feedback Loop Integration - Research

**Researched:** 2026-03-06
**Domain:** Prompt engineering + schema extension in Supabase Deno Edge Function (`gemini-coach`)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Adaptation summary (RPLN-03)**
- Add `adaptation_summary` as a new dedicated field in the replan response JSON, alongside `coaching_feedback`.
- Applies to all replan modes: `plan`, `plan_revision`, and `long_term_replan`.
- The summary must reference whichever of these signals are present: latest check-in scores, daily log trends, and training load trajectory. Absent signals are skipped gracefully.
- Length: 2-3 sentences.
- Frontend displays `adaptation_summary` distinctly above the plan (e.g., highlighted coaching note).

**Check-in/log citation depth (FDBK-01)**
- Explicit citation required: system instruction must mandate at least one insight or response element cites actual check-in or log values (e.g., "Your fatigue score of 4/5 over the past 3 days indicates...").
- When check-in/log data is absent: coach explicitly acknowledges the gap. Does not silently ignore.
- Citation applies to all coach modes: initial insights, plan, plan_revision, long_term_replan.
- Send 2-3 most recent check-ins (not just `latestCheckin`) so coach can detect multi-week patterns. `useCheckins` already loads 8 weeks — frontend selects the 2-3 most recent to include in the payload.

**Feedback surface and trigger (FDBK-01)**
- Coach page only — no new surfaces.
- Improve quality of existing initial insights so they always reference available wellness data.
- Use `initial` mode with enriched system instructions (no new `mode='feedback'` variant).
- A quick-action button (e.g., "Analyze my recent wellness logs") is a candidate UX addition — Claude's discretion.

**Methodology alignment in outputs (FDBK-02)**
- Required element in every response: system instruction mandates at least one insight body or coaching note explicitly mentions long-run positioning or intensity distribution.
- Methodology alignment is woven into insight body text — not a standalone methodology insight card.
- For replan outputs: `coaching_feedback` must include at least one mention of long-run centric structure or 80/20 intensity distribution.
- `koop_weight`/`bakken_weight` values from `coach_philosophy_documents` govern the blend. Already fetched for replan modes — needs to be applied to initial mode too.

### Claude's Discretion
- Exact system instruction phrasing (as long as explicit citation and methodology requirements are met).
- Whether to add a quick-action "Analyze my wellness logs" button to the Coach page chat area.
- How to format absent-data acknowledgment text.
- Whether philosophy is fetched for initial mode via a new call or by including it in an existing fetch path.

### Deferred Ideas (OUT OF SCOPE)
- Inline coach comment on Daily Log page after save.
- Suggestion chip from Daily Log to Coach page.
- Automated feedback triggered by log entry.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RPLN-03 | Replanning response includes a clear summary of what changed and why | New `adaptation_summary` field in replan response JSON; new instruction mandate in `buildReplanSystemInstruction`; frontend renders it above the plan |
| FDBK-01 | Check-in and daily log data are incorporated into coach feedback responses for next-step recommendations | `recentCheckins` array added to `RequestBody` and `buildCoachPayload`; enriched system instructions for all modes; absent-data acknowledgment wording |
| FDBK-02 | Coach feedback explicitly reflects long-run centric planning and specific intensity distribution | Philosophy addendum (with `koop_weight`/`bakken_weight`) applied to `initial` mode; mandatory methodology mention in all system instructions |
</phase_requirements>

---

## Summary

Phase 3 is a focused prompt engineering and schema extension phase with no new pages, no new Supabase tables, and no new Edge Function modes. All work happens in three locations: `supabase/functions/gemini-coach/index.ts` (system instructions and response schema), `src/lib/coachPayload.js` (payload assembly), and `src/pages/CoachPage.jsx` + `src/pages/LongTermPlanPage.jsx` (rendering).

The central challenge is instruction reliability: Gemini 2.5-flash must consistently include explicit check-in/log citations and methodology references in every response. This is achieved through prescriptive system instruction language ("you MUST cite at least one check-in value") rather than through post-processing. The new `adaptation_summary` field is the only schema addition and follows the same sanitization pattern already used for `coaching_feedback`.

The second challenge is philosophy reach: `fetchActivePhilosophyDocument()` currently only runs for replan modes. Extending it to `initial` mode either requires a second Supabase call at request time or a structural change to move philosophy fetch before mode branching. Both approaches are viable; moving it before the branch is cleaner.

**Primary recommendation:** Modify `gemini-coach/index.ts` to (1) fetch philosophy before mode branching, (2) inject philosophy addendum into `buildDefaultSystemInstruction`, (3) add `recentCheckins` to `RequestBody` and `buildPrompt`, (4) update all system instructions with citation and methodology mandates, (5) add `adaptation_summary` to replan response schemas and validation. Front-end changes are additive rendering only.

---

## Standard Stack

### Core — Already in Use, No New Dependencies

| Component | Current Version | Purpose | Phase 3 Role |
|-----------|----------------|---------|--------------|
| Gemini 2.5-flash | via REST API | LLM output generation | Unchanged — only instructions change |
| Supabase Edge Function (Deno) | `@supabase/supabase-js@2` | Runtime host | Primary edit target |
| `buildCoachPayload.js` | project-local | Payload assembly for all coach calls | Add `recentCheckins` array |
| `useCheckins.js` | project-local | Loads 8 weeks of check-ins from `athlete_feedback` | No change needed — frontend selects top 2-3 |

No new packages. No new Supabase tables. No new Edge Function deploys (update existing function in place).

---

## Architecture Patterns

### Existing Code Structure in `gemini-coach/index.ts`

```
Deno.serve(async (req) => {
  // 1. Auth check
  // 2. fetchDynamicPlaybookAddendum(supabase, body, mode)     ← runs for all modes
  // 3. if mode === "long_term_replan" → fetchActivePhilosophyDocument  ← replan only
  // 4. if mode === "plan" | "plan_revision"  → fetchActivePhilosophyDocument  ← replan only
  // 5. if mode === "followup"  → buildDefaultSystemInstruction (no philosophy)
  // 6. default (initial)  → buildDefaultSystemInstruction (no philosophy)
})
```

**Phase 3 target structure:**

```
Deno.serve(async (req) => {
  // 1. Auth check
  // 2. fetchDynamicPlaybookAddendum(supabase, body, mode)     ← unchanged
  // 3. fetchActivePhilosophyDocument(supabase)                ← MOVED HERE (all modes)
  // 4. if mode === "long_term_replan" → buildReplanSystemInstruction (now gets philosophy)
  // 5. if mode === "plan" | "plan_revision" → buildReplanSystemInstruction (unchanged)
  // 6. if mode === "followup" → buildDefaultSystemInstruction + philosophy  ← extended
  // 7. default (initial) → buildDefaultSystemInstruction + philosophy  ← extended
})
```

### Pattern 1: Adding `adaptation_summary` to Replan Response

The existing pattern for `coaching_feedback` is the template. Extend it by:

1. Adding `adaptation_summary` to the JSON schema in the system instruction string.
2. Extracting and sanitizing it from the parsed response.
3. Returning it in the Response JSON alongside `coaching_feedback`.

Sanitization follows the existing convention — `String(value || "").slice(0, N)` with a fallback default.

**Fallback text for `adaptation_summary`:** `"Adaptation based on available training context."` — covers cases where Gemini omits the field.

**Length cap:** 600 characters (2-3 sentences at ~150-200 chars each; generous to avoid truncating meaningful text).

### Pattern 2: `recentCheckins` in Payload and Prompt

`buildCoachPayload` currently sets `latestCheckin: normalizeCheckin(freshCheckins[0] ?? null)`.

Extension adds `recentCheckins: freshCheckins.slice(0, 3).map(normalizeCheckin).filter(Boolean)`.

`buildPrompt` currently renders a single check-in block. The extension adds a multi-week section when `recentCheckins.length > 1`:

```
Check-in trend (last 2-3 weeks):
- Week of 2026-02-16: fatigue 4/5, sleep 3/5, motivation 4/5
- Week of 2026-02-23: fatigue 3/5, sleep 4/5, motivation 5/5
- Week of 2026-03-02: fatigue 5/5, sleep 2/5, motivation 3/5
```

When `recentCheckins` is empty AND `dailyLogs` is empty, `buildPrompt` appends: `"No wellness data available this week — coaching based on training load only."`

### Pattern 3: Philosophy Addendum in `buildDefaultSystemInstruction`

`buildDefaultSystemInstruction` currently takes `(baseInstruction, lang, dynamicAddendum)`. Extend signature to `(baseInstruction, lang, dynamicAddendum, philosophyAddendum)`.

When `philosophyAddendum` is present, insert it in the instruction stack at the same position it appears in `buildReplanSystemInstruction` — after guardrails, before playbook snippets.

### Pattern 4: Methodology Mandate in System Instructions

The system instructions for `initial` mode (`SYSTEM_INSTRUCTION`) and replan modes need a required-element clause added to their "Coaching requirements" list:

```
6) Include at least one explicit reference to long-run position in the week
   OR intensity distribution (e.g., 80/20 easy/quality ratio) in your response.
   Let the koop_weight/bakken_weight blend in the philosophy document guide emphasis:
   higher koop_weight → emphasize long-run anchoring; higher bakken_weight → emphasize
   specific intensity blocks.
```

For replan modes, this goes into the `coaching_feedback` requirement and into the `adaptation_summary` requirement.

### Pattern 5: Citation Mandate in System Instructions

Add to Coaching requirements in all mode instructions:

```
[N]) Data citation requirement: At least one insight body (initial mode) or
     coaching_feedback sentence (plan/replan modes) MUST cite an actual check-in
     or daily-log value using the format "Your [metric] of [value]/5 [interpretation]..."
     If no wellness data is present, explicitly state:
     "No check-in or wellness log data available — recommendations based on training load only."
```

### Anti-Patterns to Avoid

- **Parallel philosophy calls per mode branch:** Moving `fetchActivePhilosophyDocument` before branching removes redundant per-mode fetches and ensures consistent data.
- **Silent data omission:** If `recentCheckins` is empty, `buildPrompt` must still write the absent-data acknowledgment line — don't skip silently.
- **Overlong `adaptation_summary`:** Cap at 600 chars with `String(value || "").slice(0, 600)`. Gemini can produce verbose output; the cap enforces the "scan-friendly" constraint.
- **Philosophy addendum in `followup` mode:** Follow-up is conversational plain text, not structured coaching. Philosophy addendum is lower value here but not harmful. Include for consistency; the instruction precedence policy already makes schema compliance dominant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting multi-week fatigue trends | Custom trend algorithm in frontend | Send 2-3 raw check-ins to Gemini; let LLM interpret the trend in natural language | LLM trend interpretation is contextual and doesn't require a numeric algorithm |
| Philosophy weight blending | Custom interpolation of koop/bakken weights | Let `buildActivePhilosophyAddendum` format the weights into the instruction; instruct Gemini to apply them | The blend is qualitative guidance, not arithmetic |
| Response content verification | Post-processing to inject citations if Gemini omits them | Prescriptive instruction language; unit-test that the _instruction_ contains the mandate | Post-processing citations are misleading — they would not be grounded in actual data |

---

## Common Pitfalls

### Pitfall 1: `adaptation_summary` Missing from Schema Contract Breaks Parsing
**What goes wrong:** If the system instruction adds `adaptation_summary` to the schema description but the instruction doesn't label it as a required top-level field, Gemini may omit it. The parse logic then gets `undefined` and the fallback fires silently.
**Why it happens:** Gemini follows the schema contract literally. If the field is described as optional or listed only in an example, it will be omitted under token pressure.
**How to avoid:** State in the system instruction: `"adaptation_summary": a string (2-3 sentences), REQUIRED`. Add fallback: `String(parsedResult.adaptation_summary || "Adaptation based on available training context.").slice(0, 600)`.
**Warning signs:** Consistently seeing the fallback text in production output.

### Pitfall 2: Philosophy Fetch for Initial Mode Adds Latency
**What goes wrong:** Moving `fetchActivePhilosophyDocument` before mode branching means every `initial` and `followup` request now makes an extra Supabase query. For the conversational-heavy `followup` mode (many short exchanges), this adds measurable round-trip time.
**Why it happens:** The fetch is synchronous relative to the Gemini call — it happens sequentially before the LLM request.
**How to avoid:** Run philosophy fetch in parallel with `fetchDynamicPlaybookAddendum` using `Promise.all([fetchDynamicPlaybookAddendum(...), fetchActivePhilosophyDocument(...)])`.
**Warning signs:** Increased response latency on follow-up messages after deployment.

### Pitfall 3: `recentCheckins` Array in Payload Breaks TypeScript Interface
**What goes wrong:** `RequestBody` interface currently has `latestCheckin: Checkin | null`. Adding `recentCheckins: Checkin[]` without updating the interface causes Deno TypeScript compilation errors.
**Why it happens:** Deno's TypeScript checker is strict about interface conformance on deserialized JSON.
**How to avoid:** Update `RequestBody` to add `recentCheckins?: Checkin[]` (optional, for backward compat with any callers that don't yet send it). In `buildPrompt`, use `data.recentCheckins ?? (data.latestCheckin ? [data.latestCheckin] : [])` as the working array.
**Warning signs:** Edge function deploy fails with TypeScript error.

### Pitfall 4: `normalizeCheckin` Already Handles Field Name Aliases
**What goes wrong:** `normalizeCheckin` in `coachPayload.js` already normalizes `sleepQuality` vs. `sleep_quality`, `fatigue` vs. `fatigue_score`, etc. If you add raw check-in objects to `recentCheckins` without normalizing, the edge function's `Checkin` interface may receive unexpected field names.
**Why it happens:** `athlete_feedback` table uses snake_case; the `Checkin` interface expects camelCase for some fields.
**How to avoid:** Apply `normalizeCheckin` to each element: `freshCheckins.slice(0, 3).map(normalizeCheckin).filter(Boolean)`.

### Pitfall 5: Frontend Renders `adaptation_summary` Only After the Edge Function Returns It
**What goes wrong:** If both `coaching_feedback` and `adaptation_summary` are in the response but the frontend only reads `coaching_feedback` from `data`, the adaptation summary is silently dropped.
**Why it happens:** `LongTermPlanPage` currently destructures only `data?.coaching_feedback` from the replan response. `CoachPage` similarly reads only `coaching_feedback` for the plan tab.
**How to avoid:** After the edge function change, update both pages to also read `data?.adaptation_summary` and store it in local state. Render it in a visually distinct element (e.g., a highlighted callout above the plan).

---

## Code Examples

### Extending `RequestBody` Interface

```typescript
// In gemini-coach/index.ts — updated interface
interface RequestBody {
  mode?: "initial" | "followup" | "plan" | "plan_revision" | "long_term_replan";
  conversationHistory?: ConversationTurn[];
  weeklySummary: WeeklySummary[];
  recentActivities: RecentActivity[];
  latestCheckin: Checkin | null;
  recentCheckins?: Checkin[];          // NEW — 2-3 most recent, including latestCheckin
  planContext: PlanContext | null;
  dailyLogs: DailyLog[];
  runnerProfile?: RunnerProfile | null;
  lang?: string;
}
```

### Sanitizing `adaptation_summary` in Replan Response

```typescript
// Same pattern as coaching_feedback sanitization
const adaptationSummary = String(
  parsedResult.adaptation_summary || "Adaptation based on available training context."
).slice(0, 600);

return new Response(
  JSON.stringify({
    coaching_feedback: coachingFeedback,
    adaptation_summary: adaptationSummary,  // NEW
    structured_plan: structuredPlan,
  }),
  { headers: { ...corsHeaders, "Content-Type": "application/json" } },
);
```

### Multi-Checkin Section in `buildPrompt`

```typescript
// In buildPrompt — after existing latestCheckin block
const checkinList = data.recentCheckins ?? (data.latestCheckin ? [data.latestCheckin] : []);
if (checkinList.length > 1) {
  lines.push("Check-in trend (most recent first):");
  checkinList.forEach((c) => {
    const weekLabel = c.weekOf ?? c.week_of ?? "recent week";
    lines.push(
      `- Week of ${weekLabel}: fatigue ${c.fatigue}/5, sleep ${c.sleepQuality}/5, motivation ${c.motivation}/5` +
        (c.niggles ? `, niggles: ${c.niggles}` : ""),
    );
  });
  lines.push("");
} else if (checkinList.length === 1) {
  // existing single-checkin rendering (unchanged)
} else if (!data.dailyLogs?.length) {
  lines.push("No wellness data available this week — coaching based on training load only.");
  lines.push("");
}
```

### Parallel Philosophy + Playbook Fetch

```typescript
const [dynamicPlaybookAddendum, activePhilosophy] = await Promise.all([
  fetchDynamicPlaybookAddendum(supabase, body, mode),
  fetchActivePhilosophyDocument(supabase),
]);
const philosophyAddendum = buildActivePhilosophyAddendum(activePhilosophy);
```

### Extending `buildCoachPayload` in `coachPayload.js`

```javascript
// In buildCoachPayload return statement — add recentCheckins
return {
  weeklySummary: buildWeeklySummaries(freshActivities),
  recentActivities: getRecentActivities(freshActivities),
  latestCheckin: normalizeCheckin(freshCheckins[0] ?? null),
  recentCheckins: freshCheckins.slice(0, 3).map(normalizeCheckin).filter(Boolean), // NEW
  planContext: buildPlanContext(activePlan, trainingBlocks.blocks ?? []),
  dailyLogs: getRecentDailyLogs(freshLogs),
  runnerProfile: runnerProfilePayload,
  lang,
};
```

---

## State of the Art

| Old Approach | Current Approach | Phase 3 Change |
|--------------|------------------|----------------|
| Single latest check-in in payload | `latestCheckin` (1 record) | Add `recentCheckins` array (2-3 records) alongside `latestCheckin` |
| Philosophy only in replan modes | `fetchActivePhilosophyDocument` called per-mode in branches | Move fetch before branching; pass to all modes via `Promise.all` |
| Methodology implicit in coaching persona | Coach persona describes "Jason Koop-inspired" style | Add explicit required instruction clause mandating long-run or 80/20 mention |
| Absent wellness data silently ignored | `latestCheckin` is null, no mention in prompt | Explicit absent-data acknowledgment sentence in `buildPrompt` |
| No adaptation rationale in replan | `coaching_feedback` (general feedback string) | Add `adaptation_summary` field (what changed and why, 2-3 sentences) |

---

## Open Questions

1. **Philosophy fetch for `followup` mode**
   - What we know: `followup` is conversational plain text; philosophy addendum is 2200 chars of structured text.
   - What's unclear: Does philosophy context meaningfully improve short follow-up answers, or does it just waste tokens?
   - Recommendation: Include it (consistency matters; the guardrail/precedence policy already deprioritizes philosophy relative to format). If latency becomes a concern, `followup` can be excluded from philosophy in a later patch.

2. **`adaptation_summary` in `plan_revision` mode**
   - What we know: `plan_revision` revises a weekly plan based on athlete feedback. The "what changed and why" is partially served by `coaching_feedback`.
   - What's unclear: Whether a separate `adaptation_summary` adds value here or duplicates `coaching_feedback`.
   - Recommendation: Include it per the locked decision (all replan modes). The instruction can clarify that for revisions, `adaptation_summary` explains which athlete constraint drove the change, while `coaching_feedback` describes the resulting plan.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + React Testing Library |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- --run --reporter=dot` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RPLN-03 | `adaptation_summary` present and non-empty in all replan responses | unit (coachPayload + mock invoke) | `npm test -- --run tests/unit/coach.test.jsx` | ✅ (extend) |
| RPLN-03 | `adaptation_summary` rendered in `LongTermPlanPage` when present in response | unit (component) | `npm test -- --run tests/unit/trainingplan.test.jsx` | ✅ (extend) |
| RPLN-03 | `adaptation_summary` rendered in `CoachPage` plan tab when present | unit (component) | `npm test -- --run tests/unit/coach.test.jsx` | ✅ (extend) |
| FDBK-01 | `recentCheckins` included in payload sent to edge function | unit (coachPayload spy) | `npm test -- --run tests/unit/coach.test.jsx` | ✅ (extend) |
| FDBK-01 | `buildCoachPayload` returns `recentCheckins` array with up to 3 items | unit (pure function) | `npm test -- --run tests/unit/` | ✅ (extend mockAppData) |
| FDBK-01 | System instruction contains explicit citation mandate (string assertion) | unit (string test on instruction builder) | `npm test -- --run` | ❌ Wave 0 |
| FDBK-02 | System instruction contains methodology requirement clause | unit (string test on instruction builder) | `npm test -- --run` | ❌ Wave 0 |
| FDBK-02 | `koop_weight`/`bakken_weight` addendum reaches `buildDefaultSystemInstruction` output | unit (mock philosophy doc) | `npm test -- --run` | ❌ Wave 0 |

### Key Test Patterns for This Phase

**Testing `adaptation_summary` in component tests:**

In `coach.test.jsx` and `trainingplan.test.jsx`, the `makeMockClient` factory currently returns `planData` for `plan` and `plan_revision` modes. Extend `SAMPLE_PLAN_DATA` and create `SAMPLE_LONG_TERM_DATA` fixtures to include `adaptation_summary`:

```javascript
const SAMPLE_PLAN_DATA = {
  coaching_feedback: "...",
  adaptation_summary: "Fatigue trend over 3 check-ins drove a load reduction this week. Long-run remains Sunday anchor. Intensity sessions reduced from 2 to 1.",
  structured_plan: [...],
};
```

Test assertion:
```javascript
await waitFor(() => {
  expect(screen.getByText(/Fatigue trend over 3 check-ins/i)).toBeInTheDocument();
});
```

**Testing `recentCheckins` in payload spy:**

In `coach.test.jsx`, after invoking the initial coach call, verify the `functions.invoke` spy received `recentCheckins` in the body:

```javascript
const invokeCall = mockClient.functions.invoke.mock.calls[0];
const body = invokeCall[1].body;
expect(Array.isArray(body.recentCheckins)).toBe(true);
```

**Testing instruction content (Wave 0 new test file):**

Create `tests/unit/gemini-instructions.test.js` (runs in Node environment, no DOM). Import instruction builder functions directly (after extracting them to a testable helper if needed, or just test string content inline). Assert that the instruction string contains the required phrases:

```javascript
import { describe, it, expect } from "vitest";

// These are string-based smoke tests — verify the mandate is present in the instruction
it("SYSTEM_INSTRUCTION contains citation mandate", () => {
  expect(SYSTEM_INSTRUCTION).toMatch(/cite.*check-in|check-in.*value/i);
});

it("SYSTEM_INSTRUCTION contains methodology requirement", () => {
  expect(SYSTEM_INSTRUCTION).toMatch(/long.?run|80.?20|intensity distribution/i);
});
```

Note: Because the instruction constants are defined in the Deno edge function (TypeScript), these string-level tests may need to be written as part of a separate lightweight test or as documented in manual-verify. The planner should decide whether to extract instruction strings into a shared testable module or keep them as component-level assertions that validate the rendered `<pre>` output in a Storybook/test harness. Either approach is valid.

**Testing absent-data acknowledgment:**

```javascript
it("sends absent-data acknowledgment when no checkins and no daily logs", async () => {
  // Use makeAppData with empty checkins and empty logs
  const appData = makeAppData({
    checkins: { checkins: [], loading: false, loadCheckins: vi.fn().mockResolvedValue([]) },
    dailyLogs: { logs: [], loading: false, loadLogs: vi.fn().mockResolvedValue([]) },
  });
  useAppData.mockReturnValue(appData);
  // ... render and trigger initial coach call
  // Assert invoke body: no latestCheckin and no recentCheckins
  const body = mockClient.functions.invoke.mock.calls[0][1].body;
  expect(body.latestCheckin).toBeNull();
  expect(body.recentCheckins).toHaveLength(0);
  // The absent-data text is injected in buildPrompt server-side,
  // so this test verifies the payload shape — not the LLM output text.
});
```

### Sampling Rate

- **Per task commit:** `npm test -- --run tests/unit/coach.test.jsx tests/unit/trainingplan.test.jsx`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/gemini-instructions.test.js` — covers FDBK-01 and FDBK-02 instruction mandate assertions (string-level)
- [ ] `SAMPLE_PLAN_DATA` in `mockAppData.js` extended with `adaptation_summary` field — covers RPLN-03 component tests
- [ ] `SAMPLE_CHECKINS` array added to `mockAppData.js` (2-3 check-in objects with `week_of`, `fatigue`, `sleep_quality`, `motivation`, `niggles`) — covers FDBK-01 payload tests
- [ ] `makeAppData` default `checkins` slice updated to include `loadCheckins: vi.fn().mockResolvedValue(SAMPLE_CHECKINS)` — all tests that call `buildCoachPayload` will get check-in data

*(Existing test infrastructure covers all other phase requirements.)*

---

## Sources

### Primary (HIGH confidence)
- `supabase/functions/gemini-coach/index.ts` — full source read; all instruction builders, mode branching, validation helpers, and RequestBody interface confirmed
- `src/lib/coachPayload.js` — full source read; `buildCoachPayload`, `normalizeCheckin`, `loadFreshCheckins` confirmed
- `src/pages/CoachPage.jsx` — source read; invocation patterns, payload construction, rendering of `coaching_feedback` confirmed
- `src/pages/LongTermPlanPage.jsx` — source read; `handleManualReplan`, `replanData` state, `coaching_feedback` rendering confirmed
- `src/hooks/useCheckins.js` — source read; `loadCheckins` returns array ordered by `week_of` descending, limit 8 confirmed
- `tests/unit/mockAppData.js` — source read; confirmed `checkins` slice has no SAMPLE data, `loadCheckins` not yet mocked with resolved value
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- `.planning/phases/03-feedback-loop-integration/03-CONTEXT.md` — authoritative user decisions document
- `.planning/REQUIREMENTS.md` — RPLN-03, FDBK-01, FDBK-02 requirement text confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing patterns read directly from source
- Architecture: HIGH — all change points identified from source code; no speculation
- Pitfalls: HIGH for TypeScript interface and rendering pitfalls (confirmed by code read); MEDIUM for latency pitfall (no production timing data)
- Validation: HIGH — existing test patterns confirmed; Wave 0 gaps clearly identified

**Research date:** 2026-03-06
**Valid until:** 2026-06-06 (stable codebase; only changes if Gemini API or Supabase Edge Function runtime changes)
