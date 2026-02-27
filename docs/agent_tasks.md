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

⚙️ Improvements — "Fjell & Fart" Frontend Design Overhaul

Design direction: Premium, Scandinavian-inspired training cockpit. Dark-dominant with warm accent tones (amber/terracotta from trail dirt, cool blue from Nordic sky). Refined industrial — clean lines, generous negative space, confident typography. The AI coach "Marius AI Bakken" should feel like a real presence. The overall feel should be distinctly Norwegian without being kitsch.

[x] IMP-001 — P1: Typography & Identity
Status: Completed

Replaced Inter with a three-font system:
- Display/headings (h1–h3, brand marks): Instrument Serif
- Body/UI (global, labels, nav, forms): DM Sans
- Numeric data (KPI values, distances, paces, durations, stats): JetBrains Mono

Changes:
- index.html: single Google Fonts link for all 3 families
- src/styles/tokens.css: added --font-family-serif and --font-family-mono tokens
- src/styles/index.css: Tailwind @theme override + global h1–h3 serif rule + brand/KPI CSS selectors
- src/styles.css: body updated to DM Sans
- JSX: font-mono applied to KPI values, distances, durations, pace, wellness stats across HeroPage, InsightsPage, CoachPage, WeeklyPlanPage, DailyLogPage; font-serif to brand marks in App and AuthPage
- All 244 tests pass

[ ] IMP-002 — P2: Color System & Dark Mode
Priority: High
Phase: 1 (next up)

Goal: Define a cohesive dark-first palette. Athletes check their phone at 5am, in bed after long runs — dark mode should be default.

