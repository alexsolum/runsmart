# CLAUDE.md — RunSmart

## Project Overview

RunSmart is a web-first training planning application for endurance runners. It combines AI-assisted training planning with real-life schedule awareness, training analytics, and continuous adaptation recommendations. The product emphasizes practical periodization, explainable AI coaching insights, and privacy-first data handling.

**Current status:** Full-stack React + Vite app with Supabase backend, deployed to Vercel. Authentication, Strava sync, AI coaching, and core training management features are live.

## Repository Structure

```
runsmart/
├── index.html                  # Vite entry point
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Shell: navigation, layout, auth gate
│   ├── styles.css              # Global styles
│   ├── styles/
│   │   ├── index.css           # Main stylesheet entry
│   │   └── tokens.css          # Design tokens (colors, spacing, typography)
│   ├── pages/                  # One component per route/section
│   │   ├── AuthPage.jsx
│   │   ├── HeroPage.jsx        # Dashboard — KPIs, activity feed, trend charts
│   │   ├── LongTermPlanPage.jsx # Training plan + phase blocks (Supabase CRUD)
│   │   ├── WeeklyPlanPage.jsx  # 7-day workout grid (Supabase CRUD)
│   │   ├── CoachPage.jsx       # AI insights (Gemini Edge Function)
│   │   ├── InsightsPage.jsx    # Analytics: volume, pace, heart rate zones
│   │   ├── DailyLogPage.jsx    # Daily wellness log (Supabase CRUD)
│   │   ├── DataPage.jsx        # Data explorer + Strava sync trigger
│   │   └── RoadmapPage.jsx     # Product roadmap
│   ├── context/
│   │   └── AppDataContext.jsx  # React Context — single data provider for all hooks
│   ├── hooks/
│   │   ├── useAuth.js          # Supabase auth (email + Google OAuth)
│   │   ├── useActivities.js    # Strava synced + manual activities
│   │   ├── useCheckins.js      # Weekly feedback (fatigue, sleep, motivation)
│   │   ├── useDailyLogs.js     # Daily wellness logs
│   │   ├── usePlans.js         # Training plan CRUD
│   │   ├── useStrava.js        # Strava OAuth flow + sync trigger
│   │   ├── useTrainingBlocks.js # Long-term phase blocks
│   │   └── useWorkoutEntries.js # Weekly plan day-by-day entries
│   ├── lib/
│   │   └── supabaseClient.js   # Singleton Supabase JS client
│   ├── config/
│   │   └── runtime.js          # Config loader: env vars → window.RUNTIME_CONFIG
│   ├── domain/
│   │   └── compute.js          # Pure business logic (no React, fully testable)
│   ├── i18n/
│   │   └── translations.js
│   └── components/
│       ├── Sidebar.jsx
│       ├── Topbar.jsx
│       └── ui/                 # Reusable primitives: Button, Card, Input, Modal, etc.
├── supabase/
│   └── functions/
│       ├── strava-auth/        # OAuth token exchange (Deno Edge Function)
│       ├── strava-sync/        # Activity + HR zone sync (Deno Edge Function)
│       └── gemini-coach/       # AI coaching via Gemini 2.5-flash (Deno Edge Function)
├── tests/
│   ├── compute.test.js         # Unit tests for domain/compute.js
│   ├── dashboard.test.jsx      # HeroPage component tests
│   ├── dailylog.test.jsx       # DailyLogPage component tests
│   ├── insights.test.jsx       # InsightsPage component tests
│   ├── trainingplan.test.jsx   # LongTermPlanPage component tests
│   ├── weeklyplan.test.jsx     # WeeklyPlanPage component tests
│   ├── mockAppData.js          # Shared test fixtures + makeAppData() factory
│   └── setup.js                # Vitest + React Testing Library setup
├── public/
│   └── runtime-config.js       # Fallback browser config (Supabase URL, Strava ID)
├── docs/
│   └── ux-improvement-plan.md
├── package.json
├── vite.config.mjs             # Vite config (handles Vercel + GitHub Pages base paths)
├── vitest.config.js            # Test runner (unit = node env, components = jsdom)
├── vercel.json                 # Vercel deployment config
├── agents.md                   # AI agent specs and product architecture reference
├── README.md
└── CLAUDE.md                   # This file
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend framework | React 18 (Hooks + Context) | No class components |
| Build tool | Vite 7 | `npm run dev` / `npm run build` |
| Package manager | npm | `package.json` present |
| Backend / DB | Supabase (PostgreSQL + Auth) | Row-level security on all tables |
| Serverless | Supabase Edge Functions (Deno) | 3 deployed: strava-auth, strava-sync, gemini-coach |
| Auth | Supabase Auth | Email/password + Google OAuth |
| External APIs | Strava v3, Google Gemini 2.5-flash | Both routed via Edge Functions |
| Hosting | Vercel | Primary deployment |
| Testing | Vitest + React Testing Library | Unit + component tests |
| Styling | Vanilla CSS | No Tailwind, no CSS-in-JS |
| Language | JavaScript / JSX | No TypeScript yet |

## Development

### Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Running tests

```bash
npm test          # watch mode
npm test -- --run # single run (CI)
```

Tests split into two environments:
- **unit** (`tests/compute.test.js`) — runs in Node, no DOM
- **components** (all other `*.test.jsx`) — runs in jsdom with React Testing Library

### Building

```bash
npm run build
```

Output goes to `dist/`. Vercel runs this automatically on push.

## Environment Variables

The app loads config in priority order:

1. Vite env vars (`.env.local` or Vercel project settings):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRAVA_CLIENT_ID`
   - `VITE_AUTH_REDIRECT_URL`

