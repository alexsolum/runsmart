# RunSmart — AI-Assisted Improvement Tasks

> **How to use this file:**
> Import into Claude Code (VS Code) and run tasks **one at a time**.
> Each task is self-contained with a branch, files, steps, and TDD test specs.
> Complete the Done Criteria checklist before moving to the next task.
> Branch pattern: `claude/task-N-short-description`

## Testing
Create tests and run via vitest and Playwright.
---

## Task 1 — Norwegian Default Language + AI Speaks Norwegian

**Goal:** Set Norwegian (bokmål) as the app default language, and make the Gemini AI coach always respond in the current app language.

**Branch:** `claude/task-1-norwegian-default-lang`

**Context:**
- `src/i18n/translations.js` uses a `defaultLang` constant and a `useI18n()` hook stored in localStorage
- The Gemini edge function at `supabase/functions/gemini-coach/index.ts` builds prompts via `buildPrompt()` but currently has no language instruction
- `src/pages/CoachPage.jsx` calls the edge function but does not forward the current language

**Files to modify:**
- `src/i18n/translations.js`
- `supabase/functions/gemini-coach/index.ts`
- `src/pages/CoachPage.jsx`

**Implementation steps:**
1. In `src/i18n/translations.js`: Change `defaultLang` to `"no"`. Audit all translation keys — add any missing Norwegian (`no`) strings for any key that only has an English value.
2. In `src/pages/CoachPage.jsx`: Get the current language via `const { lang } = useI18n()`. Include `lang` in every payload sent to the `gemini-coach` edge function (both initial and followup calls).
3. In `supabase/functions/gemini-coach/index.ts`: Read `lang` from the request body (default to `"no"` if missing). At the end of `buildPrompt()` and `buildFollowupPrompt()`, append the language instruction: if `lang === "no"`, add `"Respond entirely in Norwegian (bokmål)."` otherwise add `"Respond in English."`. Do the same for all other modes (plan, plan_revision, plan_analysis, chart_insight).

**Test specs (TDD — write tests first):**
```js
// tests/i18n.test.js
import { describe, it, expect } from "vitest";

describe("i18n default language", () => {
  it("defaults to Norwegian when no localStorage value is set", () => {
    // Clear localStorage, instantiate the language store, verify lang === "no"
  });

  it("t() returns Norwegian string for nav.planning", () => {
    // Verify t("nav.planning") returns the Norwegian value
  });

  it("t() falls back gracefully for missing key", () => {
    // Verify t("nonexistent.key") returns the key string (not crash)
  });
});
```

```jsx
// tests/coachPage.test.jsx (extend existing)
it("forwards lang=no to edge function when language is Norwegian", async () => {
  // Mock fetch, render CoachPage, click refresh coaching
  // Assert fetch was called with body containing lang: "no"
});
```

**Done criteria:**
- [x] App loads in Norwegian by default (no localStorage entry)
- [x] Switching language to English in UI persists and shows English
- [x] Coach page passes `lang` in every edge function call
- [x] Edge function appends Norwegian/English instruction to all prompts
- [x] All tests pass: `npm test -- --run` (2 pre-existing dashboard failures unrelated)

---

## Task 2 — Personal Settings Modal with Avatar

**Goal:** Add an avatar/profile button at the bottom of the sidebar that opens a personal settings modal with tabs for General info, Personal Records, and Profile Photo.

**Branch:** `claude/task-2-personal-settings-modal`

**Context:**
- `src/components/Sidebar.jsx` currently renders static HTML via `dangerouslySetInnerHTML` from a JSON markup file — it needs to become a React component
- `src/hooks/useRunnerProfile.js` stores `background` text — needs to be extended with new profile fields
- `src/components/ui/dialog.jsx` (Radix Dialog) and `src/components/ui/tabs.jsx` are available for the modal UI
- `tests/mockAppData.js` `makeAppData()` must be updated whenever the data shape changes

**Files to modify:**
- `src/hooks/useRunnerProfile.js`
- `src/context/AppDataContext.jsx`
- `src/components/Sidebar.jsx`
- `tests/mockAppData.js`

**Files to create:**
- `src/components/AvatarButton.jsx`
- `src/components/PersonalSettingsModal.jsx`

**Database migration (apply via Supabase MCP or SQL editor):**
```sql
ALTER TABLE runner_profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS weight_kg numeric(5,1),
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS pr_5k_seconds integer,
  ADD COLUMN IF NOT EXISTS pr_10k_seconds integer,
  ADD COLUMN IF NOT EXISTS pr_half_seconds integer,
  ADD COLUMN IF NOT EXISTS pr_marathon_seconds integer,
  ADD COLUMN IF NOT EXISTS recent_10k_seconds integer,
  ADD COLUMN IF NOT EXISTS recent_half_seconds integer,
  ADD COLUMN IF NOT EXISTS recent_marathon_seconds integer,
  ADD COLUMN IF NOT EXISTS preferred_lang text DEFAULT 'no';
```

