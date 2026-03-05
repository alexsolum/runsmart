# Stack

## Snapshot
- Project: RunSmart (AI-guided endurance training planner).
- Frontend stack: React 18 + Vite 7 + Tailwind CSS 4.
- Backend platform: Supabase (Postgres, Auth, Edge Functions).
- Test stack: Vitest + React Testing Library + Playwright.
- Deployment intent: Vercel-first, with optional GitHub Pages base support.

## Languages and Runtimes
- Frontend: JavaScript/JSX in `src/`.
- Edge functions: TypeScript running on Deno in `supabase/functions/`.
- SQL migrations: Postgres SQL in `supabase/migrations/`.
- Node runtime tooling via `npm` scripts in `package.json`.

## Core Frameworks and Libraries
- React runtime: `react`, `react-dom`.
- Build tooling: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`.
- UI primitives: Radix (`@radix-ui/*`) + shadcn pattern (`src/components/ui/*`).
- Data/auth client: `@supabase/supabase-js`.
- Form/validation: `react-hook-form`, `@hookform/resolvers`, `zod`.
- Charts: `recharts`.
- Utility helpers: `clsx`, `class-variance-authority`, `tailwind-merge`.

## Configuration Surface
- Vite config: `vite.config.mjs`.
- Vitest config: `vitest.config.js`.
- Playwright config: `playwright.config.ts`.
- Runtime config resolver: `src/config/runtime.js`.
- Browser runtime fallback config: `public/runtime-config.js`.
- Legacy static assets still present: `styles.css`, `app.js`, `config.js`.

## Build/Test Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Integration tests: `npm run test:integration`
- AI/live tests: `npm run test:ai`

## Data/Analytics Domain Modules
- Computation module: `src/domain/compute.js`
- Data hooks layer: `src/hooks/*.js`
- Global app context provider: `src/context/AppDataContext.jsx`

## Style System
- Tokenized CSS lives in `src/styles/tokens.css`.
- Tailwind entrypoints: `src/styles/tailwind.css`, `src/styles/index.css`.
- Component styling is mixed utility classes + custom classes (example: `src/App.jsx`).

## Notable Versioning State
- Plain JavaScript frontend (no TypeScript in `src/`).
- Edge functions are TypeScript-first and more strictly structured than frontend.
- Coexistence of legacy monolithic frontend script (`app.js`) with modern React app in `src/`.