2. `window.RUNTIME_CONFIG` injected by `public/runtime-config.js` (fallback for static deploys)

Supabase Edge Functions require these secrets (set in Supabase dashboard):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`
- `GEMINI_API_KEY`

**Never put secrets in frontend code.** All Strava and AI calls go through Edge Functions.

## Architecture

### State management

All data lives in `AppDataContext` (`src/context/AppDataContext.jsx`), which composes 8 custom hooks. Pages consume it via `useAppData()`. No external state library.

### Data flow

```
User action → Page component → useAppData() hook → Supabase JS client → PostgreSQL
                                                 ↘ Edge Function → Strava API / Gemini
```

### Database tables (PostgreSQL with RLS)

| Table | Purpose |
|-------|---------|
| `training_plans` | Goal race, availability, current mileage |
| `training_blocks` | Phase blocks (Base/Build/Peak/Taper/Recovery) |
| `weekly_plan_entries` | Day-by-day workout entries per plan/week |
| `activities` | Strava-synced + manual activities with HR zone data |
| `athlete_feedback` | Weekly check-ins (fatigue, sleep, motivation) |
| `strava_connections` | OAuth tokens per user (service-role write only) |
| `daily_logs` | Daily wellness log (sleep, mood, fatigue, training quality, etc.) |

### Edge Functions

| Function | Trigger | Does |
|----------|---------|------|
| `strava-auth` | Frontend OAuth callback | Exchanges auth code for tokens; stores in `strava_connections` |
| `strava-sync` | Manual user action | Fetches 90 days of activities + HR zone data from Strava |
| `gemini-coach` | Coach page load | Sends training summary to Gemini; returns structured coaching insights |

## Code Conventions

### React / JSX

- Functional components with hooks only
- `useAppData()` for all data access — never call Supabase directly from pages
- `useCallback` / `useMemo` where dependencies are stable
- camelCase for variables and functions

### CSS

- CSS custom properties on `:root` (see `src/styles/tokens.css`)
  - Core: `--bg`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--card`, `--border`, `--success`
- BEM-like class naming: `.dashboard-kpi`, `.wpp-day-grid`, `.ltp-timeline`, etc.
- Responsive breakpoints at **900px** (tablet) and **600px** (mobile)
- Font: Inter (Google Fonts CDN), weights 300/400/600/700

### Domain logic (`src/domain/compute.js`)

Pure functions only — no React, no DOM, no imports. All date arithmetic uses **UTC methods** (`getUTCDay`, `setUTCDate`, `setUTCHours`) to avoid timezone-shift bugs. Export via `export { ... }` at the bottom of the file.

### Testing

- Component tests mock `useAppData` via `vi.mock("../src/context/AppDataContext", ...)`
- Use `makeAppData(overrides)` from `tests/mockAppData.js` to build the context value
- `loadLogs` and similar async mocks must use `vi.fn().mockResolvedValue(...)` — bare `vi.fn()` returns `undefined` and will crash `.catch()` calls in effects
- Avoid `beforeEach(() => render(...))` across different `describe` blocks — render independently per test

## Design Principles

1. **Athlete-first usability** — training fits real life, not the other way around
2. **Evidence-informed coaching** — structured endurance methodology (Jason Koop-inspired)
3. **Explainable AI** — all recommendations include reasoning
4. **Progressive adaptation** — plans evolve based on execution and feedback
5. **Data ownership** — athlete controls their training data
6. **Single-user first** — no premature multi-user complexity

## Key Files Reference

- **`agents.md`** — AI agent specs, data model guidance, training methodology, security requirements, and product roadmap. Read before making architectural decisions.
- **`src/domain/compute.js`** — All pure business logic: week start calculation, weekly summaries, training load (ATL/CTL/TSB), Koop plan generation, coaching insight generation. Add new logic here first; wire to UI second.
- **`src/context/AppDataContext.jsx`** — Central data hub. Any new Supabase table needs a hook + integration here.
- **`tests/mockAppData.js`** — Shared test fixtures. Update `makeAppData()` whenever a new data slice is added to `AppDataContext`.

## Guidelines for AI Assistants

- Read `agents.md` before proposing backend or AI-related changes
- Never expose secrets or API keys in frontend code — route all external API calls through Supabase Edge Functions
- When adding a new page or data source: create a hook in `src/hooks/`, add it to `AppDataContext`, update `makeAppData()` in `tests/mockAppData.js`, write component tests
- All date arithmetic in `compute.js` must use UTC methods to work correctly across timezones
- Keep CSS variables consistent; use existing tokens from `tokens.css` before adding new ones
- The `AppDataContext` is the single source of truth — pages must not maintain their own copies of server data
