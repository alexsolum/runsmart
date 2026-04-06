# Plan Intake Modal Redesign

**Date:** 2026-04-06  
**Status:** Approved

## Problem

1. **Bug:** Generating a plan throws `{"error":"History load failed: column coach_conversations.role does not exist"}`. The old migration (`20260226_coach_conversations.sql`) created `coach_conversations` as a conversation-header table (no `role`, `session_id`, or `content` columns). The new Agent Skills flat-message schema is defined in `20260405180000_coach_conversations.sql` but its `CREATE TABLE` fails silently because the old table already exists.

2. **UX:** The `PlanIntakeModal` is too tall to fit on screen (requires 50% zoom to use).

3. **Missing features:**
   - No Ultra distance option
   - No race-specific AI preview/research
   - Form not aligned with assessment methodology (missing goal type, longest recent run, unified schedule grid)

---

## Solution

### 1. Database migration fix

Update `supabase/migrations/20260405180000_coach_conversations.sql` to safely replace the old schema:

```sql
-- Drop old schema (messages table first due to FK, then conversations)
DROP TABLE IF EXISTS coach_messages;
DROP TABLE IF EXISTS coach_conversations;

-- Create new flat schema (one row per message turn)
CREATE TABLE coach_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  uuid not null,
  role        text not null check (role in ('user', 'assistant')),
  content     jsonb not null,
  created_at  timestamptz default now()
);
-- ... indexes and RLS policies (unchanged)
```

Also apply this migration to the live database via `mcp__supabase__apply_migration`.

---

### 2. PlanIntakeModal — 2-step wizard

Replace the current single-scroll form with a 2-step wizard. Each step fits on screen without scrolling.

#### Step 1 — Race Goal

| Field | Type | Notes |
|-------|------|-------|
| Race name | Text input + "Look up →" button | Triggers `race_info` API call on click |
| Race info card | Read-only preview | Shown after lookup: distance, elevation, terrain, training implications |
| Race date | Date input | Required |
| Goal distance | Select | 5K / 10K / Half Marathon / Marathon / Ultra (custom km) |
| Ultra distance (km) | Number input | Shown only when "Ultra" is selected |
| Goal type | Toggle: Finish it / Target time | Informs plan intensity/pacing guidance |

#### Step 2 — Your Fitness & Schedule

| Field | Type | Notes |
|-------|------|-------|
| Current weekly km | Number input | Pre-filled from Strava (italicised, labelled "From Strava") |
| Longest recent run (km) | Number input | New — helps Claude assess gap to race distance |
| Weekly schedule grid | 7-day interactive grid | See below |
| Racing history & background | Textarea | Pre-filled from runner profile |
| Injuries / constraints | Textarea | Optional |

**Weekly schedule grid:**
- 7 buttons (Mon–Sun), each cycles: **Off → Easy → Hard → Long → Off**
- Colour-coded: Off=grey, Easy=green, Hard=blue, Long=amber
- Only one "Long" day allowed (selecting Long on a new day clears the previous)
- Live summary bar below grid: `N training days · Hard: Tue, Thu · Long run: Sat · Rest: Mon, Fri`
- Replaces the three separate fields: training days/week, hard days, rest day selector
- Pre-populated using the existing `extractConstraintDaysFromWorkoutEntries(workoutEntries.entries)` logic: days with non-Easy/Recovery entries → Hard, days with Rest entries → Off. Runs on modal open, same as current form.

---

### 3. Payload changes

`generatePlan(payload)` in `useHierarchicalPlan.js` passes `athleteContext` to the edge function. Add:

```js
athleteContext: {
  planIntake: {
    raceGoal: {
      eventName: raceName,
      eventDate: raceDate,
      eventType: mapDistanceToEventType(goalDistance),  // now includes "ultra"
      ultraDistanceKm: goalDistance === "Ultra" ? Number(ultraKm) : null,
      goalType: goalType,   // "finish" | "time"
    },
    fitness: {
      weeklyKm: Number(weeklyKm),
      longestRecentRun: longestRun ? Number(longestRun) : null,
    },
    constraints: {
      hardDays: hardDays,       // derived from grid
      restDays: restDays,       // derived from grid
      longRunDay: longRunDay,   // derived from grid
      maxSessions: trainingDayCount,  // derived from grid
    },
    background: background,
    raceInfo: raceInfo,   // from race_info API call (null if not looked up)
  },
  activePlan: null,
},
```

`mapDistanceToEventType` gains: `"Ultra" → "ultra"`.

---

### 4. Edge function — `race_info` mode

