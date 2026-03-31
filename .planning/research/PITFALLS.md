# Pitfalls Research

**Domain:** AI coaching backend swap + hierarchical plan data model migration + React DnD grid
**Researched:** 2026-03-29
**Confidence:** HIGH (structured-outputs limits from official docs), MEDIUM (migration patterns), MEDIUM (DnD integration)

---

## Critical Pitfalls

### Pitfall 1: Full 9-Week Plan in One Claude Call Hits Token Budget

**What goes wrong:**
A 9-week plan with 7 days each, each day containing a workout with description, zone info, and structure metadata, generates roughly 8 000–14 000 output tokens depending on verbosity. Claude Sonnet 4.6 has a 64k max output and Claude Haiku 4.5 has a 64k max output — which sounds comfortable — but the `max_tokens` parameter must be set explicitly in the request. If it is left at the API default (which may be as low as 1 024) the response is truncated mid-JSON with `stop_reason: "max_tokens"`. The resulting partial JSON cannot be parsed, and the frontend receives an opaque error.

**Why it happens:**
Developers port the existing `PLAN_SYSTEM_INSTRUCTION` pattern (which generates 7-day plans) to a multi-week plan without adjusting `max_tokens`. The existing Gemini function uses a model that behaves differently. The new function looks identical until a 9-week plan is requested at runtime.

**How to avoid:**
- Set `max_tokens` to at least 16 000 for full-plan generation calls. Use 24 000 to be safe.
- Always check `stop_reason` in the API response. Any value other than `"end_turn"` means the response is incomplete. Return a 4xx or 5xx to the frontend rather than a truncated plan.
- Log the raw response token count to the `ai_audit_logs` table (already present in the codebase) so truncation is visible in production.
- Do not use Claude Haiku for full-plan generation. Use Sonnet 4.6 or Opus 4.6.

**Warning signs:**
- Frontend receives a plan that stops mid-week (e.g., weeks 1–6 complete, week 7 has only 3 days).
- Parsing errors like "unexpected end of JSON input" in the edge function logs.
- `stop_reason: "max_tokens"` in the raw API response visible in audit logs.

**Phase to address:** The phase that introduces the full-plan generation edge function (the Claude API replacement phase).

---

### Pitfall 2: Structured Outputs Schema Complexity Exceeds Compilation Limits

**What goes wrong:**
Claude's structured outputs use grammar-based constrained decoding. A deep hierarchical plan schema — `plan → phases → weeks → days → workouts` with optional fields at each level — can exceed the grammar compilation limits. The API returns HTTP 400 "Schema is too complex for compilation." This is not a token issue; it is a schema size issue. Known hard limits: max 24 optional parameters total across all schemas in a single request; max 16 parameters with union types (`anyOf` or nullable types like `"type": ["string", "null"]`).

**Why it happens:**
Developers design a "complete" schema that mirrors the full data model with many optional fields (optional zone info, optional structure, nullable workout types for rest days). Each optional field roughly doubles a portion of the grammar's state space. Nullable types are especially expensive because they count toward the 16 union-type parameter limit.

**How to avoid:**
- Make all required fields actually `required` in the JSON schema. Do not use optional fields for things the model must always produce.
- For rest days, use `distance_km: 0` and `duration_min: 0` rather than nullable types. Represent "no workout" through sentinel values, not absent fields.
- Set `additionalProperties: false` on every object in the schema (the API requires this).
- If the schema still exceeds limits, split generation: generate the phase structure first, then generate day-level workouts per week in a second call. This adds latency but avoids 400 errors entirely.
- Test the schema against the Claude API in isolation before wiring up the UI. A 400 on schema compilation is not a runtime content error — it will fail on every request with that schema.

**Warning signs:**
- HTTP 400 with message "Schema is too complex for compilation" from the Claude API.
- Schema has more than ~20 properties that could be absent or null.
- Schema uses `"type": ["string", "null"]` patterns more than a handful of times.

**Phase to address:** The phase that introduces structured plan generation.

---

