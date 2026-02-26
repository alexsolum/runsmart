# Agent Task Backlog

Purpose:
This file contains tasks an AI coding agent can execute autonomously.
Work sequentially unless priorities specify otherwise.
Avoid unnecessary questions — assume reasonable defaults.
Only stop if blocked or if an action may cause data loss/security issues.

---

## 🧭 Project Context
Tech stack:
- Frontend: Tailwind CSS
- Backend: Supabase
- Database: Supabase
- Deployment: Vercel
- Key integrations/APIs: Supabase Auth, Strava, Gemini AI 

Coding standards:
- Language/style preferences: None
- Testing expectations: all new fatures should have new tests which should be tested and pass before pushing to Git
- Documentation expectations: None

Allowed actions:
- Edit/create/delete files
- Install dependencies
- Run builds/tests
- Refactor code
- Update docs
(Only pause for destructive or risky actions.)

---

## 🔥 Priority Tasks (Current Sprint)

### [ ] TASK-003 – AI Coach chat history & conversational follow-ups ("Marius AI Bakken")

Goal: Transform the Coach page from a one-shot insight generator into a persistent, conversational coaching experience with chat history, follow-up questions, and a branded coach persona.

Context:
Currently the Coach page fetches a fresh set of coaching insights each time the user clicks "Refresh coaching". Responses are cached only in `sessionStorage` and lost on reload. There is no way to ask follow-up questions, request modifications, or review past coaching conversations. This task adds persistent chat history (similar to ChatGPT / Claude conversation lists), the ability to continue a conversation with follow-ups, and rebrands the coach as "Marius AI Bakken" with a custom visual identity inspired by the real coach Marius Bakken.

Requirements:

