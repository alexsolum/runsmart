Purpose

This file contains tasks an AI coding agent can execute autonomously.
Work sequentially unless priorities specify otherwise.
Avoid unnecessary questions — assume reasonable defaults.
Only stop if blocked or if an action may cause data loss or security issues.

🧭 Project Context

Tech stack

Frontend: Tailwind CSS + shadcn/ui

Backend: Supabase

Database: Supabase

Deployment: Vercel

Key integrations/APIs: Supabase Auth, Strava, Gemini AI

Coding standards

Language/style preferences: None

Testing expectations: All new features must include tests that pass before pushing to Git

Documentation expectations: None

Allowed actions

Edit/create/delete files

Install dependencies

Run builds/tests

Refactor code

Update documentation
(Only pause for destructive or risky actions.)

🔥 Priority Tasks (Current Sprint)
[x] TASK-003 – AI Coach chat history & conversational follow-ups ("Marius AI Bakken")
Goal

Transform the Coach page from a one-shot insight generator into a persistent conversational coaching experience with:

Chat history persistence

Follow-up questions

Conversation list

Branded coach persona

Context

Currently:

Coaching insights refresh on demand

Cached only in sessionStorage

Lost on reload

No conversational follow-ups

This task adds persistent conversations stored in Supabase and a branded AI coach experience.

Requirements
1. Database — New conversation tables

Create Supabase migration:

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

Add RLS policies:

Users only see their own conversations/messages.

Content format:

Assistant → structured insights array OR text

User → { text: "...question..." }

Initial request → { type: "initial_request" }

2. Hook — useCoachConversations.js

Create:

src/hooks/useCoachConversations.js

Expose:

conversations

activeConversation

messages

loadConversations()

loadMessages(conversationId)

createConversation(title)

addMessage(conversationId, role, content)

updateConversationTitle(id, title)

deleteConversation(id)

setActiveConversation(id | null)

Also:

Add to AppDataContext.jsx

Extend tests/mockAppData.js with mocks.

3. Coach Page UI redesign
Sidebar conversation list

“New conversation” button

Conversation list with relative timestamps

Click to open conversation

Delete with confirmation

Mobile: collapsible panel/drawer

Chat area

Display message thread:

Assistant → insight cards or styled text

User → right-aligned chat bubbles

Initial request → system-style message

Bottom input:

Text field + send button

If new conversation:

Show existing “Refresh coaching” button.

4. Coach branding — "Marius AI Bakken"

Update:

Page header title

Subtitle: "Your AI running coach"

Create:

src/components/CoachAvatar.jsx

Avatar requirements:

SVG or CSS illustration

Runner/coach aesthetic

Norwegian visual cues

Slim athletic runner style

Primary blue accent color

Use avatar:

Page header

Assistant messages.

5. Follow-up conversation flow

When user sends follow-up:

Save user message in Supabase.

Send to gemini-coach Edge Function:

Conversation history

Training summaries

Activities

Plan context

Daily logs

Runner profile

Include mode:

"initial" or "followup"

Save assistant response.

Render response in chat.

6. Edge Function update

Modify:

supabase/functions/gemini-coach/index.ts

Add:

Conversational follow-up mode

Persona-based coaching prompt

Return structured insights for initial mode

Return conversational text for follow-ups.

7. Conversation title auto-generation

After first assistant reply:

Generate short descriptive title

Use insight title or simple heuristic

No extra AI call required.

8. Remove session storage caching

Remove:

All sessionStorage insight caching.

All persistence moves to Supabase.

9. Tests

Create:

tests/coach.test.jsx

Test coverage:

Conversation list rendering

Creating conversation

Loading past conversations

Sending follow-up questions (mock Edge Function)

Avatar rendering

Conversation deletion

Initial coaching still works.

Acceptance Criteria

Conversations persist across devices

Follow-ups supported

Conversation list visible

Coach branded as "Marius AI Bakken"

Conversations deletable

Tests pass.

Files to Create
supabase/migrations/20260226_coach_conversations.sql
src/hooks/useCoachConversations.js
src/components/CoachAvatar.jsx
tests/coach.test.jsx
Files to Modify
src/pages/CoachPage.jsx
supabase/functions/gemini-coach/index.ts
src/context/AppDataContext.jsx
tests/mockAppData.js
[x] TASK-004 – Norwegian translation & language switcher
Goal

Full Norwegian translation coverage with language switching.

Requirements
1. Integrate t() in all components

Replace hardcoded English strings in:

HeroPage.jsx

LongTermPlanPage.jsx

WeeklyPlanPage.jsx

CoachPage.jsx

InsightsPage.jsx

DailyLogPage.jsx

DataPage.jsx

RoadmapPage.jsx

AuthPage.jsx

Sidebar.jsx

Topbar.jsx

2. Expand translation dictionaries

Add missing keys in:

src/i18n/translations.js

Include:

Dashboard KPIs

