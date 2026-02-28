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

---

✅ Completed Work Summary

| Task | What Was Done |
|------|--------------|
| BUG-001 | Fixed UTC date arithmetic in useWorkoutEntries.js (isoDateOffset uses T00:00:00Z + setUTCDate) |
| TASK-001 | Runner profile persistence (Supabase migration, useRunnerProfile hook, goal field on training_plans, updatePlan in usePlans) |
| TASK-002 | Tailwind CSS applied across all pages |
| BUG-003 | Added `goal` column to training_plans via migration; reloaded schema cache with NOTIFY pgrst |
| BUG-002 | Standardized spacing using Tailwind (gap/margin/padding) across all pages; flex-1 + overflow-y-auto on `<main>` |
| TASK-010 | Richer workout context on dashboard: duration, time of day, effort dots from HR zones; 4 new tests |
| TASK-004 | Full Norwegian translation + language switcher (useSyncExternalStore, LanguageSwitcher.jsx, 50+ keys, 21 i18n tests) |
| TASK-003 | Marius AI Bakken coach: Supabase conversations/messages tables, CoachAvatar.jsx, two-column UI, follow-up mode, Edge Function update, 184 tests |
| IMP-001 | Three-font system: Instrument Serif (headings) / DM Sans (body) / JetBrains Mono (data) — 244 tests passing |
| shadcn init | shadcn/ui installed; Button, Input, Textarea, Card, Dialog, Select, Badge scaffolded; AuthPage, DailyLogPage, WeeklyPlanPage, LongTermPlanPage fully migrated; CoachPage + InsightsPage Button-only partial migration |

---

🔥 Active Tasks — shadcn/ui Full Migration

Context: The shadcn/ui integration PR (#55) migrated 4 pages fully and 2 pages partially (Button only). Four pages remain with native HTML form elements and custom card divs. Three installed shadcn components (Dialog, Select, Badge) are completely unused. Complete the migration before starting design overhaul tasks.

[x] TASK-SUI-001 — Migrate HeroPage to shadcn Select + Button

Goal: Replace the native `<select>` filter dropdown and any plain `<button>` elements.

Tasks:
- Replace native `<select>` (activity/metric filter) with shadcn `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- Replace any plain `<button>` elements with shadcn `Button` (variant: ghost or outline as appropriate)
- Import paths: `@/components/ui/select`, `@/components/ui/button`

Tests:
- Update `tests/dashboard.test.jsx` — mock `@/components/ui/select` if needed and assert filter still works

Acceptance Criteria:
- No native `<select>` or unstyled `<button>` elements remain in HeroPage
- Filter interaction still works
- All tests pass

[x] TASK-SUI-002 — Migrate DataPage to shadcn Card + Button

Goal: Replace custom `<div>` card containers with `Card`, `CardHeader`, `CardContent`, `CardFooter`.

Tasks:
- Wrap each data section block (Strava connection, manual data, activity table) in `Card`/`CardContent`
- Replace action buttons ("Connect Strava", "Sync Now", "Disconnect") with shadcn `Button`
- Import from `@/components/ui/card` and `@/components/ui/button`

Tests:
- Update or create `tests/datapage.test.jsx` — cover card rendering and button interactions

Acceptance Criteria:
- All major sections use Card layout
- Action buttons use shadcn Button
- Tests pass

[x] TASK-SUI-003 — Migrate MobilePage WorkoutModal to shadcn Dialog

Goal: Replace the custom `WorkoutModal` component with the already-installed shadcn `Dialog`.

Note: Verify `MobilePage.jsx` exists in `src/pages/` before starting. If absent, skip this task.

Tasks:
- Replace modal backdrop + container with `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`
- Replace `<input type="number">` and `<input type="text">` with shadcn `Input`
- Replace `<textarea>` with shadcn `Textarea`
- Replace `<button>` elements with `Button`
- Remove legacy CSS classes: `.mobile-modal`, `.mobile-modal-backdrop` from `src/styles/index.css` once migrated

Tests:
- Component tests covering modal open/close, form fill, and submit

Acceptance Criteria:
- WorkoutModal uses Dialog, Input, Textarea, Button from shadcn
- Legacy modal CSS removed
- Tests pass

[x] TASK-SUI-004 — Complete CoachPage & InsightsPage shadcn adoption

Goal: Replace remaining non-shadcn HTML in the two partially-migrated pages (currently Button-only).

CoachPage (`src/pages/CoachPage.jsx`):
- Audit all `<input>`, `<textarea>`, `<div>` card containers
- Follow-up chat input area: use `Input` + `Button`
- Insight cards: use `Card`/`CardContent` where appropriate

InsightsPage (`src/pages/InsightsPage.jsx`):
- Audit for native `<select>`, `<input>`, card-like `<div>` containers
- Replace with `Select`, `Input`, `Card` as appropriate

Tests:
- Ensure `tests/coach.test.jsx` and `tests/insights.test.jsx` (or equivalent) still pass after changes

Acceptance Criteria:
- No unstyled native form elements or bare card divs remain in either page
- All existing tests still pass

[x] TASK-SUI-005 — Add shadcn Label to all form inputs

Goal: Improve accessibility by pairing `Label` components with all form inputs.

Tasks:
- Install: `npx shadcn@latest add label` (adds `src/components/ui/label.jsx`)
- Apply to: DailyLogPage, WeeklyPlanPage, LongTermPlanPage, AuthPage, CoachPage
- Pattern: `<Label htmlFor="field-id">Field name</Label><Input id="field-id" .../>`

Tests:
- Check that labels are present and linked in component test renders (getByLabelText or role)

Acceptance Criteria:
- All form inputs have associated Label components
- htmlFor/id pairs are correct
- Tests pass

[x] TASK-SUI-006 — Audit & remove orphaned legacy CSS

Goal: After SUI-001 through SUI-005 are done, clean up dead CSS.

Tasks:
- Search `src/styles/index.css` for CSS classes that were only used by replaced elements
- Remove classes associated with: custom modal (`.mobile-modal*`), old card patterns now covered by Card, any `<select>` custom styling replaced by Select
- Run `npm test -- --run` to confirm nothing broke
- Run `npm run build` to confirm no dead import warnings

Acceptance Criteria:
- No orphaned CSS classes for migrated elements
- Build passes with no warnings
- All tests pass

---

⚙️ Improvements — "Fjell & Fart" Frontend Design Overhaul

Design direction: Premium, Scandinavian-inspired training cockpit. Dark-dominant with warm accent tones (amber/terracotta from trail dirt, cool blue from Nordic sky). Refined industrial — clean lines, generous negative space, confident typography. The AI coach "Marius AI Bakken" should feel like a real presence. The overall feel should be distinctly Norwegian without being kitsch.

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

---

📚 Known Constraints

Limit Gemini API requests.

Cache AI responses to reduce cost.

🚫 Do Not Touch (Unless Explicitly Asked)

Critical configs.