**1. Database — New `coach_conversations` and `coach_messages` tables**
- Create a Supabase migration adding two new tables:
  ```sql
  CREATE TABLE coach_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New conversation',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE coach_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES coach_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- Add RLS policies so users can only access their own conversations and messages.
- The `content` column stores:
  - For `assistant` role: the existing insights array `[{ type, icon, title, body }]` or a plain text response for follow-ups.
  - For `user` role: `{ text: "user's follow-up question" }` or `{ type: "initial_request" }` for the first coaching fetch.

**2. Hook — `useCoachConversations.js`**
- New hook in `src/hooks/` providing:
  - `conversations` — list of conversations (id, title, created_at, updated_at), ordered by `updated_at DESC`
  - `activeConversation` — currently selected conversation (null = new)
  - `messages` — messages for the active conversation, ordered by `created_at ASC`
  - `loadConversations()` — fetch conversation list for user
  - `loadMessages(conversationId)` — fetch messages for a conversation
  - `createConversation(title)` — create new conversation, return id
  - `addMessage(conversationId, role, content)` — insert a message
  - `updateConversationTitle(id, title)` — rename a conversation
  - `deleteConversation(id)` — delete a conversation and its messages (CASCADE)
  - `setActiveConversation(id | null)` — switch active conversation
- Add to `AppDataContext.jsx` so it's available via `useAppData()`.
- Update `makeAppData()` in `tests/mockAppData.js` with mock data and functions.

**3. Coach page UI redesign**
- **Left sidebar / conversation list panel:**
  - "New conversation" button at the top.
  - List of past conversations showing title and relative date (e.g., "2 days ago").
  - Click to load and display a past conversation.
  - Delete button (with confirmation) on each conversation.
  - On mobile (< 600px): collapsible panel or slide-out drawer.
- **Main chat area:**
  - Display the conversation as a vertical message thread:
    - Assistant messages render insight cards (same `InsightCard` component) for structured insights, or styled text blocks for follow-up responses.
    - User messages render right-aligned chat bubbles showing the follow-up question text.
    - The initial coaching request shows as a system-style message: "Coaching analysis requested".
  - At the bottom: a text input field + send button for follow-up questions.
  - When a conversation is empty / new: show the existing "Refresh coaching" button to trigger initial analysis.
- **Coach branding — "Marius AI Bakken":**
  - Replace the page title / header with "Marius AI Bakken" and a subtitle like "Your AI running coach".
  - Create a simple coach avatar/graphic component (`src/components/CoachAvatar.jsx`):
    - SVG or CSS-based illustration of a male runner/coach figure.
    - Visual cues inspired by Marius Bakken: slim build, Norwegian aesthetic, running attire.
    - Used in the page header and as the avatar next to assistant messages in the chat thread.
  - Use the existing color tokens — primary blue for the coach's accent color.

**4. Follow-up conversation flow**
- When the user types a follow-up question and sends:
  1. Save the user message to `coach_messages`.
  2. Build a payload for the `gemini-coach` Edge Function that includes:
     - The full conversation history (all prior messages in the conversation).
     - The same training context (weekly summaries, activities, plan context, daily logs, runner profile) as the initial request.
     - The user's follow-up question.
  3. Call the Edge Function.
  4. Save the assistant response as a new message in `coach_messages`.
  5. Display the response in the chat thread.
- Update the `gemini-coach` Edge Function to handle two modes:
  - **Initial analysis** (existing behavior): returns structured insights array.
  - **Follow-up** (new): receives conversation history + follow-up question, returns a text response (or modified insights). The system prompt should instruct Gemini to respond conversationally while staying in the coaching persona.
  - Detect mode via a `mode` field in the request body: `"initial"` vs `"followup"`.

**5. Conversation title auto-generation**
- After the first assistant response, auto-generate a short title for the conversation based on the coaching focus (e.g., "Week 12 Build Phase Review" or "Recovery Week Guidance").
- Can be derived from the first insight title or a simple heuristic — no need for an extra AI call.

**6. Session storage migration**
- Remove the current `sessionStorage` caching of insights.
- All coaching data now persists in Supabase.

**7. Tests**
- New test file: `tests/coach.test.jsx` covering:
  - Conversation list rendering (empty state, populated list).
  - Creating a new conversation.
  - Loading and displaying messages from a past conversation.
  - Sending a follow-up question (mock Edge Function call).
  - Coach avatar rendering.
  - Deleting a conversation.
- Update existing coach-related tests if any exist.

Acceptance criteria:
- Coaching conversations persist in Supabase and are available across devices.
- Users can view a list of past coaching conversations on the Coach page.
- Users can click a past conversation to see the full message thread.
- Users can send follow-up questions and receive conversational responses from the AI coach.
- The coach is branded as "Marius AI Bakken" with a custom avatar graphic.
- Conversations can be deleted.
- The initial coaching analysis flow still works (structured insight cards).
- All new and existing tests pass.

Files to create:
- `supabase/migrations/20260226_coach_conversations.sql`
- `src/hooks/useCoachConversations.js`
- `src/components/CoachAvatar.jsx`
- `tests/coach.test.jsx`

Files to modify:
- `src/pages/CoachPage.jsx` (major rewrite)
- `supabase/functions/gemini-coach/index.ts` (add follow-up mode)
- `src/context/AppDataContext.jsx` (add coachConversations)
- `tests/mockAppData.js` (add coachConversations mock)

---

### [x] TASK-001 – Save runner context in the Supabase database - connect to the user that is logged in
Goal: I want the runner context (runner background and goal of plan) to be saved so that it is available across plattforms/devices.

Context:
This will provide extra data to the AI Coach to give better recommendations.

Requirements:
- Save runner background in Supabase database
- Save goal for the current plan in Supabase database

Acceptance criteria:
- Runner background and goal of current plan is stored in the database and available in the interface across various devices

Notes (optional):
Goal of current plan should be stored on the "training plan" page, runner background should be stored in the "coach" page

---

### [x] TASK-002 – Use tailwind css across all pages
Goal: Have a consistent design across all pages. Tailwind has been added to the main page "Dashboard", but not on the other pages.

Context: I want a consistent and nice user interface using Tailwind across all pages.

Requirements: Tailwind CSS used on all subpages.
-

Acceptance criteria: Consistent user interface on all subpages.
-

Notes:

---

## 🧊 Backlog (Lower Priority)

### [x] TASK-010 – Add more context of the workout that has been done
Under "recent activity" on the Dashboard page, please add more context about the completed workouts. For instance: Time of day, duration, average hearthrate (with icon describing the effort of the workout)



---

## 🐞 Bugs / Technical Debt

### [ ] BUG-002 – Insufficient margins on most page components

Observed behavior: Most components across the app look visually cramped — there is not enough margin between elements, causing cards, sections, and form groups to feel squeezed together. This affects multiple pages.

Expected behavior: Consistent, comfortable spacing between all major UI elements across all pages. Cards should have clear separation from each other. Form groups should have breathing room. Section headers should have appropriate top/bottom margins.

Where to look:
- All pages: `CoachPage.jsx`, `HeroPage.jsx`, `LongTermPlanPage.jsx`, `WeeklyPlanPage.jsx`, `InsightsPage.jsx`, `DailyLogPage.jsx`, `DataPage.jsx`
- Layout components: `Sidebar.jsx`, `Topbar.jsx`
- Global styles: `src/styles/index.css`, `src/styles/tokens.css`
- Tailwind utility classes used inline in page components

Investigation approach:
1. Use the Chrome extension for Claude in VS Code to visually inspect each page.
2. Systematically check the following spacing areas on each page:
   - Margin between the page header and the first content section
   - Margin between sibling cards / panels
   - Margin between form fields within a card
   - Padding inside cards
   - Margin between the sidebar and main content area
   - Bottom margin on the last element (avoid content touching the page bottom)
3. Document which specific elements need adjustment before making changes.
4. Apply fixes using Tailwind utility classes (e.g., `mb-4`, `space-y-4`, `gap-4`) — prefer Tailwind over custom CSS.
5. Ensure responsive breakpoints (960px tablet, 600px mobile) still look correct after changes.

Acceptance criteria:
- All pages have visually consistent and comfortable spacing between elements.
- No components appear cramped or overlapping.
- Changes verified visually using the Chrome plugin for Claude in VS Code.
- All existing tests pass after styling changes.

---

### [ ] BUG-003 – Saving "Goal for this plan" fails with schema cache error

Observed behavior: When saving the "Goal for this plan" field on the Training Plan page, the following error is displayed: `"Could not find the 'goal' column of 'training_plans' in the schema cache"`.

Expected behavior: The goal text saves successfully to the `training_plans` table and persists across page reloads and devices.

Root cause analysis:
The migration file `supabase/migrations/20260225_runner_profile_and_plan_goal.sql` adds the `goal` column via `ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS goal TEXT;`. However, this migration may not have been applied to the live Supabase database, or the Supabase PostgREST schema cache has not been refreshed after the column was added. The Supabase JS client relies on PostgREST, which caches the database schema. If the column exists in the migration file but PostgREST doesn't know about it, all queries referencing `goal` will fail with this error.

The code path is:
1. `LongTermPlanPage.jsx` → `handleSaveGoal()` calls `plans.updatePlan(selectedPlanId, { goal: goalDraft || null })`
2. `usePlans.js` → `updatePlan(id, patch)` runs `client.from("training_plans").update(patch).eq("id", id).select().single()`
3. Supabase PostgREST rejects the request because `goal` is not in its schema cache.

Fix steps:
1. **Apply the migration to the live database:** Use the Supabase MCP tool or Supabase dashboard to run the migration SQL:
   ```sql
   ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS goal TEXT;
   ```
2. **Reload the PostgREST schema cache:** After adding the column, send a schema cache reload signal. This can be done via:
   - Supabase Dashboard → Settings → API → "Reload schema cache" button
   - Or via the Supabase Management API: `NOTIFY pgrst, 'reload schema'`
   - Or by running the SQL command: `NOTIFY pgrst, 'reload schema';` in the SQL editor
3. **Verify the fix:** After applying, test that:
   - `updatePlan(id, { goal: "test" })` succeeds without errors
   - The goal value persists after page reload
   - The goal value is available on the Coach page (via `activePlan?.goal`)

Notes:
- The code in `usePlans.js` is correct — `updatePlan()` correctly passes `{ goal: ... }` as a patch.
- The code in `LongTermPlanPage.jsx` is correct — `handleSaveGoal()` calls `updatePlan` correctly.
- This is purely a database schema / cache issue, not a code bug.
- If Supabase MCP is available, use it to apply the migration and reload the schema cache directly.

Acceptance criteria:
- The `goal` column exists on the `training_plans` table in the live Supabase database.
- Saving a goal on the Training Plan page succeeds without errors.
- The saved goal persists across page reloads and devices.
- The goal value is correctly sent to the AI Coach on the Coach page.

---

### [x] BUG-001 – When a week moves over to the next month data is not presented
Observed behavior: Sunday the current week is 1st of march. I have a saved workout for that day but it is not presented in the weekly view.
Expected behavior: Present workouts for all days of the week, also when the week contains a new month
Where to look: Weekly planner

---

## ⚙️ Improvements / Nice-to-have

### [ ] IMP-001 – Description
Potential benefit:

---

## 📚 Known Constraints

- Limit number of requests to Gemini AI to limit costs (store responses so there are no uneccesarry repeated requests)

---

## 🚫 Do Not Touch (Unless Explicitly Asked)

- Critical configs


---

## 📝 Agent Progress Log

- BUG-001 → DONE: Fixed UTC date arithmetic in useWorkoutEntries.js (isoDateOffset now uses T00:00:00Z + setUTCDate)
- TASK-001 → DONE:
  - Created supabase/migrations/20260225_runner_profile_and_plan_goal.sql (runner_profiles table + goal col on training_plans)
  - Created src/hooks/useRunnerProfile.js (load/save runner background via Supabase upsert)
  - Added updatePlan() to usePlans.js
  - Added runnerProfile to AppDataContext
  - CoachPage: uses Supabase runnerProfile.background (removed localStorage); goal field moved to LongTermPlanPage
  - LongTermPlanPage: plan goal textarea with onBlur save via updatePlan
  - makeAppData: added runnerProfile slice + updatePlan + goal to SAMPLE_PLAN
  - All 166 tests pass
- TASK-010 → DONE:
  - Added formatDuration(), formatTimeOfDay(), effortMeta() helpers to HeroPage.jsx
  - Activity feed cards now show: Type · Distance · Duration on line 2, Time of day · 🔴/🟡/🟢 Effort on line 3
  - Effort derived from heart_rate_zones: z4+z5 > 35% = Hard, z3 > 25% or z4+z5 > 15% = Moderate, else Easy
  - 4 new tests in dashboard.test.jsx; all 170 tests pass