Training plan labels

Daily log labels

Coach chat UI strings

Navigation labels

Date/day names.

All keys must exist in both en and no.

3. Make useI18n() reactive

Implement React subscription pattern:

useState

useEffect or useSyncExternalStore

Ensure UI re-renders on language change.

4. Language switcher component

Create:

src/components/LanguageSwitcher.jsx

Features:

EN/NO toggle

Highlight active language

Persistent via localStorage

Place in sidebar footer or topbar.

5. Improve Norwegian terminology

Ensure natural phrasing:

Examples:

Readiness → Treningsklarhet / Treningsstatus

Mileage → Distanse

Maintain consistent running terminology.

6. Remove DOM translation approach

Delete:

applyTranslations()

Any data-i18n attributes.

React rendering only.

7. Tests

Create:

tests/i18n.test.jsx

Cover:

Default English strings

Norwegian switching

Fallback behaviour

Hook reactivity

Language switcher behavior.

Acceptance Criteria

No hardcoded English strings

Complete EN/NO dictionaries

Instant language switching

Persistent preference

Natural Norwegian translations

Tests passing.

Files to Create
src/components/LanguageSwitcher.jsx
tests/i18n.test.jsx
Files to Modify
src/i18n/translations.js
src/pages/*
src/components/Sidebar.jsx
src/components/Topbar.jsx
tests/mockAppData.js (if needed)
🧊 Backlog (Lower Priority)
[x] TASK-010 – More workout context on dashboard

Status: Completed.

Added:

Time of day

Duration

Effort indicator from HR zones.

Tests updated.

🐞 Bugs / Technical Debt
[x] BUG-002 – Insufficient margins across pages
Problem

UI feels cramped due to inconsistent spacing.

Fix Approach

Inspect all pages visually.

Standardize spacing using Tailwind:

space-y-*

gap-*

mb-*

p-*

Maintain responsive breakpoints.

Acceptance Criteria

Consistent spacing

No cramped components

Tests still pass.

[x] BUG-003 – Training plan goal not saving
Root Cause

Supabase schema cache missing goal column.

Fix Steps

Apply migration:

ALTER TABLE training_plans ADD COLUMN IF NOT EXISTS goal TEXT;

Reload schema cache:

NOTIFY pgrst, 'reload schema';

Verify persistence.

⚙️ Improvements
[ ] IMP-001 – shadcn/ui Component Library Integration
Goal

Replace legacy HTML string-generator UI primitives in src/components/ui/ with proper
shadcn/ui React components. Migrate interactive elements (buttons, inputs, selects,
dialogs, cards, badges) across all pages from ad-hoc Tailwind + custom CSS to the
shadcn component model. Reduce the 2,366-line index.css over time as shadcn handles
component-level styling.

Phase 0 – Infrastructure
- Install: clsx, tailwind-merge, class-variance-authority
- Create components.json (shadcn config, tsx: false for JavaScript project)
- Create src/lib/utils.js with cn() utility
- Add shadcn CSS variable block to src/styles/index.css mapped to existing palette
- Fix --border alias collision in styles.css before running shadcn init

Phase 1 – Core UI Components
Add via npx shadcn@latest add <component>:
- button (replaces .cta / .ghost CSS and Button.js stub)
- card (replaces .dashboard-card, .kpi-card, .coach-insight-card; Card.js stub)
- input (replaces Input.js stub and custom input CSS)
- textarea (replaces Textarea.js stub)
- select (replaces Select.js stub; NOTE: use for non-test-critical selects only)
- badge (replaces Badge.js stub)
- dialog (replaces Modal.js stub)
Delete all 8 stub files; no pages import them so no breakage.

Phase 2 – Page Migration (priority order)
1. AuthPage.jsx – lowest risk (no tests); Input, Button, Card
2. DailyLogPage.jsx – high form density; Input, Textarea, Button (preserve .rating-group)
3. LongTermPlanPage.jsx – Input, Select, Button (preserve .ltp-phase-bar, .ltp-timeline, .ltp-block-form)
4. WeeklyPlanPage.jsx – Button, Input (preserve all .wpp-* classes for tests)
5. CoachPage.jsx – Card, Badge (preserve .coach-insight-card.is-* classes for tests)
6. HeroPage.jsx – Card, Badge (preserve .dashboard-kpi for tests)
7. InsightsPage.jsx – Card (preserve .kpi-card, .skeleton-block, .fitness-meter* for tests)
8. MobilePage.jsx – full refactor (no test coverage)

Phase 3 – Shell Components
- App.jsx sidebar nav: Button variant="ghost" for nav items
- Topbar search Input
- Consider shadcn Sheet for mobile sidebar drawer

CSS Cleanup (ongoing)
- Delete .cta / .ghost CSS blocks from index.css after Phase 2
- Delete component-specific CSS blocks as pages are migrated
- Keep .wpp-*, .dashboard-kpi, .coach-insight-card, .ltp-* until tests are updated
- Target: reduce index.css from 2,366 lines to ~800 lines

Test compatibility notes
- Preserve all BEM class names that tests query
- shadcn Input/Textarea forward name/type/placeholder → attribute selectors still work
- shadcn Select uses Radix portal; keep native <select> for test-critical fields

Acceptance Criteria

All 8 stub files replaced with shadcn React components
No regression in existing test suite (currently 205 tests)
Interactive elements use shadcn Button/Input/Select/Textarea/Dialog across all pages
index.css reduced by at least 40%
npm run build passes

Files to Create
components.json
src/lib/utils.js
src/components/ui/button.jsx (replaces Button.js)
src/components/ui/card.jsx (replaces Card.js)
src/components/ui/input.jsx (replaces Input.js)
src/components/ui/textarea.jsx (replaces Textarea.js)
src/components/ui/select.jsx (replaces Select.js)
src/components/ui/badge.jsx (replaces Badge.js)
src/components/ui/dialog.jsx (replaces Modal.js)

Files to Modify
package.json
src/styles/index.css
src/styles/styles.css (rename --border alias)
src/pages/AuthPage.jsx
src/pages/DailyLogPage.jsx
src/pages/LongTermPlanPage.jsx
src/pages/WeeklyPlanPage.jsx
src/pages/CoachPage.jsx
src/pages/HeroPage.jsx
src/pages/InsightsPage.jsx
src/pages/MobilePage.jsx
src/App.jsx

📚 Known Constraints

Limit Gemini API requests.

Cache AI responses to reduce cost.

🚫 Do Not Touch (Unless Explicitly Asked)

Critical configs.

📝 Agent Progress Log
Completed

BUG-001

Fixed UTC date arithmetic.

TASK-001

Runner profile persistence in Supabase.

Plan goal storage implemented.

TASK-002

Tailwind CSS applied across pages.

TASK-010

Added richer workout context.

Dashboard improvements.

All related tests passing.
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
- BUG-003 → DONE:
  - Created supabase/migrations/20260226_fix_schema_cache.sql
  - Adds goal column IF NOT EXISTS + NOTIFY pgrst reload
- BUG-002 → DONE:
  - Made `<main>` in App.jsx use flex-1 + overflow-y-auto so pages scroll within the content area
  - Increased section gaps: InsightsPage gap-4→gap-6 (KPI strip and chart sections), DailyLogPage gap-4→gap-6 (top grid), LongTermPlanPage gap-4→gap-6, DataPage gap-4→gap-6
  - WeeklyPlanPage: mb-3.5→mb-5 for the header bar
  - dashboard-main CSS gap: var(--space-4)→var(--space-6) (16px→24px) for more breathing room
  - All 205 tests pass
- TASK-004 → DONE:
  - Made useI18n() reactive with useSyncExternalStore (re-renders components on language switch)
  - Added 50+ new translation keys (nav groups, coach UI strings) to both EN and NO in translations.js
  - Removed applyTranslations() call from setLanguage() (React rendering only; DOM approach removed from auto-trigger)
  - Created src/components/LanguageSwitcher.jsx (EN/NO toggle, aria-pressed state, localStorage persistence)
  - Updated App.jsx: uses t() for all nav labels, sign-out, search, breadcrumb; LanguageSwitcher in sidebar footer
  - Updated CoachPage.jsx: all UI strings use t() (buttons, labels, placeholders, empty states)
  - Created tests/i18n.test.jsx: 21 tests covering t(), setLanguage(), useI18n() reactivity, LanguageSwitcher
  - All 205 tests pass
- TASK-003 → DONE:
  - Created supabase/migrations/20260226_coach_conversations.sql (coach_conversations + coach_messages tables, RLS, auto-update trigger)
  - Created src/hooks/useCoachConversations.js (full CRUD: load/create/addMessage/updateTitle/delete/setActive)
  - Created src/components/CoachAvatar.jsx (SVG runner with Norwegian flag accent, role=img)
  - Updated AppDataContext.jsx: added useCoachConversations(userId) → coachConversations slice
  - Updated tests/mockAppData.js: SAMPLE_CONVERSATIONS, SAMPLE_MESSAGES, coachConversations mock in makeAppData
  - Redesigned src/pages/CoachPage.jsx: "Marius AI Bakken" branding, two-column layout (sidebar + chat), conversation list with inline delete confirmation, optimistic message rendering, Refresh button for initial coaching, text input for follow-ups
  - Updated supabase/functions/gemini-coach/index.ts: FOLLOWUP_SYSTEM_INSTRUCTION, mode=initial/followup routing, conversation history support, returns {text} for followup mode
  - Removed sessionStorage caching (all persistence in Supabase)
  - Updated tests/coach.test.jsx: 184 tests total, all passing (branding, sidebar CRUD, initial coaching, follow-ups, error states, wellness, runner profile)