**Implementation steps:**
1. Run the DB migration above.
2. Update `src/hooks/useRunnerProfile.js`: extend the profile state shape with all new fields; update `loadProfile()` to select them; update `saveProfile(profile)` to upsert all fields.
3. Update `src/context/AppDataContext.jsx`: expose the extended `runnerProfile` (the new fields are available automatically via the hook).
4. Create `src/components/AvatarButton.jsx`: a circular button (40×40px) showing the user's initials (from `full_name`) or `avatar_url` image if set. On click, sets `open=true` to show `PersonalSettingsModal`.
5. Create `src/components/PersonalSettingsModal.jsx` using `Dialog` + `Tabs` from `ui/`:
   - **Tab 1 — General:** inputs for Full Name, Weight (kg), Language toggle (EN/NO) — saving language calls `setLanguage()` from `useI18n()`
   - **Tab 2 — Personal Records:** inputs for PB and most recent time for 5k, 10k, half marathon, marathon (formatted as mm:ss or h:mm:ss)
   - **Tab 3 — Profile Photo:** placeholder file input (upload logic added in Task 9); for now just shows current `avatar_url` or "No photo yet"
   - Save button calls `runnerProfile.saveProfile(formData)`
6. Refactor `src/components/Sidebar.jsx` from HTML-injection to a proper React component. Preserve existing nav links. Add `<AvatarButton />` pinned to the bottom with `position: absolute; bottom: 16px` or equivalent Tailwind.
7. Update `tests/mockAppData.js` `makeAppData()`: add `runnerProfile: { background: "", full_name: "", weight_kg: null, avatar_url: null, pr_10k_seconds: null, ... }` to the default shape.

**Test specs (TDD):**
```jsx
// tests/personalSettings.test.jsx (new file)
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("PersonalSettingsModal", () => {
  it("renders all three tabs", () => {
    // Render modal (open=true), check for "General", "Personal Records", "Profile Photo" tabs
  });

  it("saves full_name and weight_kg when form submitted", async () => {
    // Fill inputs, click Save, assert saveProfile called with correct values
  });

  it("language toggle calls setLanguage", async () => {
    // Click EN toggle, assert setLanguage("en") called
  });

  it("profile photo tab shows placeholder when no avatar_url", () => {
    // Render with avatar_url: null, verify placeholder text visible
  });
});

describe("AvatarButton", () => {
  it("shows initials when no avatar_url", () => {
    // Render with full_name: "Ola Nordmann", verify "ON" displayed
  });

  it("shows img when avatar_url is set", () => {
    // Render with avatar_url: "https://...", verify img src
  });

  it("opens settings modal on click", async () => {
    // Click button, verify modal appears
  });
});
```

**Done criteria:**
- [ ] DB migration applied successfully
- [ ] Sidebar is a React component with AvatarButton at bottom
- [ ] Clicking avatar opens modal with 3 tabs
- [ ] General tab saves name/weight to Supabase
- [ ] Language toggle updates app language immediately
- [ ] Personal Records tab saves PR times
- [ ] `makeAppData()` includes new profile shape
- [ ] All tests pass: `npm test -- --run`

---

## Task 3 — Jason Koop-Style Training Block Visualization

**Goal:** Replace the current `PhaseSummaryBar` in the Long Term Plan page with a horizontal week-grid timeline visualization inspired by Jason Koop's periodization charts.

**Branch:** `claude/task-3-koop-timeline`

**Context:**
- `src/pages/LongTermPlanPage.jsx` renders a `PhaseSummaryBar` component — a proportional colored bar per phase
- The new visualization should show: a scrollable horizontal grid where each column = 1 week, each training block spans its week columns as a colored band, current week is highlighted with a vertical marker
- No backend changes — uses existing `trainingBlocks` (array of `{ phase, label, start_date, end_date, target_km_week, notes }`)
- Phase colors (use existing Tailwind classes): Base=sky, Build=blue, Peak=violet, Taper=amber, Recovery=green

**Files to modify:**
- `src/pages/LongTermPlanPage.jsx`

**Files to create:**
- `src/components/KoopTimeline.jsx`

**Implementation steps:**
1. Create `src/components/KoopTimeline.jsx`:
   - Props: `blocks` (array), `planStartDate` (ISO string or Date), `planEndDate` (ISO string or Date), `today` (Date, defaults to `new Date()`)
   - Compute array of week start dates spanning `planStartDate` → `planEndDate` (UTC Monday)
   - Render a horizontally-scrollable container (overflow-x: auto)
   - Week header row: week number + short date label (e.g., "Week 1\nJan 6")
   - For each block, render a colored band spanning the block's weeks. Use `position: absolute` or CSS grid `grid-column` spanning. Show phase label and `label` inside the band.
   - Highlight the column containing `today` with a subtle background + top marker (e.g., a small triangle or "Today" label)
   - Below the grid, show a color legend for phases
   - If `target_km_week` is set on a block, show it as small text inside the band (e.g., "~60 km/w")