Add a new lightweight mode to `claude-coach/index.ts`:

**Request:**
```json
{ "mode": "race_info", "raceName": "UTMB" }
```

**Implementation:** Single non-streaming Claude call (~300 max tokens, no Skills API, no history). System prompt instructs Claude to return a JSON object:

```json
{
  "displayName": "UTMB — Ultra-Trail du Mont-Blanc",
  "distanceKm": 171,
  "elevationGainM": 10000,
  "terrain": "Mountain trails, technical, high altitude",
  "location": "Chamonix, France",
  "keyFacts": "Mandatory gear, ~40–46hr cutoff, altitude 2500m+. Plan needs substantial vert and mountain-specific training."
}
```

**Response to frontend:** `{ raceInfo: { ... } }` — displayed in the preview card. Also injected verbatim into the plan generation `athleteContext.planIntake.raceInfo`.

**Auth:** Same JWT Bearer verification as all other modes. The frontend calls this using `supabase.functions.invoke("claude-coach", { body: { mode: "race_info", raceName }, headers: { Authorization: "Bearer " + session.access_token } })` — the session is already available at this point since the modal is behind the auth gate. Returns `{ raceInfo: null }` gracefully if the race is unknown or the call fails.

---

### 5. Step 3 — Inline assessment Q&A

After the user clicks "Next" on Step 2, the modal enters Step 3 — a lightweight chat exchange where Claude validates its assessment before generating the plan.

**Flow:**
1. The intake payload is sent to `claude-coach` using the standard chat mode with a fresh `sessionId`. The system prompt includes the full intake as `athleteContext` and instructs Claude to follow the `assessment.md` validation approach: ask 1–2 focused questions about key assumptions (e.g. gap between current volume and race distance, reason for lower recent training, strengths/limiters).
2. Claude responds with `type: "conversation"` — one concise question shown in the modal as a coach message bubble.
3. User types their answer in a text field and hits "Send". The answer is sent as the next turn in the same session.
4. Claude may ask one follow-up, or proceed directly to plan generation (`type: "full-plan"`).
5. When a `full-plan` response arrives: modal switches to the existing generating spinner, plan is saved, modal closes.

**UI for Step 3:**
- Header: "A few questions first"
- Scrollable message list (coach bubbles + user replies) — max ~3 exchanges
- Text input + "Send" button
- "Skip Q&A — generate anyway" link at bottom: sends a fixed follow-up message (`"No further context — please generate the plan now."`) to force plan generation on the next turn
- Back button returns to Step 2 (clears the session)

**Edge function — no new mode needed.** The existing chat mode handles this. The system prompt for this session is set to:

```
You are an expert running coach. The athlete has submitted an intake form to generate a training plan.
Your job is to ask 1–2 targeted assessment questions to validate your key assumptions before generating
the plan — following the assessment validation approach (see athlete context). Keep questions concise
and specific. After receiving answers (or after 2 exchanges), generate the full plan immediately using
the full-plan response format.
```

**`useHierarchicalPlan.js` changes:**
- `generatePlan()` is split into two phases:
  - `startPlanSession(payload)` — creates a sessionId, sends the intake as the first message, returns Claude's opening question. Sets `state.planSessionId`.
  - `sendPlanMessage(sessionId, message)` — sends a follow-up message; if the response is `type: "full-plan"`, saves the plan and resolves; otherwise returns the next question string.
- Both use the existing `client.functions.invoke("claude-coach", ...)` call.

---

### 6. Plan generation prompt update

The first message sent by `startPlanSession` is explicit about the race:

```
The athlete wants to generate a training plan. Here is their intake:
Race: [eventName], [distanceKm]km, on [eventDate]. Goal: [finish / target time].
Current weekly volume: [weeklyKm]km. Longest recent run: [longestRun]km.
[If raceInfo]: Race characteristics: [keyFacts].
Please ask your assessment questions now, then generate the full plan once satisfied.
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260405180000_coach_conversations.sql` | Add DROP TABLE IF EXISTS before CREATE TABLE |
| `supabase/functions/claude-coach/index.ts` | Add `race_info` mode handler |
| `src/components/PlanIntakeModal.jsx` | Full rewrite as 3-step wizard (form → form → Q&A) |
| `src/hooks/useHierarchicalPlan.js` | Split `generatePlan` into `startPlanSession` + `sendPlanMessage`; update payload shape |

## Out of Scope

- Target time input field (goal type toggle is present but time input is deferred — Claude will ask via chat)
- Web search for race info (Claude's built-in knowledge used; unknown races return gracefully)
- Persisting the race info card in the DB