### Pitfall 3: AI Provider Swap Breaks Auth Boundary on the Edge Function

**What goes wrong:**
The existing `gemini-coach` function has `verify_jwt = false` in its `config.toml` and performs bearer-token auth in application code. When creating a new `claude-coach` function (or replacing the existing one), the new function's `config.toml` may accidentally inherit the same `verify_jwt = false` pattern without the application-code auth check being preserved. The endpoint becomes publicly reachable with no auth required, burning API credits on unauthenticated requests.

This is not hypothetical — it is already flagged as a known concern in `.planning/codebase/CONCERNS.md` (concern #3).

**Why it happens:**
The `config.toml` pattern is copied verbatim. The application-level auth check lives inside `index.ts` and can be silently dropped when restructuring or replacing the function. There is no gateway-level enforcement to catch the regression.

**How to avoid:**
- Write a Playwright or integration test that sends a request to the new function with no `Authorization` header and asserts the response is 401. Run this test as part of the deployment checklist.
- Document the intent of `verify_jwt = false` with an explicit code comment at the top of every function that uses it.
- Consider switching to `verify_jwt = true` for the new function — the existing pattern was chosen for a reason that may not apply to the Claude endpoint.
- Add an `ANTHROPIC_API_KEY` presence check at function startup and return 500 immediately if missing, so misconfigured deploys fail loudly rather than silently.

**Warning signs:**
- Curl request without Authorization header returns 200.
- API cost spikes without corresponding user activity in the app.
- No 401 test exists for the new function.

**Phase to address:** The Claude API edge function replacement phase.

---

### Pitfall 4: Hierarchical Plan Model Coexists with Flat `workout_entries` During Migration — Double-Write Bug

**What goes wrong:**
The new plan model stores full plan JSON in a `plan_data` column (JSONB) on `training_plans` while the existing `workout_entries` table continues to drive the weekly planner UI. During the migration period, edits made to workout entries via the old UI are not reflected in the hierarchical plan JSON, and vice versa. After the new UI ships, the old `workout_entries` rows are stale but still queried by hooks that have not been updated. Users see different data on different screens.

**Why it happens:**
The migration is done in phases: the new data model is added first, then the UI is updated screen by screen. This is correct strategy but requires explicit bridge logic that keeps both representations in sync, or a clear cutover moment. Without a documented cutover plan, both systems drift silently.

**How to avoid:**
- Define the cutover explicitly in the roadmap: either (a) dual-write to both representations during the migration window, or (b) add a `plan_version` flag to `training_plans` that the hooks check to decide which representation to read.
- During the bridge period, the plan generation function should write to both `workout_entries` (for backward compatibility) and the new JSONB structure.
- Remove dual-write only after confirming the new UI is live and old hooks are retired.
- Document which DB representation is canonical in the migration SQL comment.

**Warning signs:**
- The WeeklyPlanPage shows old data after a plan regeneration that wrote to the new structure.
- The `useWorkoutEntries` hook returns rows that contradict the plan JSON.
- Different users (some on old cached version, some on new) see different plan data.

**Phase to address:** The hierarchical data model migration phase. Must be addressed before the UI overhaul phase ships.

---

### Pitfall 5: Removing Admin Philosophy Editor Breaks the Weekly Generation Prompt — Silent Coaching Regression

**What goes wrong:**
The existing `PLAN_SYSTEM_INSTRUCTION` in `gemini-coach/index.ts` injects coaching philosophy fetched from `coach_philosophy_documents` via the `COACHING_PLAYBOOK` constant in `playbook.ts`. When the philosophy editor is removed and the coaching context moves to static `SKILL.md` reference files, the edge function must be updated to embed that context directly. If the function is not updated at the same time the UI feature is removed, it silently falls back to the old static playbook or sends no coaching context at all — and the quality of generated plans degrades without any error being raised.

**Why it happens:**
The philosophy removal is treated as a "frontend-only" cleanup (removing a UI page), while the actual coaching context injection lives in the edge function. These are separate deployment artifacts. The frontend removal can ship without the function update, leaving a broken coaching context path in production.

**How to avoid:**
- Treat the philosophy removal as a three-part atomic change: (1) remove the UI, (2) update the edge function to embed `SKILL.md` context directly, (3) remove the `coach_philosophy_documents` table queries from the function.
- Never ship step (1) without step (2) in the same deployment.
- Add an AI behavioral test that verifies generated plans reference the expected coaching methodology (Koop principles, 80/20 polarization) after the change.
- Keep the `coach_philosophy_documents` table and its data intact until after verified that the static context produces equivalent or better plan quality.

**Warning signs:**
- Generated plans stop referencing specific intensity zones or Koop methodology after the UI change.
- The edge function still queries `coach_philosophy_documents` after the UI is removed (stale code path).
- No AI behavioral test covers this boundary.

**Phase to address:** The philosophy editor removal phase, which must be coordinated with the Claude edge function phase.

---

### Pitfall 6: Large Plan JSON Stored in JSONB Causes React Re-Render Storm

**What goes wrong:**
Storing the full hierarchical plan as a JSONB column means the `usePlans` hook loads a potentially large object (9 weeks × 7 days × workout detail) into React context on every mount. Any context consumer re-renders when this value changes reference. The weekly planner, drag-and-drop grid, and summary bars all become consumers. A single plan update triggers re-renders across the entire app.

**Why it happens:**
The existing `AppDataContext` pattern passes hook state directly to consumers without memoization at the context level. This is acceptable for small scalar values (like plan metadata) but breaks down with a large mutable JSON object that changes on every AI regeneration.

**How to avoid:**
- Memoize the plan JSON derivation with `useMemo` inside the hook, keyed on the plan's `updated_at` timestamp.
- Split the plan into a "plan metadata" context (goal race, mileage target, phase labels) and a "plan data" context (the week/day/workout tree). Only components that need the full tree subscribe to it.
- Use `React.memo` on the week row and day column components so they only re-render when their specific week/day data changes.
- Avoid storing the entire plan JSON in `useState` at the page level — derive the current week's data from the plan once using `useMemo` and pass that slice to the grid.

**Warning signs:**
- React DevTools profiler shows the entire planner page re-rendering on every keystroke in the workout detail modal.
- The plan loads noticeably slowly on mobile even though the network request is fast.

**Phase to address:** The UI overhaul phase. Must be addressed when the weekly grid is first connected to the hierarchical plan data.

---

### Pitfall 7: Drag-and-Drop Breaks the Existing `workout_entries` Optimistic Update Pattern

**What goes wrong:**
The existing `useWorkoutEntries` hook uses a reducer with `created`, `updated`, and `deleted` actions for optimistic UI updates. When dnd-kit's `onDragEnd` fires, the handler must perform two operations: update the dragged workout's date (the new day column) and potentially update the displaced workout's date. If only one of the two Supabase writes succeeds, the UI and DB diverge. The optimistic state shows the swap as complete while only one side was persisted.

**Why it happens:**
The reducer pattern handles single-entry mutations cleanly but does not have a "swap" action. The drag-end handler is written as two sequential `updateEntry` calls. A network failure between them leaves the reducer in a half-updated state with no rollback.

**How to avoid:**
- Write the swap as a single atomic Postgres transaction via an RPC function rather than two sequential client-side mutations. The RPC either commits both date changes or rolls back.
- Add a `swapped` action to the reducer that takes two entry payloads and updates both atomically in local state.
- In the drag-end handler, immediately apply the optimistic `swapped` action, then call the RPC. On failure, dispatch a `rollback` action that restores the pre-drag state (kept in a `lastStableState` ref).
- Disable dragging while a swap RPC is in flight using an `isPersisting` flag. Do not allow a second drag until the first is confirmed.

**Warning signs:**
- A drag-and-drop succeeds visually but one workout reverts to its old day after page refresh.
- Console shows a Supabase error during drag-and-drop while the UI still shows the swap as complete.

**Phase to address:** The drag-and-drop implementation phase.

---

### Pitfall 8: Deno Lock File Version Incompatibility with `@anthropic-ai/sdk`

**What goes wrong:**
Supabase Edge Functions currently only support Deno lock file version 4. Deno 2.3+ generates lock file v5 by default. If a developer runs `deno add npm:@anthropic-ai/sdk` locally with a recent Deno version, the generated `deno.lock` will be v5 format and the Supabase deploy will fail.

The `@anthropic-ai/sdk` npm package supports Deno v1.28.0+, so the SDK itself is not the problem — the lock file format is. This is an active compatibility gap confirmed in the Supabase community (github.com/orgs/supabase/discussions/39966).

**Why it happens:**
The developer installs Deno independently from what Supabase's hosted runtime expects. There is no pinned Deno version in the repo, so local and CI environments can drift.

**How to avoid:**
- Call the Anthropic API directly via `fetch` in the edge function (no SDK needed for basic message calls) and avoid the lock file issue entirely. The Anthropic REST API is straightforward: `POST https://api.anthropic.com/v1/messages` with `x-api-key` and `anthropic-version` headers.
- If the SDK is preferred, pin the Deno version in `.tool-versions` or document the required version explicitly in `supabase/functions/README.md`.
- Test deployment to a staging Supabase project before shipping to production whenever dependency changes are made.

**Warning signs:**
- `supabase functions deploy` fails with "invalid lock file version" or similar.
- The local Deno version is 2.3+.
- `deno.lock` in the functions directory shows `"version": "5"` at the top.

**Phase to address:** The Claude API edge function implementation phase (first day of function setup).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode `max_tokens: 24000` in plan generation call | No token counting logic needed | Overpays for short plans | Acceptable in early phases; add adaptive sizing later |
| Store hierarchical plan as JSONB column on `training_plans` | No new tables, fast iteration | Prevents indexed queries on workout fields; large reads | Acceptable for v2.0; normalize later if workout search is needed |
| Generate the full plan in one API call | Simpler code, single loading state | Fails for very long plans (>12 weeks); harder to retry partial failures | Acceptable for 9–12 week plans with adequate `max_tokens` |
| Keep `coach_philosophy_documents` table alive but stop writing to it | No migration risk | Schema bloat, confusing for future maintainers | Acceptable only as a temporary bridge — must be removed within the same milestone |
| Dual-write to both `workout_entries` and plan JSONB during migration | Old UI still works during transition | Logic duplication, bug surface | Acceptable only for the explicit migration window with a documented sunset date |
| Prompt-engineered JSON without structured outputs API | Avoids schema complexity limits | Occasional invalid JSON, retry logic needed | Never for full plan generation — structured outputs are GA on relevant models |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude API from Deno Edge Function | Using `import Anthropic from "npm:@anthropic-ai/sdk"` with Deno 2.3+ generates lock file v5 | Call the API directly via `fetch` to avoid lock file issues, or pin Deno to a version that generates lock file v4 |
| Claude structured outputs API | Using the old `output_format` beta parameter | Use `output_config.format` — the beta header still works during transition but is deprecated |
| Claude structured outputs API | Setting `max_tokens` too low for large JSON | Estimate tokens: 9 weeks × 7 days × ~200 tokens per day ≈ 12 600 tokens minimum; set `max_tokens: 20000` |
| Claude structured outputs API | Using nullable types for optional fields (`"type": ["string", "null"]`) | Use concrete types with sentinel values (e.g., `"distance_km": 0` for rest days) to stay under the 16 union-type parameter limit |
| Claude structured outputs API | Using message prefilling alongside `output_config.format` | These two features are incompatible; prefilling is blocked when structured outputs are enabled |
| Claude API secret | Storing `ANTHROPIC_API_KEY` in any `VITE_*` environment variable | Store only in Supabase Edge Function secrets (Supabase dashboard); never in frontend env |
| Supabase + dnd-kit swap | Firing two sequential `update` calls for a drag swap | Use a single Postgres RPC function that atomically swaps two workout dates in one transaction |
| Philosophy removal + edge function | Removing philosophy UI before updating edge function | Treat as atomic: remove UI + update function + verify plan quality in same deployment |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full plan JSONB into React context on mount | Page load sluggish; full app re-render on any plan update | Memoize plan derivation in hook; split context into metadata vs. full data | At ~5 weeks of detailed workouts; severe at 12+ weeks |
| All 63 day cells (9 × 7) rendered as dnd-kit droppables without memoization | Grid scrolls at <30fps on mobile | Wrap each day cell in `React.memo`; only re-render cells whose data changed | On mid-range mobile devices |
| Plan generation edge function called on every page mount | Unnecessary API cost; Anthropic rate limits at ~5 concurrent users | Cache generated plan in the DB; only re-call on explicit "Regenerate" trigger | At first production user — there is no caching path today |
| Full plan JSON passed as a prop through multiple component layers | Unnecessary re-renders of intermediate components; prop drilling makes refactors hard | Derive current-week slice at the top level with `useMemo`; pass only the week object to the grid | Immediately; React StrictMode's double-render doubles the impact |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `verify_jwt = false` in new claude-coach `config.toml` without application-level auth check | Unauthenticated callers burn Anthropic API credits | Add integration test: unauthenticated POST → 401; add code comment documenting the pattern |
| Logging raw AI responses that include athlete training data without access controls | Privacy risk if logs are exported or shared | Existing `ai_audit_logs` table stores `raw_response`; ensure log access is service-role-only; exclude raw responses from any export feature |
| Including `ANTHROPIC_API_KEY` in any Vite build variable | Key exposed in browser bundle | Use only Supabase Edge Function secrets; search `dist/` output for "sk-ant" or "anthropic" before shipping |
| Including athlete identity (name, email) in outgoing AI prompt beyond what is needed | Unnecessary PII exposure to Anthropic's API | Scrub prompts to include only training data (km, pace, HR zones); exclude name and email |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading indicator during full-plan generation (can take 10–20 seconds for a 9-week plan) | User assumes the app is broken and clicks "Generate" again, triggering a duplicate call | Show a progress indicator; disable the generate button during inflight requests |
| Drag-and-drop with no undo | User misdrops a workout and cannot recover without remembering the original placement | Add a toast with an "Undo" action that reverts the last swap for 5 seconds before committing the DB write |
| Plan regeneration silently overwrites manual edits | User's careful manual adjustments are lost without warning | Check for `is_protected: true` entries (tracked in `weekly_plan_day_states`) before regenerating; show a confirmation modal listing protected entries |
| Showing the full 9-week grid at once on mobile | Grid is unreadable; horizontal scroll is disorienting | Default to single-week view on mobile; provide a collapsed week-row summary that expands on tap |
| Removing the philosophy editor without in-app communication | Power users who relied on customizing coaching philosophy feel the product regressed | Add a brief in-app note when the feature is removed; surface the SKILL.md methodology as a read-only "coaching approach" section |

---

## "Looks Done But Isn't" Checklist

- [ ] **Claude edge function auth:** Verify that a request with no `Authorization` header returns 401, not 200 or 500.
- [ ] **Plan generation token limit:** Verify `stop_reason` is `"end_turn"` (not `"max_tokens"`) for a 9-week plan in a test environment before shipping.
- [ ] **Structured outputs schema:** Test the plan schema against the Claude API in isolation (without a real athlete payload) to confirm no 400 schema-complexity error.
- [ ] **Philosophy context in generated plans:** Generate a test plan after removing philosophy editor integration and confirm the output still references zone structure, 80/20 polarization, and long-run priority.
- [ ] **Drag-and-drop atomic swap:** Confirm that a failed Supabase RPC during a drag reverts both entries in the UI (not just one).
- [ ] **Old `workout_entries` UI:** Confirm the existing WeeklyPlanPage still shows correct data after the plan JSONB column is added to `training_plans` (no regression on coexistence).
- [ ] **ANTHROPIC_API_KEY not in frontend bundle:** Run `npm run build` and search `dist/` for any string containing "sk-ant" or "anthropic".
- [ ] **Mobile plan grid:** Test the weekly grid on a 375px viewport — confirm it does not overflow horizontally.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Plan truncated by max_tokens | LOW | Bump `max_tokens` in edge function; redeploy; user regenerates plan |
| Schema too complex (400 error) | MEDIUM | Simplify schema (make optional fields required with sentinel values); if insufficient, split into two-call generation; redeploy |
| Auth regression on new function (public endpoint) | HIGH | Redeploy with auth check restored immediately; rotate `ANTHROPIC_API_KEY` if request logs show unauthenticated calls; review Anthropic API usage dashboard for unexpected spend |
| Dual-write divergence during migration | MEDIUM | Identify canonical source for affected user; write a one-off SQL migration to re-sync from the canonical source; verify by re-loading the affected plan |
| Philosophy context lost after editor removal | MEDIUM | Re-embed the SKILL.md content in the edge function system prompt; redeploy; verify plan quality with a test generation |
| Deno lock file version mismatch | LOW | Delete `deno.lock` in functions directory; regenerate with a pinned compatible Deno version; commit |
| Drag swap half-persisted in DB | MEDIUM | Write a one-off migration to correct affected workout entry dates; add atomic RPC before next DnD phase ships |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Plan generation token truncation | Claude API edge function phase | Integration test: generate 9-week plan, assert `stop_reason == "end_turn"` |
| Structured outputs schema complexity | Claude API edge function phase | Isolated schema test against Claude API before connecting to UI |
| Auth boundary regression on new function | Claude API edge function phase | Playwright test: unauthenticated POST returns 401 |
| Hierarchical plan coexisting with workout_entries | Data model migration phase | Both old WeeklyPlanPage and new planner show consistent data for same plan |
| Philosophy editor removal breaks coaching quality | Philosophy removal phase (atomic with function update) | AI behavioral test: generated plan references zone structure and Koop methodology |
| Large plan JSON causing React re-renders | UI overhaul phase | React DevTools profiler: drag-and-drop does not re-render the full context tree |
| Drag-and-drop swap half-persistence | Drag-and-drop implementation phase | Playwright test: simulate network failure mid-drag, verify full rollback in UI and DB |
| Deno lock file version incompatibility | Claude API edge function phase (day one) | `supabase functions deploy` succeeds in CI against a staging project |

---

## Sources

- Anthropic Structured Outputs official docs (platform.claude.com/docs/en/build-with-claude/structured-outputs) — HIGH confidence, accessed 2026-03-29
- Anthropic Models Overview (platform.claude.com/docs/en/about-claude/models/overview) — HIGH confidence, Claude Sonnet 4.6 max output: 64k tokens; Opus 4.6 max output: 128k tokens
- Anthropic TypeScript SDK npm package (@anthropic-ai/sdk) — HIGH confidence, Deno v1.28.0+ supported
- Supabase Edge Functions Deno lock file v5 compatibility issue (github.com/orgs/supabase/discussions/39966) — MEDIUM confidence, community report
- dnd-kit documentation and GitHub issues (dndkit.com, github.com/clauderic/dnd-kit) — MEDIUM confidence
- Zero-downtime PostgreSQL migration patterns (xata.io/blog/zero-downtime-schema-migrations-postgresql) — MEDIUM confidence
- LLM output truncation patterns — LOW confidence, general LLM literature
- Codebase direct inspection: `supabase/functions/gemini-coach/index.ts`, `supabase/functions/gemini-coach/playbook.ts`, `.planning/codebase/CONCERNS.md`, `src/hooks/useWorkoutEntries.js`, `src/hooks/useCoachPhilosophy.js`, `supabase/migrations/` — HIGH confidence

---

*Pitfalls research for: RunSmart v2.0 — Claude AI coaching backend + hierarchical plan model migration*
*Researched: 2026-03-29*