2. In `src/pages/LongTermPlanPage.jsx`: replace `<PhaseSummaryBar>` with `<KoopTimeline blocks={selectedPlanBlocks} planStartDate={...} planEndDate={...} />`. Derive `planStartDate`/`planEndDate` from the min/max of block start/end dates.

**Test specs (TDD):**
```jsx
// tests/trainingplan.test.jsx (extend existing)
import KoopTimeline from "../src/components/KoopTimeline";

describe("KoopTimeline", () => {
  const blocks = [
    { id: "1", phase: "Base", label: "Base 1", start_date: "2025-01-06", end_date: "2025-02-09", target_km_week: 50 },
    { id: "2", phase: "Build", label: "Build 1", start_date: "2025-02-10", end_date: "2025-03-09", target_km_week: 65 },
  ];

  it("renders a column for each week in the plan", () => {
    // Count rendered week columns — should match weeks between start and end
  });

  it("shows phase label text inside each block band", () => {
    // Check "Base 1" and "Build 1" text visible
  });

  it("highlights the current week column", () => {
    // Pass today=2025-01-13 (week 2), verify that column has a distinguishing class/attr
  });

  it("shows target km/week inside block when set", () => {
    // "50 km/w" or similar visible
  });

  it("renders gracefully with empty blocks array", () => {
    // No crash, renders empty state message
  });
});
```

**Done criteria:**
- [ ] `KoopTimeline` renders a horizontal scrollable week grid
- [ ] Each training block spans its weeks as a colored band
- [ ] Phase labels and target km visible inside bands
- [ ] Current week is visually highlighted
- [ ] Empty blocks renders gracefully
- [ ] `PhaseSummaryBar` replaced in `LongTermPlanPage`
- [ ] All tests pass: `npm test -- --run`

---

## Task 4 — Training Block Context in Weekly Plan

**Goal:** When viewing a week in the Weekly Plan that falls within a training block, show a subtle phase banner beneath the week header (e.g., "Denne uken er del av din Bygge-fase" / "This week is part of your Build phase").

**Branch:** `claude/task-4-block-context-weekly`

**Context:**
- `src/pages/WeeklyPlanPage.jsx` knows the current `weekStart` date and has access to `trainingBlocks` via `useAppData()`
- `src/domain/compute.js` is the right place for the pure lookup function
- `src/i18n/translations.js` needs new keys for the banner text

**Files to modify:**
- `src/domain/compute.js`
- `src/pages/WeeklyPlanPage.jsx`
- `src/i18n/translations.js`

**Implementation steps:**
1. In `src/domain/compute.js`, add and export:
   ```js
   function getBlockForWeek(blocks, weekStart) {
     // weekStart: Date (UTC Monday)
     // Returns the first block where weekStart falls within [start_date, end_date], or null
     // Use UTC date comparison: block.start_date <= weekStart <= block.end_date
   }
   ```
2. In `src/i18n/translations.js`, add translation keys:
   ```js
   // English
   "weeklyPlan.blockBanner": "This week is part of your {{phase}} phase",
   // Norwegian
   "weeklyPlan.blockBanner": "Denne uken er del av din {{phase}}-fase",
   ```
   Also add Norwegian phase name translations: Base→Grunntrening, Build→Bygge, Peak→Toppform, Taper→Nedtrapping, Recovery→Restitusjon
3. In `src/pages/WeeklyPlanPage.jsx`: call `getBlockForWeek(trainingBlocks, weekStart)`. If a block is returned, render a small, non-intrusive banner below the week title — use a light-colored badge styled with the phase color (same as KoopTimeline). The banner should be dismissible or subtle enough not to distract.

**Test specs (TDD):**
```js
// tests/compute.test.js (extend existing)
import { getBlockForWeek } from "../src/domain/compute";

describe("getBlockForWeek", () => {
  const blocks = [
    { phase: "Base", start_date: "2025-01-06", end_date: "2025-02-02" },
    { phase: "Build", start_date: "2025-02-03", end_date: "2025-03-02" },
  ];

  it("returns block when weekStart falls within it", () => {
    const week = new Date("2025-01-13T00:00:00Z"); // UTC Monday in Base block
    expect(getBlockForWeek(blocks, week).phase).toBe("Base");
  });

  it("returns null when weekStart is outside all blocks", () => {
    const week = new Date("2025-04-07T00:00:00Z");
    expect(getBlockForWeek(blocks, week)).toBeNull();
  });

  it("returns correct block at exact boundary dates", () => {
    const week = new Date("2025-02-03T00:00:00Z"); // first day of Build block
    expect(getBlockForWeek(blocks, week).phase).toBe("Build");
  });

  it("returns null for empty blocks array", () => {
    expect(getBlockForWeek([], new Date())).toBeNull();
  });
});
```