Palette:
  --bg-primary:        #0D0F12   (near-black, not pure #000)
  --bg-surface:        #161920   (cards, panels)
  --bg-elevated:       #1E222B   (hover states, active nav)
  --border-subtle:     #2A2F3A   (dividers, card edges)
  --text-primary:      #E8E6E3   (warm white, not blue-white)
  --text-secondary:    #8A8F9C   (subdued labels)
  --accent-amber:      #E6A549   (primary accent — trail/warmth)
  --accent-terracotta: #C76B4A   (danger/effort zones)
  --accent-sky:        #5BA4CF   (info/recovery/cool-down)
  --accent-pine:       #4A9B6E   (positive/green zones)
  --gradient-effort:   linear-gradient(135deg, #C76B4A, #E6A549)

Tasks:
- Add dark palette tokens to tokens.css
- Implement dark mode as default theme via CSS custom properties
- Update sidebar, topbar, cards, and page backgrounds
- Offer light mode as secondary option (warm off-white #FAFAF7 backgrounds with muted accent versions)
- Add theme toggle mechanism (localStorage persistent)
- Update all hardcoded Tailwind color classes (text-slate-900, bg-white, etc.) to use theme-aware tokens

Acceptance Criteria:
- Dark mode is default, visually cohesive
- Light mode available as toggle
- All components render correctly in both modes
- Tests pass

[ ] IMP-003 — P3: Dashboard Layout Redesign ("Training Cockpit")
Priority: Medium
Phase: 2

Goal: Redesign HeroPage from standard grid to a purpose-built training cockpit.

Tasks:
- Hero stat strip at top — today's date, days to race, current training phase, weekly km progress bar (one glanceable row)
- Volume chart — full width, area chart (not bar) with gradient fill under line, animate on load
- Activity feed — timeline with vertical line connector, effort-colored dots (red/amber/green from HR zones), hover lift, staggered fade-in
- AI Coach preview card — prominent card showing latest insight with coach avatar, single-click to coach page
- Weekly plan mini-view — 7-column micro-calendar showing planned vs completed workouts with check marks
- CSS Grid with grid-template-areas for named zones; single column on mobile with smart stacking (stat strip → coach → weekly plan → volume → feed)

Acceptance Criteria:
- Dashboard feels like a training command center
- All data still accessible
- Responsive on mobile
- Tests pass

[ ] IMP-004 — P4: Motion & Micro-interactions
Priority: Medium
Phase: 2

Goal: Add purposeful animation to reinforce progress and movement metaphors.

Tasks:
- Page load: staggered fade-up for dashboard cards (CSS @keyframes slideUp, delays 0/80/160/240ms)
- Chart animations: ensure Recharts isAnimationActive on all charts
- Number counters: animate KPI stats counting up from 0 on page load (requestAnimationFrame)
- Route transitions: subtle fade between pages (React Suspense + CSS transitions)
- Hover states: cards lift (translateY -2px + shadow increase), nav items get left-border accent slide-in
- Coach insights: stagger in with slight bounce

Acceptance Criteria:
- Animations are smooth, purposeful, not distracting
- No layout shift from animations
- Works on mobile
- Tests pass

[ ] IMP-005 — P5: AI Coach Page Visual Identity
Priority: Medium
Phase: 3

Goal: Make the coach feature feel like a real presence, not a chatbot bolted on.

Tasks:
- Larger CoachAvatar, always visible in sidebar/header of coach page
- Insight cards with distinctive left-border color + icon per type:
  - Danger: terracotta left border, pulsing dot
  - Warning: amber left border
  - Positive: pine green left border
  - Info: sky blue left border
- Conversation history sidebar — dark panel, conversation list with date + first insight title, active highlighted with amber
- Empty state — atmospheric illustration/pattern with "Start your first coaching session" CTA
- Typing indicator — 3-dot breathing animation with "Marius is analyzing your data…"

Acceptance Criteria:
- Coach page feels distinctive and branded
- Insight types are visually distinguishable
- Loading state is polished
- Tests pass

[ ] IMP-006 — P6: Background Atmosphere & Texture
Priority: Low
Phase: 4

Goal: Add subtle depth to flat solid-color backgrounds.

Tasks:
- Subtle noise/grain texture overlay on background (repeating SVG/PNG at ~3% opacity)
- Topographic contour line pattern for hero/header area (CSS background SVG, very low opacity, fits trail/mountain theme)
- Gradient mesh behind dashboard hero (subtle amber → transparent, positioned top-right)

Acceptance Criteria:
- Textures add depth without distraction
- Performance not impacted
- Works in both dark and light modes

[ ] IMP-007 — P7: Data Visualization Polish
Priority: Medium
Phase: 3

Goal: Transform default Recharts styling to match the Fjell & Fart palette.

Tasks:
- Custom tooltip — dark surface background, rounded corners, amber accent border-top
- Chart colors — use accent palette consistently (amber primary, sky secondary, pine positive)
- Grid lines — nearly invisible (#1E222B on dark bg), remove Y-axis labels when tooltip exists
- Training volume chart — gradient fill (accent-amber 10% opacity → transparent at x-axis)
- HR zone chart — stacked horizontal bar (Z1: sky, Z2: pine, Z3: amber, Z4: terracotta, Z5: danger-red)

Acceptance Criteria:
- Charts feel cohesive with the overall design
- All chart types styled consistently
- Tests pass

[ ] IMP-008 — P8: Navigation Refinement
Priority: Low
Phase: 4

Goal: Refine sidebar from template-like to purposeful, space-efficient navigation.

Tasks:
- Collapsed-first sidebar — icon-only by default, labels on hover/expand
- Active state — amber left-border indicator + brighter icon (no background highlight)
- Group labels — small, uppercase, letter-spaced section labels in text-secondary
- Bottom-pinned items — settings and language switcher at sidebar bottom
- Mobile — bottom tab bar with 4–5 key icons (no hamburger menu)

Acceptance Criteria:
- Sidebar saves horizontal space in collapsed state
- Active state is clear
- Mobile nav is thumb-friendly
- Tests pass

[ ] IMP-009 — P9: Training Plan Page Visual Upgrade
Priority: Low
Phase: 4

Goal: Elevate the weekly plan view from spreadsheet-like to visually engaging.

Tasks:
- Block timeline — horizontal strip (Base → Build → Peak → Taper) with current position highlighted
- Day cards — workout type icon, planned distance, completion status (checkmark with green glow)
- Today indicator — current day card with amber border + elevated shadow
- Drag affordance — subtle grip dots on card edge if workouts can be rearranged

Acceptance Criteria:
- Training phases visually clear
- Today is immediately identifiable
- Tests pass

[ ] IMP-010 — P10: Daily Log / Wellness UI
Priority: Low
Phase: 4

Goal: Make daily logging engaging enough to use every day in <30 seconds.

Tasks:
- Emoji-based scales — replace 1–5 number sliders with 5 face icons, satisfying click/tap animation
- Quick-log card — single card fillable in <30s, shown prominently on dashboard if today not logged
- Trend sparklines — 7-day sparkline next to each metric (sleep, fatigue, mood)

Acceptance Criteria:
- Daily log is faster and more engaging to fill out
- Sparklines show meaningful trends
- Dashboard prompts logging when not done
- Tests pass

Implementation Phases:
  Phase 1: IMP-001 (done) + IMP-002 (Colors/Dark mode)
  Phase 2: IMP-003 (Dashboard layout) + IMP-004 (Motion)
  Phase 3: IMP-005 (Coach UI) + IMP-007 (Chart polish)
  Phase 4: IMP-006 (Texture) + IMP-008 (Nav) + IMP-009 + IMP-010

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
- IMP-001 → DONE:
  - Replaced Inter with three-font system: Instrument Serif (headings), DM Sans (body), JetBrains Mono (data)
  - Updated index.html, tokens.css, index.css (@theme + global rules), styles.css
  - Applied font-mono to KPI values, distances, paces, durations, wellness stats across 6 page components
  - Applied font-serif to brand marks in App.jsx and AuthPage.jsx
  - All 244 tests pass

