# Phase 22: Cleanup + Deprecation - Research

**Researched:** 2026-04-05
**Domain:** Legacy AI/backend retirement, route deprecation, and validation cleanup in a React + Supabase app
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Legacy Weekly Plan surface
- **D-01:** Retire `WeeklyPlanPage` as an active product surface rather than only removing its AI card.
- **D-02:** The old weekly-entry planner flow is no longer a supported user path once the hierarchical `LongTermPlanPage` owns plan viewing and editing.
- **D-03:** Phase 22 cleanup should remove the route/navigation/runtime wiring for the legacy weekly planner instead of repurposing it around the new system.

### Insights AI path
- **D-04:** Keep the Insights synthesis callout feature, but migrate its backend from `gemini-coach` to `claude-coach`.
- **D-05:** Phase 22 is allowed to include this narrow migration because the roadmap requires one AI backend and the current Insights page still depends on Gemini.

### Gemini retirement strategy
- **D-06:** Hard-delete the `gemini-coach` Edge Function in Phase 22.
- **D-07:** Do not keep a compatibility stub, soft-deprecation shim, or frontend-inaccessible deployed copy.
- **D-08:** Any remaining runtime dependency on `gemini-coach` should be caught by code audit and tests in this phase, not deferred to production discovery.

### Audit strictness
- **D-09:** "Zero remaining references" applies to runtime code, active tests, and active docs/specs used for current development.
- **D-10:** Historical planning artifacts under `.planning/` may keep legacy references as audit history and do not need cleanup.
- **D-11:** The audit should explicitly cover old Gemini references, old weekly AI generation components, and active guidance/docs that would mislead future work.

### Claude's Discretion
- Exact wording of removal/deprecation notes in surviving docs and test descriptions.
- Whether legacy helper modules are deleted outright or reduced only as needed once all active imports are gone.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLEAN-01 | The gemini-coach Edge Function is removed after Claude replacement is validated | Covers frontend invoke migration, edge-function deletion, deployment verification, and zero-reference audit |
| CLEAN-03 | The old per-week AI generation flow (WeeklyAiCard, plan mode) is removed since full plan generation replaces it | Covers `WeeklyPlanPage` retirement, route/nav removal, legacy test replacement, and plan-path consolidation |
</phase_requirements>

## Summary

Phase 22 is not a generic dead-code cleanup. It is the cutover point where RunSmart must stop behaving like a migration-era dual system and become a single-path product: one AI backend (`claude-coach`), one plan-management surface (`LongTermPlanPage` and hierarchical plan state), and no remaining active code or test contracts that preserve Gemini-era behavior.

The repo audit shows that the legacy system is still materially alive in four places: `src/App.jsx` still exposes `WeeklyPlanPage`; `src/pages/WeeklyPlanPage.jsx` still contains `WeeklyAiCard` and invokes `gemini-coach` in `plan` mode; `src/pages/InsightsPage.jsx` still invokes `gemini-coach` in `insights_synthesis` mode; and active test suites still validate Gemini contracts and weekly-plan behavior. The live-deployment requirement adds a fifth seam: removing the local function directory is not sufficient because Supabase can still serve a deployed function until it is explicitly deleted.

**Primary recommendation:** Plan Phase 22 as four coordinated tracks: migrate Insights synthesis to `claude-coach`, remove `WeeklyPlanPage` and its navigation/runtime wiring, delete `gemini-coach` locally and from Supabase deployment, then replace legacy tests/docs with Claude-era and hierarchical-plan assertions.

## Project Constraints (from CLAUDE.md)

