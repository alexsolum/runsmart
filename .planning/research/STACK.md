# Stack Research

**Domain:** Claude AI coaching backend + hierarchical plan data model + drag-and-drop plan UI (v2.0)
**Researched:** 2026-03-29
**Confidence:** HIGH — all conclusions drawn from official Anthropic SDK docs, Supabase Edge Function docs, npm package pages, and the live project codebase. No speculative additions.

---

## Summary of New vs Existing

This is a **backend + data model + UI milestone**. Three distinct areas require new stack decisions. Everything in the existing `package.json` (React 18, Tailwind v4, shadcn/ui, Radix, Recharts, Framer Motion, Supabase JS v2) is unchanged and should NOT be reinstalled. The decisions below cover only what is genuinely new.

| Area | New Requirement | Resolution |
|------|-----------------|------------|
| Claude API in Deno Edge Functions | `npm:@anthropic-ai/sdk` via npm: specifier | New — not currently installed |
| Drag-and-drop workout cards | `@dnd-kit/core` + `@dnd-kit/sortable` | New — not currently installed |
| Hierarchical plan data model | JSONB column on `training_plans` table | Supabase migration only — no new library |
| Zone visualization in workout modal | Recharts `RadialBarChart` or CSS bars | Already installed — no new dependency |
| Streaming coaching responses | `ReadableStream` + SSE from Edge Function | Web API built into Deno — no new library |

---

## Recommended Stack (Additions Only)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@anthropic-ai/sdk` | `0.80.0` (latest as of 2026-03-29) | Claude API client for Deno Edge Functions | Official Anthropic TypeScript SDK. Supports Deno v1.28+ via `npm:` specifier natively. Handles streaming SSE responses, auto-retries, and type-safe message construction. The existing `gemini-coach` function calls the Gemini REST API with raw `fetch` — switching to the SDK eliminates manual header/auth plumbing. |
| `@dnd-kit/core` | `6.3.1` | Drag-and-drop context and collision detection | The modern standard for React drag-and-drop. Lightweight (~10 kB gzipped), framework-first, zero external dependencies. Supports pointer and keyboard sensors (accessible). Works with React 18 concurrent mode. Explicitly supports multi-container drag scenarios (workouts between days in the 7-day grid). |
| `@dnd-kit/sortable` | `10.0.0` | Sortable preset — handles day-column reordering logic | Companion preset to `@dnd-kit/core`. Provides `useSortable` hook, `SortableContext`, and `arrayMove` utility. Required for the reorder-within-column pattern and move-between-columns pattern. Peer-depends on `@dnd-kit/core@6`. |
| `@dnd-kit/utilities` | `3.2.2` | CSS transform helpers for drag animations | Provides `CSS.Transform.toString()` used in `useSortable` transform binding. Required when rendering drag ghost with correct position offset. |

### PostgreSQL / Supabase Schema Additions

| Change | Mechanism | Why |
|--------|-----------|-----|
| Add `plan_document JSONB` column to `training_plans` | Supabase migration | Stores the full hierarchical plan (phases → weeks → days → workouts) as a single AI-generated document. Read as a whole on plan load; never queried field-by-field from the frontend. JSONB binary storage and GIN index available if partial queries are needed later. |
| Add `generated_at TIMESTAMPTZ` column to `training_plans` | Supabase migration | Timestamp for last AI generation. Drives "regenerate plan" affordance in UI — compare against latest activity date. |
| Keep existing `weekly_plan_entries` table unchanged | — | The click-to-edit workflow (Phase 15) writes to `weekly_plan_entries`. The new hierarchical plan can feed week-level intent from `plan_document` while `weekly_plan_entries` remains the day-level editable state. These two systems coexist: plan document = AI-authored intent, entries = athlete-confirmed execution. |