```jsx
// tests/weeklyplan.test.jsx (extend existing)
it("shows block phase banner when current week overlaps a training block", () => {
  // makeAppData with trainingBlocks covering currentWeekStart
  // render WeeklyPlanPage, verify phase banner text visible
});

it("shows no banner when current week has no training block", () => {
  // makeAppData with trainingBlocks far in the future
  // render WeeklyPlanPage, verify no banner
});
```

**Done criteria:**
- [ ] `getBlockForWeek()` exported from `compute.js`
- [ ] Banner appears in Weekly Plan when a block covers the current week
- [ ] Banner text is in Norwegian by default
- [ ] Phase names translated to Norwegian
- [ ] No banner shown when no block matches
- [ ] All tests pass: `npm test -- --run`

---

## Task 5 — AI Coaching Feedback on Long-Term Plan

**Goal:** Add a "Get AI Feedback" button on the Long Term Plan page that sends plan structure + actual execution data to Gemini and displays coaching feedback on how well the plan is designed and being executed.

**Branch:** `claude/task-5-ai-plan-feedback`

**Context:**
- `supabase/functions/gemini-coach/index.ts` already has multiple modes — add `"plan_analysis"`
- `src/domain/compute.js` should contain the pure `computePlanVsActual()` logic
- The feedback should be stored via `useCoachConversations` so it persists

**Files to modify:**
- `src/domain/compute.js`
- `src/pages/LongTermPlanPage.jsx`
- `supabase/functions/gemini-coach/index.ts`

**Implementation steps:**
1. In `src/domain/compute.js`, add and export:
   ```js
   function computePlanVsActual(blocks, activities) {
     // For each block, compute:
     //   - planned_km_week: block.target_km_week (or null)
     //   - actual_km_week: average weekly km from activities during the block's date range
     //   - completion_pct: actual_km_week / planned_km_week * 100 (or null if no target)
     //   - weeks_elapsed: how many weeks of the block have passed
     //   - total_weeks: full block duration in weeks
     // Returns array of { block, planned_km_week, actual_km_week, completion_pct, weeks_elapsed, total_weeks }
     // All date math must use UTC methods
   }
   ```
2. In `supabase/functions/gemini-coach/index.ts`: add a `"plan_analysis"` case in the mode switch. Build a prompt that includes:
   - Plan summary (race, race date, days to race)
   - Block breakdown with planned vs actual km/week and completion %
   - Overall adherence assessment
   System instruction: Ask Gemini to give structured feedback on plan design quality (is there enough base, is the taper adequate) and execution adherence. Respond in the app language. Return plain text (2-4 paragraphs).
3. In `src/pages/LongTermPlanPage.jsx`: Add a "Få AI-tilbakemelding" / "Get AI Feedback" button in the plan header. On click:
   - Compute plan vs actual using `computePlanVsActual(blocks, activities)`
   - Call the edge function with `mode: "plan_analysis"`, the computed data, plan context, and `lang`
   - Show a loading state while fetching
   - Display the response in a collapsible feedback panel below the timeline

**Test specs (TDD):**
```js
// tests/compute.test.js (extend)
import { computePlanVsActual } from "../src/domain/compute";

describe("computePlanVsActual", () => {
  const blocks = [
    { phase: "Base", start_date: "2025-01-06", end_date: "2025-02-02", target_km_week: 50 },
  ];
  const activities = [
    // Two weeks of activities inside the Base block
    { started_at: "2025-01-08T08:00:00Z", distance: 12000 }, // 12 km
    { started_at: "2025-01-15T08:00:00Z", distance: 15000 }, // 15 km
  ];

  it("calculates actual_km_week as average of activity distances in block range", () => {
    const result = computePlanVsActual(blocks, activities);
    // 27 km over 2 weeks = 13.5 km/week (averaged)
    expect(result[0].actual_km_week).toBeCloseTo(13.5, 1);
  });

  it("calculates completion_pct relative to planned target", () => {
    const result = computePlanVsActual(blocks, activities);
    // 13.5 / 50 * 100 = 27%
    expect(result[0].completion_pct).toBeCloseTo(27, 0);
  });

  it("returns null completion_pct when no target_km_week set", () => {
    const blocksNoTarget = [{ ...blocks[0], target_km_week: null }];
    const result = computePlanVsActual(blocksNoTarget, activities);
    expect(result[0].completion_pct).toBeNull();
  });

  it("handles empty activities array", () => {
    const result = computePlanVsActual(blocks, []);
    expect(result[0].actual_km_week).toBe(0);
  });
});
```

```jsx
// tests/trainingplan.test.jsx (extend)
it("shows AI feedback panel after clicking Get AI Feedback", async () => {
  // Mock fetch to return plan_analysis response
  // Render LongTermPlanPage with a selected plan and blocks
  // Click feedback button, await loading, verify feedback text visible
});

it("shows loading state while fetching AI feedback", async () => {
  // Mock fetch with delayed resolution
  // Verify loading indicator visible before response
});
```