- Use the existing React + Vite + Supabase stack; this phase should not introduce a new framework.
- Route all AI and other sensitive operations through Supabase Edge Functions; frontend code must never expose secrets.
- `AppDataContext` remains the single source of truth for server data.
- Functional React components and hooks only.
- Update `tests/unit/mockAppData.js` when active app data surface expectations change.
- Prefer existing CSS tokens and patterns; do not redesign surviving surfaces as part of cleanup.
- All date arithmetic in pure domain logic must continue using UTC-safe methods.
- Component tests use mocked `useAppData`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 (`package.json`) | Frontend route/page cleanup | Existing app runtime and component test target |
| Vite | 7.3.1 (`package.json`) | Build for SPA/static frontend | Current build pipeline; no migration needed |
| `@supabase/supabase-js` | 2.49.4 (`package.json`) | Frontend Edge Function invocation | Existing invoke path for both `gemini-coach` and `claude-coach` |
| Supabase Edge Functions | CLI 2.78.1 available locally | AI backend deployment and deletion | Required to verify deployed function removal, not just file deletion |
| Vitest | 3.2.4 installed locally / `^3.0.0` in repo | Unit/component verification | Existing fast verification layer for deprecation work |
| Playwright | 1.58.2 installed locally / `^1.58.2` in repo | Integration/AI verification | Existing live edge-function and app-flow checks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-markdown` | 10.1.0 (`package.json`) | Render Insights synthesis output | Keep if synthesis remains markdown text |
| Supabase CLI | 2.78.1 | `functions list` / `functions delete` | Use to prove `gemini-coach` is no longer deployed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit Supabase function deletion | Deleting only the local folder | Fails CLEAN-01 because deployed function may still exist |
| Repointing weekly AI flow to Claude | Full removal of weekly flow | Full removal is required by locked decisions and CLEAN-03 |
| Keeping Gemini tests as archived active specs | Delete or rewrite active tests | Active tests/docs must stop encoding retired behavior |

**Installation:**
```bash
# No new packages are required for Phase 22.
```

**Version verification:** No new dependencies are needed. Verified local tool availability on 2026-04-05: `node v25.8.0`, `npm 11.11.0`, `vitest 3.2.4`, `playwright 1.58.2`, `supabase 2.78.1`.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── pages/
│   ├── LongTermPlanPage.jsx   # canonical plan surface
│   ├── CoachPage.jsx          # canonical Claude chat surface
│   └── InsightsPage.jsx       # analytics + migrated Claude synthesis
├── hooks/
│   └── useHierarchicalPlan.js # canonical plan data path
└── lib/
    └── coachPayload.js        # shared payload builder for surviving AI modes

supabase/
└── functions/
    ├── claude-coach/          # only surviving AI function
    ├── strava-auth/
    ├── strava-sync/
    └── strava-webhook/
```