No new tables are required. The existing `coach_conversations` + `coach_messages` tables (from the 2026-02-26 migration) are already the correct schema for conversational coaching chat — no changes needed there.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@dnd-kit/utilities` | `3.2.2` | `CSS.Transform.toString()` for drag position | Always install with `@dnd-kit/core` + `@dnd-kit/sortable`. Required to bind `transform` style in `useSortable` — omitting it causes compile errors. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Deploy Edge Function `claude-coach` | Already in use. `supabase functions deploy claude-coach --no-verify-jwt` matches the existing `gemini-coach` pattern. |
| `deno.json` per Edge Function | Declare `npm:@anthropic-ai/sdk` dependency | Supabase recommends a function-level `deno.json` for isolation. Create at `supabase/functions/claude-coach/deno.json`. |

---

## Claude Model Selection

**Recommended: `claude-sonnet-4-6`** (alias — always resolves to latest Sonnet 4.6 snapshot)

| Model | API ID | Input cost | Output cost | Max output | Use case |
|-------|--------|-----------|-------------|------------|----------|
| Sonnet 4.6 | `claude-sonnet-4-6` | $3/MTok | $15/MTok | 64k tokens | Full plan generation + conversational coaching |
| Haiku 4.5 | `claude-haiku-4-5` | $1/MTok | $5/MTok | 64k tokens | Simple follow-up chat messages |

**Rationale for Sonnet 4.6:**
- Full training plan generation (all phases + weeks) can easily consume 8,000–16,000 output tokens. Haiku's quality degrades on structured JSON output at this scale.
- Sonnet 4.6 supports adaptive thinking (recommended mode), which will internally reason through periodization before outputting JSON — no separate extended thinking budget required.
- 64k output tokens is sufficient for a complete 16–24 week plan with daily workout details.
- $3/$15 per MTok is cost-acceptable for a personal training app with infrequent plan generation calls.

**For conversational coaching follow-ups:** Use `claude-haiku-4-5` when the message is a short Q&A (< 500 output tokens) to save cost. The Edge Function can select model dynamically based on request type.

---

## Edge Function Architecture

The new `claude-coach` function replaces `gemini-coach`. Pattern is identical to the existing function:

```typescript
// supabase/functions/claude-coach/index.ts
import Anthropic from "npm:@anthropic-ai/sdk@0.80.0";

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
});

// For full plan generation (non-streaming):
const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  system: SKILL_SYSTEM_PROMPT,
  messages: [{ role: "user", content: userPrompt }],
});