**Done criteria:**
- [ ] `computePlanVsActual()` exported from `compute.js`
- [ ] Edge function handles `mode: "plan_analysis"`
- [ ] "Get AI Feedback" button visible on plan page
- [ ] Feedback panel shows AI response in Norwegian
- [ ] Loading state shown during fetch
- [ ] All tests pass: `npm test -- --run`

---

## Task 6 — AI Comments on Key Charts

**Goal:** Show a 2-3 sentence AI-generated insight beneath each major chart on the Insights page, written in the app language and refreshed weekly.

**Branch:** `claude/task-6-chart-ai-insights`

**Context:**
- `src/pages/InsightsPage.jsx` renders 5+ charts using Recharts
- A new `"chart_insight"` mode in the edge function will accept `chart_type` + relevant data and return plain text
- Insights should be cached (in component state or sessionStorage) to avoid calling the API on every render
- Charts to annotate: Training Load (CTL/ATL/TSB), Weekly Load (bar chart), HR Zone Distribution, Long Run Progression

**Files to modify:**
- `src/pages/InsightsPage.jsx`
- `supabase/functions/gemini-coach/index.ts`

**Files to create:**
- `src/components/ChartInsight.jsx`

**Implementation steps:**
1. In `supabase/functions/gemini-coach/index.ts`: add `"chart_insight"` mode. Accept `chart_type` (string) and `chart_data` (compact summary object). System instruction: produce a 2-3 sentence plain text insight about what the data means for the athlete. Respond in the app language.
   - Supported `chart_type` values: `"training_load"`, `"weekly_load"`, `"hr_zones"`, `"long_run"`
   - `chart_data` for `training_load`: `{ currentCTL, currentATL, currentTSB, trend: "improving|declining|stable" }`
   - `chart_data` for `hr_zones`: `{ dominantZone, z1Pct, z2Pct, z3Pct, z4Pct, z5Pct, weekCount }`
   - `chart_data` for `long_run`: `{ latestDistanceKm, peakDistanceKm, trend }`
2. Create `src/components/ChartInsight.jsx`:
   - Props: `chartType`, `chartData`, `lang`
   - On mount: check `sessionStorage` for cached insight (key: `insight-${chartType}-${weekKey}`). If cached, show it. If not, call edge function and cache result.
   - Render: loading shimmer (animate-pulse div) → then a subtle callout box (light blue background, small italic text, ✦ icon)
3. In `src/pages/InsightsPage.jsx`: import `ChartInsight` and add it below each of the 4 target charts, passing the appropriate `chartType` and pre-computed `chartData` derived from existing computed values.

**Test specs (TDD):**
```jsx
// tests/insights.test.jsx (extend)
import ChartInsight from "../src/components/ChartInsight";

describe("ChartInsight", () => {
  it("shows loading shimmer on initial render", () => {
    // Mock fetch (pending), render ChartInsight
    // Verify loading element visible
  });

  it("shows AI comment after fetch resolves", async () => {
    // Mock fetch resolving with "Great training load balance..."
    // Render ChartInsight, await resolution
    // Verify text visible
  });

  it("uses sessionStorage cache and does not re-fetch on re-render", async () => {
    // Populate sessionStorage with cached insight
    // Render ChartInsight, verify fetch NOT called
    // Verify cached text shown
  });

  it("renders gracefully when fetch fails", async () => {
    // Mock fetch rejecting
    // Verify no crash, fallback message shown
  });
});
```

**Done criteria:**
- [ ] `ChartInsight` component created and tested
- [ ] Edge function handles `chart_insight` mode for all 4 chart types
- [ ] Insights appear below Training Load, Weekly Load, HR Zones, Long Run charts
- [ ] Session cache prevents redundant API calls
- [ ] Loading shimmer shown before data arrives
- [ ] All tests pass: `npm test -- --run`

---

## Task 7 — AI Coaching Auto-Updates After Strava Sync

**Goal:** Automatically trigger a coaching refresh on the Coach page after a Strava sync completes, with a non-intrusive notification banner.

**Branch:** `claude/task-7-auto-coach-refresh`

**Context:**
- `src/hooks/useStrava.js` has `syncActivities()` — it currently just updates a sync status
- `src/context/AppDataContext.jsx` exposes the strava hook result
- `src/pages/CoachPage.jsx` has a `handleRefreshCoaching()` function that fetches new insights

**Files to modify:**
- `src/hooks/useStrava.js`
- `src/context/AppDataContext.jsx`
- `src/pages/CoachPage.jsx`
- `src/i18n/translations.js`

**Implementation steps:**
1. In `src/hooks/useStrava.js`: add `needsCoachRefresh: false` to initial state. After `syncActivities()` resolves successfully and new activities were found, dispatch an action to set `needsCoachRefresh: true`. Add `clearCoachRefresh()` action that sets it back to false.
2. In `src/context/AppDataContext.jsx`: expose `strava.needsCoachRefresh` and `strava.clearCoachRefresh` in the context value.
3. In `src/pages/CoachPage.jsx`:
   - Add `useEffect` watching `strava.needsCoachRefresh`. When true, auto-call `handleRefreshCoaching()`, then call `strava.clearCoachRefresh()`.
   - Show a small dismissible banner at the top of the page: "Nye løpeøkter oppdaget — coaching er oppdatert" / "New workouts detected — coaching updated"