### Pattern 1: Single surviving AI backend
**What:** All surviving AI features invoke `claude-coach`; there is no split-brain backend by page or mode.
**When to use:** Anywhere the app currently requests AI-generated output.
**Example:**
```javascript
// Source: src/components/chat/ChatPanel.jsx
const { data, error } = await client.functions.invoke("claude-coach", {
  body: payload,
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

### Pattern 2: Shared payload builder, mode-specific server behavior
**What:** Client surfaces prepare context through `buildCoachPayload`, then pass an explicit mode to the function.
**When to use:** Migrating Insights synthesis to Claude without duplicating payload logic in the page.
**Example:**
```javascript
// Source: src/lib/coachPayload.js
const payload = await buildCoachPayload({
  activities,
  dailyLogs,
  checkins,
  activePlan,
  trainingBlocks,
  runnerProfile,
  lang,
  mode: "insights_synthesis",
});
```

### Pattern 3: Hierarchical plan is the canonical runtime plan path
**What:** Plan generation, patching, and manipulation hang off `hierarchical_plans` and `useHierarchicalPlan`.
**When to use:** Any surviving plan-related UX after `WeeklyPlanPage` retirement.
**Example:**
```javascript
// Source: src/hooks/useHierarchicalPlan.js
const { data: invokeData, error: invokeError } = await client.functions.invoke("claude-coach", {
  body: payload,
  headers: { Authorization: "Bearer " + session.access_token },
});
```

### Anti-Patterns to Avoid
- **Half-retirement:** Removing `gemini-coach` files but leaving `InsightsPage` or tests still invoking it.
- **UI-only cleanup:** Hiding the weekly planner nav item while keeping `WeeklyPlanPage` import/wiring and test surface active.
- **Deployment blind spot:** Assuming git deletion removes the already deployed Supabase function.
- **Dual-contract AI function:** Keeping Claude chat and Gemini synthesis as parallel “temporary” backends after Phase 22.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proving deployed function removal | Custom ad hoc dashboard checklist | `supabase functions list` and `supabase functions delete` | The CLI already exposes canonical deployment state and deletion |
| AI payload assembly for surviving features | New per-page request shapers | `src/lib/coachPayload.js` | Existing payload windows already cover `chat` and `insights_synthesis` |
| Plan generation fallback path | A repurposed weekly-entry planner | Existing hierarchical plan generation in `claude-coach` + `useHierarchicalPlan` | Locked decision requires one plan data path |
| Legacy reference audit | Manual eyeballing | `rg`-based audit over `src`, `tests`, `supabase`, `docs` | Fast, repeatable, and plan-gateable |

**Key insight:** The complexity in this phase is coordination, not new logic. Reuse the existing Claude invoke pattern, shared payload builder, and CLI tooling instead of creating transitional abstractions.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None required for Phase 22 cleanup. Current Gemini weekly flow reads existing tables but does not introduce a separate persistent data model that must be migrated. | Code edit only |
| Live service config | Supabase may still have a deployed `gemini-coach` function even after local deletion. | Explicit runtime deletion with `supabase functions delete gemini-coach` and verification with `supabase functions list` |
| OS-registered state | None found. | None |
| Secrets/env vars | `GEMINI_API_KEY` is still mentioned in `CLAUDE.md` as historical setup guidance. Runtime code should no longer depend on it once `gemini-coach` is removed. `ANTHROPIC_API_KEY` remains required for `claude-coach`. | Code/doc update; optional secret cleanup outside repo after deployment cutover |
| Build artifacts | None found in repo that would preserve Gemini behavior after source deletion. | None |

## Common Pitfalls

### Pitfall 1: Deleting the folder but not the deployment
**What goes wrong:** `supabase/functions/gemini-coach` is removed from git, but the production project still serves `/functions/v1/gemini-coach`.
**Why it happens:** Supabase deployment state is separate from the local filesystem.
**How to avoid:** Make deployed-function deletion an explicit task with CLI verification before phase close.
**Warning signs:** `supabase functions list` still shows `gemini-coach`, or integration tests can still POST to it.

### Pitfall 2: Migrating nothing for Insights
**What goes wrong:** Cleanup removes Gemini, and the Insights synthesis callout silently disappears.
**Why it happens:** `claude-coach` currently handles `chat` and full-plan generation, but not `insights_synthesis`.
**How to avoid:** Treat the Insights migration as required scope, not optional follow-up.
**Warning signs:** `src/pages/InsightsPage.jsx` still invokes `"gemini-coach"` or `claude-coach` returns the wrong response shape.

### Pitfall 3: Leaving weekly planner state artifacts behind
**What goes wrong:** Route/nav removal happens, but `WEEKLY_PLAN_HANDOFF_KEY`, weekly-plan tests, and mock fixtures keep encoding the retired flow.
**Why it happens:** Phase 22 touches product topology, not just one page file.
**How to avoid:** Audit app navigation, session-storage handoff helpers, mock data comments, and active tests together.
**Warning signs:** `rg 'WeeklyPlanPage|WEEKLY_PLAN_HANDOFF_KEY|WeeklyAiCard' src tests docs` still returns active references.

### Pitfall 4: Preserving obsolete test contracts
**What goes wrong:** Tests still validate Gemini plan mode, philosophy admin, or weekly AI semantics after cleanup.
**Why it happens:** Legacy tests are often treated as “harmless history,” but locked decisions say active tests/docs count.
**How to avoid:** Delete or rewrite active tests in the same phase as code removal.
**Warning signs:** `tests/unit/gemini-instructions.test.jsx`, `tests/unit/weeklyplan*.test.jsx`, or Gemini describes in integration tests remain active.

## Code Examples

Verified patterns from the current codebase:

### Shared payload builder for a non-chat AI mode
```javascript
// Source: src/pages/InsightsPage.jsx + src/lib/coachPayload.js
const payload = await buildCoachPayload({
  activities,
  dailyLogs,
  checkins,
  activePlan: plans.plans[0] ?? null,
  trainingBlocks,
  runnerProfile,
  lang,
  mode: "insights_synthesis",
});
```

### Canonical frontend Claude invocation
```javascript
// Source: src/components/chat/ChatPanel.jsx
const { data, error: invokeError } = await client.functions.invoke("claude-coach", {
  body: payload,
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

### Deployment verification commands
```bash
supabase functions list --project-ref <project-ref>
supabase functions delete gemini-coach --project-ref <project-ref> --yes
supabase functions list --project-ref <project-ref>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Weekly AI generation for one visible week via `WeeklyPlanPage` + `gemini-coach` plan mode | Full-plan Claude generation stored in `hierarchical_plans` and consumed through `LongTermPlanPage` / `useHierarchicalPlan` | Phases 17-21 | Weekly-entry AI path is now legacy and should be removed |
| Gemini-backed analytics synthesis in `InsightsPage` | Claude-backed AI backend is the product direction | Locked by Phase 22 context on 2026-04-05 | Insights must migrate or be retired; Gemini exception is not allowed |
| Active tests encoding philosophy/playbook-era Gemini behavior | Active tests should validate only current Claude-era runtime surfaces | CLEAN-02 completed in Phase 17; Phase 22 finalizes the rest | Test suite must stop teaching old architecture |

**Deprecated/outdated:**
- `WeeklyPlanPage` as a runtime planning surface: deprecated by hierarchical plan viewer ownership.
- `gemini-coach` Edge Function: explicitly retired in this phase.
- `src/lib/instructionSnippets.js`: only useful while Gemini instruction-contract tests remain active.

## Open Questions

1. **Where should `insights_synthesis` live inside `claude-coach`?**
   - What we know: `claude-coach` currently dispatches `chat` separately and treats everything else as full-plan generation.
   - What's unclear: Whether to add a dedicated `payload.mode === "insights_synthesis"` branch or generalize mode dispatch more broadly.
   - Recommendation: Add an explicit `insights_synthesis` branch now; do not generalize beyond the surviving required modes in this phase.

2. **Should `WeeklyPlanPage.jsx` be deleted outright or left unused temporarily?**
   - What we know: Locked decisions require removing route/navigation/runtime wiring, not repurposing it.
   - What's unclear: Whether any non-retired shared planner components still depend on local helpers in that file.
   - Recommendation: Remove wiring first, then delete the file if no surviving imports remain; otherwise extract any still-needed pure helpers and delete the rest.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | local test/build commands | ✓ | 25.8.0 | — |
| npm | script execution | ✓ | 11.11.0 | — |
| Vitest | unit/component validation | ✓ | 3.2.4 | — |
| Playwright | integration/AI validation | ✓ | 1.58.2 | — |
| Supabase CLI | deployed function deletion and listing | ✓ | 2.78.1 | Supabase dashboard manual delete, but CLI is preferred |

**Missing dependencies with no fallback:**
- None found locally.

**Missing dependencies with fallback:**
- None found locally.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + Playwright 1.58.2 |
| Config file | `vitest.config.js` and Playwright config via npm scripts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm run test && npm run test:integration && npm run test:ai` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLEAN-01 | No runtime code or deployment uses `gemini-coach`; Insights uses Claude | unit + integration + manual CLI verification | `npm test -- --run`, `npm run test:integration` | ✅ |
| CLEAN-03 | No active weekly AI generation flow or `WeeklyPlanPage` runtime path remains | unit + app-shell navigation tests | `npm test -- --run` | ✅ |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm run test:integration`
- **Phase gate:** `npm run test && npm run test:integration` plus Supabase CLI verification that `gemini-coach` is absent

### Wave 0 Gaps
- [ ] Rewrite `tests/integration/edge-functions.spec.ts` to remove `gemini-coach` and `coach-philosophy-admin` contracts, replacing them with `claude-coach` and deployed-function absence checks.
- [ ] Replace or delete `tests/unit/weeklyplan.test.jsx` and `tests/unit/weeklyplan.rolling.test.jsx`; they currently preserve the retired page as an active contract.
- [ ] Delete or rewrite `tests/unit/gemini-instructions.test.jsx`; it is tied directly to a function being removed.
- [ ] Update `tests/unit/insights.test.jsx` so the synthesis callout expects Claude-backed invocation rather than a generic mocked Gemini-era contract.
- [ ] Add an audit test or scripted verification step that fails if active sources still reference `gemini-coach`, `WeeklyAiCard`, `WeeklyPlanPage`, or `useCoachPhilosophy`.

## Sources

### Primary (HIGH confidence)
- Local repo audit on 2026-04-05:
  - `src/App.jsx`
  - `src/pages/WeeklyPlanPage.jsx`
  - `src/pages/InsightsPage.jsx`
  - `src/components/chat/ChatPanel.jsx`
  - `src/lib/coachPayload.js`
  - `src/hooks/useHierarchicalPlan.js`
  - `tests/integration/edge-functions.spec.ts`
  - `tests/unit/weeklyplan.test.jsx`
  - `tests/unit/gemini-instructions.test.jsx`
  - `tests/unit/insights.test.jsx`
- Supabase CLI local help (`supabase 2.78.1`)
  - `supabase functions`
  - `supabase functions delete --help`
  - `supabase functions list --help`

### Secondary (MEDIUM confidence)
- Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Supabase CLI reference landing page: https://supabase.com/docs/reference/cli/supabase-snippets-list

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses the existing repo stack and locally verified tool availability; no new dependency research was required.
- Architecture: HIGH - driven by locked Phase 22 decisions and direct code audit of current invoke paths and plan ownership.
- Pitfalls: HIGH - derived from concrete repo findings plus verified Supabase CLI behavior.

**Research date:** 2026-04-05
**Valid until:** 2026-05-05