// For conversational coaching (streaming):
const stream = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  stream: true,
  messages: conversationHistory,
});
// Stream SSE back to frontend via ReadableStream
```

**Key difference from gemini-coach:** The Anthropic SDK handles auth headers, retries, and response parsing automatically. No manual `fetch` with `Authorization` header required.

**Streaming:** The Anthropic SDK's async iterator pattern (`for await (const event of stream)`) is compatible with Deno's `ReadableStream` constructor. SSE back to the React frontend uses the same `text/event-stream` content-type pattern already established in the codebase.

---

## Drag-and-Drop Implementation Pattern

The 7-day grid (one column per day) requires **multi-container sortable** — the most complex dnd-kit pattern. This is the documented use case for `SortableContext` + `DndContext.onDragOver`.

```jsx
// Pattern for moving workouts between day columns:
// 1. DndContext wraps the entire 7-day grid
// 2. One SortableContext per day column, receiving that day's workout IDs
// 3. useSortable hook on each WorkoutCard
// 4. onDragOver detects container change → optimistic state update
// 5. onDragEnd commits to Supabase via useWorkoutEntries.moveEntry()
```

**DragOverlay** is required here because the grid is scrollable. Without it, the drag ghost clips at the scroll boundary.

---

## Installation

```bash
# Frontend — drag-and-drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Edge Function — Anthropic SDK declared in deno.json (not npm install)
# Create supabase/functions/claude-coach/deno.json with:
# { "imports": { "npm:@anthropic-ai/sdk": "npm:@anthropic-ai/sdk@0.80.0" } }
# Then import in index.ts: import Anthropic from "npm:@anthropic-ai/sdk";
```

```bash
# Supabase secret (set in Supabase dashboard, not in code):
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | `@hello-pangea/dnd` (react-beautiful-dnd fork) | `@hello-pangea/dnd` is better for simple vertical/horizontal list reordering. However it explicitly does NOT support grid layouts. The 7-day column grid requires cross-container moves in a grid context — dnd-kit handles this natively. `@hello-pangea/dnd` would require a workaround. |
| `@dnd-kit/core` + `@dnd-kit/sortable` | `react-dnd` (HTML5 backend) | `react-dnd` works but is architecturally heavier (context + backend + connector pattern) with more boilerplate. dnd-kit is the modern successor with smaller bundle size and better React 18 compatibility. |
| `npm:@anthropic-ai/sdk` in Deno | Raw `fetch` to `api.anthropic.com` | Raw fetch works and mirrors the existing Gemini pattern. However the SDK adds: automatic retries on 429/5xx, correct `anthropic-version` header management, typed response objects, streaming helpers, and future compatibility with new API features (batching, files, MCP). SDK overhead is minimal in a Deno context. |
| JSONB `plan_document` column on `training_plans` | New normalized tables: `plan_phases`, `plan_weeks`, `plan_days` | Normalized tables provide better query flexibility but add 3 migration files, 3 sets of RLS policies, and multiple foreign-key joins on every plan load. The plan document is always read as a whole (never queried by individual week or workout from frontend). JSONB is the correct choice for a document that moves as a unit. Add normalized tables only if analytics queries across plans become a requirement. |
| `claude-sonnet-4-6` for plan generation | `claude-haiku-4-5` for all calls | Haiku is 3x cheaper but produces lower quality structured JSON for long multi-week plans. Acceptable for conversational follow-ups (< 500 tokens). Unacceptable for 16-week periodized plan generation where schema conformance and detail depth matter. Use both: Sonnet for generation, Haiku for chat. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `esm.sh` for Anthropic SDK in Edge Functions | Supabase 2025 docs explicitly recommend `npm:` specifier over CDN URLs. ESM.sh can have version drift and reliability issues on cold starts. | `import Anthropic from "npm:@anthropic-ai/sdk@0.80.0"` |
| `framer-motion` for drag-and-drop animations | `framer-motion` is already in `package.json` but its drag primitives (`useDrag`, `Reorder`) are not compatible with dnd-kit's sensor/overlay architecture. Mixing both creates conflicting pointer event handlers. Use dnd-kit for drag, Framer Motion only for non-drag animations (card reveal, modal entry). | `@dnd-kit/core` with CSS `transform` + `transition` |
| `react-beautiful-dnd` | Unmaintained (last release 2022). `@hello-pangea/dnd` is the community fork but has the same grid limitation. | `@dnd-kit/core` + `@dnd-kit/sortable` |
| New Supabase tables for plan hierarchy | Adds migration complexity, RLS policy proliferation, and multiple joins for a document always read as a whole. | `JSONB plan_document` column on `training_plans` |
| `claude-3-7-sonnet-20250219` | Retired as of March 2026 — all requests return an error. | `claude-sonnet-4-6` |
| `gemini-2.5-flash` (keep alongside Claude) | Two AI providers means two secrets, two billing accounts, two failure modes, two prompt formats to maintain. Replacing gemini-coach entirely removes this complexity. The `gemini-coach` Edge Function can be deprecated after `claude-coach` is validated. | `claude-coach` Edge Function |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@anthropic-ai/sdk@0.80.0` | Deno v1.28+ | Confirmed in official SDK docs. Use `npm:` specifier — not `esm.sh` or `deno.land/x`. |
| `@anthropic-ai/sdk@0.80.0` | `claude-sonnet-4-6` model | Model ID `claude-sonnet-4-6` is a stable alias — safe for production. |
| `@dnd-kit/core@6.3.1` | `react@18.3.1` | Confirmed compatible. dnd-kit 6.x was designed for React 18 concurrent mode. No React 19 issues at current project version. |
| `@dnd-kit/sortable@10.0.0` | `@dnd-kit/core@6.3.1` | Peer dependency. Must install matching major versions. `sortable@10` requires `core@6`. |
| `@dnd-kit/utilities@3.2.2` | `@dnd-kit/core@6.3.1` | Peer dependency. Required for `CSS.Transform.toString()` in `useSortable` binding. |
| `@dnd-kit/core@6.3.1` | `framer-motion@12.38.0` | Compatible at the package level — both in the same app. Do NOT mix Framer Motion's `Reorder` component with dnd-kit's `DndContext` on the same elements. Use one or the other per interactive region. |
| `tailwindcss@4.2.1` | `@dnd-kit/core@6.3.1` | No conflict. dnd-kit applies inline styles for drag transforms — Tailwind classes remain unaffected. |

---

## Integration Points

**Edge Function `claude-coach`:** Create at `supabase/functions/claude-coach/`. Match the `verify_jwt = false` pattern from `gemini-coach/config.toml` — the JWT verification is handled manually inside the function body using the Supabase client. Add `ANTHROPIC_API_KEY` to Supabase dashboard secrets. The function accepts the same request shape as `gemini-coach` where possible to minimize frontend changes.

**Frontend `useCoach` hook / `AppDataContext`:** The existing `gemini-coach` invocation in the coach hook will point to `claude-coach` instead. Response shape should be kept identical (array of insight objects) for the `insights` call type. The plan generation call type will return the hierarchical `plan_document` JSON to be stored via `usePlans.savePlanDocument()`.

**`training_plans` table migration:** Add `plan_document JSONB DEFAULT NULL` and `generated_at TIMESTAMPTZ DEFAULT NULL` columns. No RLS changes required — existing per-user `training_plans` policies already cover the new columns.

**`WorkoutCard` drag integration:** The existing `WorkoutCard` component (built in Phase 14–15) becomes a `useSortable` consumer. Wrap it with `setNodeRef`, `listeners`, `attributes`, and `transform` style. The `DndContext` wraps the 7-day grid at the week-row level. `onDragEnd` calls `useWorkoutEntries.moveEntry(fromDay, toDay, entryId)`.

**Zone visualization in workout modal:** Use `recharts` `RadialBarChart` for a donut-style zone distribution display (matching the claude-coach HTML viewer reference). Recharts is already installed at 3.7.0. No new chart library needed.

---

## Sources

- [TypeScript SDK — Anthropic official docs](https://platform.claude.com/docs/en/api/sdks/typescript) — Deno support confirmed, `npm:` specifier pattern, version 0.80.0 (HIGH confidence — official docs, fetched 2026-03-29)
- [Models overview — Anthropic official docs](https://platform.claude.com/docs/en/about-claude/models/overview) — `claude-sonnet-4-6` API ID, pricing, output limits (HIGH confidence — official docs, fetched 2026-03-29)
- [Managing dependencies — Supabase Docs](https://supabase.com/docs/guides/functions/dependencies) — `npm:` specifier recommended over `esm.sh` (HIGH confidence — official docs)
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) — version 6.3.1, React 18 compatibility (MEDIUM confidence — npm page, corroborated by GitHub)
- [@dnd-kit/sortable npm](https://www.npmjs.com/package/@dnd-kit/sortable) — version 10.0.0, peer dependency on core@6 (MEDIUM confidence — npm page)
- [dnd-kit GitHub maintenance issue #1194](https://github.com/clauderic/dnd-kit/issues/1194) — closed February 2026, project actively maintained (MEDIUM confidence — GitHub issue)
- [Puck Editor: Top 5 DnD Libraries 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) — grid layout limitation of `@hello-pangea/dnd` confirmed (MEDIUM confidence — industry blog)
- `C:/Users/HP/Documents/Koding/Runsmart/runsmart/package.json` — all existing installed versions (HIGH confidence — project file)
- `supabase/migrations/20260226_coach_conversations.sql` — existing `coach_conversations` + `coach_messages` schema (HIGH confidence — project file)
- `supabase/functions/gemini-coach/index.ts` — existing Edge Function pattern for replacement reference (HIGH confidence — project file)

---
*Stack research for: RunSmart v2.0 — Claude Coach + Plan Overhaul*
*Researched: 2026-03-29*