4. In `src/i18n/translations.js`: add translation keys for the auto-refresh notification.

**Test specs (TDD):**
```jsx
// tests/coachAutoRefresh.test.jsx (new)
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

describe("Coach auto-refresh after Strava sync", () => {
  it("auto-calls refresh when needsCoachRefresh is true", async () => {
    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    // Render CoachPage with needsCoachRefresh: true in context
    // Verify mockRefresh was called automatically
  });

  it("clears needsCoachRefresh flag after auto-refresh", async () => {
    const clearCoachRefresh = vi.fn();
    // Render CoachPage with needsCoachRefresh: true
    // Verify clearCoachRefresh called after refresh
  });

  it("shows notification banner after auto-refresh", async () => {
    // Render CoachPage with needsCoachRefresh: true
    // Verify Norwegian notification text visible
  });

  it("does not auto-refresh when needsCoachRefresh is false", () => {
    const mockRefresh = vi.fn();
    // Render CoachPage with needsCoachRefresh: false
    // Verify mockRefresh NOT called
  });
});
```

**Done criteria:**
- [ ] `needsCoachRefresh` flag added to strava hook state
- [ ] `clearCoachRefresh()` action works
- [ ] CoachPage auto-refreshes on flag transition to true
- [ ] Notification banner shows in Norwegian
- [ ] Flag cleared after refresh to prevent re-triggering
- [ ] All tests pass: `npm test -- --run`

---

## Task 8 — AI Weekly Plan Considers Long-Term Training Block

**Goal:** When generating the AI weekly plan, include the current training block's phase, target volume, and notes so the generated plan respects the periodization strategy.

**Branch:** `claude/task-8-ai-plan-block-aware`

**Context:**
- `src/pages/WeeklyPlanPage.jsx` already calls the `gemini-coach` edge function with `mode: "plan"`
- Task 4 added `getBlockForWeek()` to `compute.js` — reuse it here
- The edge function `plan` mode system instruction needs updating to accept and act on block context

**Files to modify:**
- `src/pages/WeeklyPlanPage.jsx`
- `supabase/functions/gemini-coach/index.ts`

**Implementation steps:**
1. In `src/pages/WeeklyPlanPage.jsx`: When building the payload for the `plan` or `plan_revision` edge function call, call `getBlockForWeek(trainingBlocks, weekStart)`. If a block is found, include it in the payload:
   ```js
   current_block: {
     phase: block.phase,
     label: block.label,
     target_km_week: block.target_km_week,
     notes: block.notes,
   }
   ```
2. In `supabase/functions/gemini-coach/index.ts`: In the `buildPlanPrompt()` function (or wherever plan context is assembled), read `current_block` from the request body. If present, add a section to the prompt:
   ```
   Current training block: [Phase] - [Label]
   Target weekly volume: [X] km
   Block focus: [notes]

   Generate a plan that aligns with this training block's goals and volume target.
   ```
   Instruct Gemini to respect the phase intensity (Base = easy aerobic, Build = quality sessions, Peak = race-specific, Taper = reduced volume, Recovery = very easy).

**Test specs (TDD):**
```jsx
// tests/weeklyplan.test.jsx (extend)
it("includes current_block in edge function payload when week overlaps a block", async () => {
  const blocks = [{ phase: "Build", label: "Build 1", start_date: "2025-01-06", end_date: "2025-03-02", target_km_week: 65 }];
  // makeAppData with these blocks, set weekStart within block range
  // Mock fetch to capture request body
  // Trigger AI plan generation
  // Assert fetch called with body.current_block.phase === "Build"
});

it("does not include current_block when week has no matching block", async () => {
  // makeAppData with blocks outside current week range
  // Trigger AI plan generation
  // Assert fetch called WITHOUT current_block in body (or current_block: null)
});
```

**Done criteria:**
- [ ] `current_block` included in plan generation payload when applicable
- [ ] Edge function uses block context in prompt
- [ ] Phase intensity guidance added to system instruction
- [ ] Weekly plan generation tested with and without block context
- [ ] All tests pass: `npm test -- --run`

---

## Task 9 — Profile Image Upload

**Goal:** Complete the Profile Photo tab in the personal settings modal with file upload, preview, and display in the sidebar avatar.

**Branch:** `claude/task-9-profile-image-upload`

**Context:**
- Task 2 set up the modal structure and `avatar_url` DB column
- Supabase Storage bucket `avatars` needs to be created (public read, user-scoped write)
- `src/hooks/useRunnerProfile.js` needs an `uploadAvatar(file)` method
- The Supabase JS client supports storage: `supabase.storage.from('avatars').upload(...)`

