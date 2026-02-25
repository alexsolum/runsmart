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