**Files to modify:**
- `src/hooks/useRunnerProfile.js`
- `src/components/PersonalSettingsModal.jsx`
- `src/components/AvatarButton.jsx`
- `src/context/AppDataContext.jsx`

**Supabase Storage setup (apply via SQL or Supabase dashboard):**
```sql
-- Create avatars bucket (run in Supabase SQL editor or via MCP)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: users can upload/update their own avatar
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

**Implementation steps:**
1. In `src/hooks/useRunnerProfile.js`: add `uploadAvatar(file)` method:
   - Validate file type (image/jpeg, image/png, image/webp) and size (max 2MB)
   - Upload to `avatars/{userId}/avatar.{ext}` using `supabase.storage.from('avatars').upload(path, file, { upsert: true })`
   - Get public URL via `supabase.storage.from('avatars').getPublicUrl(path)`
   - Save URL to `runner_profiles.avatar_url` via `saveProfile({ avatar_url: publicUrl })`
   - Return the public URL
2. In `src/context/AppDataContext.jsx`: expose `runnerProfile.uploadAvatar`.
3. In `src/components/PersonalSettingsModal.jsx` (Profile Photo tab):
   - Add a drag-and-drop zone + "Choose file" button (`<input type="file" accept="image/*">`)
   - Show image preview using `URL.createObjectURL(file)` before upload
   - "Upload Photo" confirm button calls `runnerProfile.uploadAvatar(file)`
   - Show loading state during upload; show success/error message after
4. In `src/components/AvatarButton.jsx`: if `profile.avatar_url` is set, render `<img src={avatar_url} alt="Profile" />` with `onError` fallback to initials display.

**Test specs (TDD):**
```jsx
// tests/personalSettings.test.jsx (extend)
describe("Profile Photo upload", () => {
  it("shows file preview after file selected", async () => {
    // Simulate file input change with a mock File object
    // Verify preview img src set to object URL
  });

  it("calls uploadAvatar with selected file on confirm", async () => {
    const uploadAvatar = vi.fn().mockResolvedValue("https://storage.example.com/avatar.jpg");
    // Render modal, select file, click Upload
    // Verify uploadAvatar called with the file
  });

  it("shows success state after upload", async () => {
    // Mock uploadAvatar resolving, verify success message
  });

  it("shows error message for invalid file type", async () => {
    // Simulate selecting a .pdf file
    // Verify error message visible, uploadAvatar NOT called
  });
});

describe("AvatarButton with image", () => {
  it("renders img element when avatar_url is set", () => {
    // Render with avatar_url set, verify <img> present
  });

  it("falls back to initials when img fails to load", async () => {
    // Render with avatar_url, fire error event on img
    // Verify initials shown instead
  });
});
```

**Done criteria:**
- [ ] Storage bucket `avatars` created with correct RLS policies
- [ ] `uploadAvatar()` method in `useRunnerProfile`
- [ ] Profile photo tab shows drag-and-drop + preview
- [ ] Upload saves URL to DB and displays in sidebar
- [ ] Fallback to initials when no photo or load error
- [ ] File validation (type, size) with error messages
- [ ] All tests pass: `npm test -- --run`

---

## Task 10 — Automatic Strava Sync via Webhooks

**Goal:** Eliminate the need for manual "Sync Now" by implementing a Strava webhook handler that auto-syncs new activities the moment they are recorded in Strava.

**Branch:** `claude/task-10-strava-webhooks`

**Context:**
- Strava supports push subscriptions: Strava sends a `POST` to your endpoint when an athlete's activity is created/updated/deleted
- A new Supabase Edge Function `strava-webhook` must handle both the initial `GET` verification challenge and ongoing `POST` events
- Task 7's `needsCoachRefresh` flag should be reused — triggering it when a new activity arrives
- Supabase Realtime can notify the frontend when the `activities` table gets a new row

**Files to create:**
- `supabase/functions/strava-webhook/index.ts`

**Files to modify:**
- `src/hooks/useStrava.js`
- `src/pages/DataPage.jsx`
- `src/i18n/translations.js`

**Database migration:**
```sql
-- Audit log for webhook events
CREATE TABLE IF NOT EXISTS webhook_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id bigint NOT NULL,
  object_type text NOT NULL,
  object_id bigint NOT NULL,
  aspect_type text NOT NULL,
  received_at timestamptz DEFAULT now()
);

ALTER TABLE strava_connections
  ADD COLUMN IF NOT EXISTS last_webhook_at timestamptz;
```

**Implementation steps:**
1. Create `supabase/functions/strava-webhook/index.ts`:
   - **GET handler** (Strava verification challenge):
     ```
     const challenge = url.searchParams.get("hub.challenge");
     const verifyToken = url.searchParams.get("hub.verify_token");
     // Validate verifyToken matches env var STRAVA_WEBHOOK_VERIFY_TOKEN
     return Response.json({ "hub.challenge": challenge });
     ```
   - **POST handler** (activity events):
     - Parse body: `{ owner_id, object_type, object_id, aspect_type }`
     - If `object_type !== "activity"`, return 200 immediately
     - Log event to `webhook_event_log`
     - Look up `strava_connections` row by `athlete_id = owner_id` to get the user's `user_id` and access token (refresh if needed)
     - Fetch the specific activity from Strava API: `GET /activities/{object_id}`
     - Upsert into `activities` table (same mapping as `strava-sync`)
     - If `aspect_type === "delete"`, delete the activity row by `strava_id`
     - Update `strava_connections.last_webhook_at = now()`
     - Return 200
   - Deploy without JWT verification (`verify_jwt: false`) — Strava does not send JWT tokens
2. In `src/hooks/useStrava.js`: Subscribe to Supabase Realtime on the `activities` table (filtered by `user_id`). When an INSERT event arrives (new activity from webhook), set `needsCoachRefresh: true`. Unsubscribe on component unmount.
3. In `src/pages/DataPage.jsx`: Show "Auto-sync aktiv" / "Auto-sync enabled" badge when Strava is connected. Keep manual sync button as fallback. Add brief explanation text about webhook sync.
4. In `src/i18n/translations.js`: Add translation keys for auto-sync status text.
5. **One-time webhook registration** (document as a comment in the edge function):
   ```bash
   # Register webhook with Strava (run once, from CLI):
   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
     -d client_id=YOUR_CLIENT_ID \
     -d client_secret=YOUR_CLIENT_SECRET \
     -d callback_url=https://YOUR_PROJECT_REF.supabase.co/functions/v1/strava-webhook \
     -d verify_token=YOUR_VERIFY_TOKEN
   ```
   Set `STRAVA_WEBHOOK_VERIFY_TOKEN` secret in Supabase dashboard.

**Test specs (TDD):**
```js
// tests/strava-webhook.test.js (Deno test — run with: deno test)
// Place this in supabase/functions/strava-webhook/index.test.ts

Deno.test("GET challenge verification returns hub.challenge", async () => {
  // Create mock GET request with hub.challenge and matching verify_token
  // Call handler, assert response JSON contains { "hub.challenge": "abc123" }
});

Deno.test("POST with unknown verify_token returns 403", async () => {
  // GET with wrong verify_token, assert 403 response
});

Deno.test("POST activity create event upserts activity", async () => {
  // Mock Strava API + Supabase DB calls
  // POST { owner_id, object_type: "activity", object_id: 123, aspect_type: "create" }
  // Assert activity upsert called
});

Deno.test("POST non-activity event returns 200 without DB writes", async () => {
  // POST { object_type: "athlete", ... }
  // Assert no DB calls, returns 200
});

Deno.test("POST delete event removes activity from DB", async () => {
  // POST { aspect_type: "delete", object_id: 123 }
  // Assert delete called on activities table
});
```

```jsx
// tests/strava.test.jsx (new or extend)
it("sets needsCoachRefresh when realtime INSERT received", async () => {
  // Mock Supabase realtime channel subscription
  // Simulate INSERT event on activities channel
  // Verify needsCoachRefresh becomes true
});
```

**Done criteria:**
- [ ] `strava-webhook` edge function deployed (without JWT verification)
- [ ] `GET` challenge verification works correctly
- [ ] `POST` activity create upserts the activity
- [ ] `POST` activity delete removes the activity
- [ ] Realtime subscription in `useStrava` sets `needsCoachRefresh`
- [ ] DataPage shows auto-sync status badge
- [ ] Webhook registration command documented
- [ ] All tests pass
- [ ] Manual sync kept as fallback

---

## Task Dependency Map

```
Task 1 (Norwegian) ──────────────────────────────► All tasks (lang forwarding)
Task 2 (Settings Modal) ──────────────────────────► Task 9 (Photo Upload)
Task 3 (Koop Timeline) ─────────────────────────── standalone
Task 4 (Block in Weekly) ────────────────────────► Task 8 (Block-aware AI plan)
Task 5 (AI Plan Feedback) ───────────────────────── standalone
Task 6 (Chart AI Comments) ──────────────────────── standalone
Task 7 (Auto Coach Refresh) ─────────────────────► Task 10 (Webhooks use same flag)
Task 8 (Block-aware AI plan) ── depends on Task 4
Task 9 (Photo Upload) ────────── depends on Task 2
Task 10 (Webhooks) ──────────── depends on Task 7
```

## Running Tests

```bash
# All tests (unit + component)
npm test -- --run

# Watch mode
npm test

# Single test file
npm test -- --run tests/compute.test.js

# Deno tests (for edge functions)
cd supabase/functions/strava-webhook
deno test --allow-env --allow-net
```

## Branch & Commit Convention

```bash
# Create branch
git checkout -b claude/task-N-short-description

# Commit pattern
git commit -m "feat(task-N): short description of change"

# Push
git push -u origin claude/task-N-short-description
```