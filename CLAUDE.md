# CLAUDE.md — RunSmart

## Project Overview

RunSmart is a web-first training planning application for endurance runners. It combines AI-assisted training planning with real-life schedule awareness, training analytics, and continuous adaptation recommendations. The product emphasizes practical periodization, explainable AI coaching insights, and privacy-first data handling.

**Current status:** Static front-end prototype (HTML/CSS/JS). No build step, no framework, no backend integration yet. See `agents.md` for the full product vision and planned architecture.

## Repository Structure

```
runsmart/
├── index.html      # Single-page HTML entry point — all UI sections
├── styles.css      # All styling — CSS variables, responsive breakpoints
├── app.js          # Client-side interactivity — navigation, form handling, mobile menu
├── agents.md       # AI agent specifications and product architecture reference
├── README.md       # User-facing project documentation
└── CLAUDE.md       # This file
```

This is a flat, single-directory project with no subdirectories, no package.json, and no node_modules.

## Tech Stack

| Layer | Current | Planned |
|-------|---------|---------|
| Frontend | Vanilla HTML5, CSS3, ES6+ JS | React + Vite |
| Backend | None | Supabase (PostgreSQL, Edge Functions, Auth) |
| Hosting | Local static server | GitHub Pages |
| Visualization | CSS cards/grids | Plotly (D3 later) |
| Type system | None | TypeScript |
| Linting | None | ESLint + Prettier |
| Testing | None | Vitest or Jest |
| CI/CD | None | GitHub Actions |

## Development

### Running locally

No build step required. Serve the static files:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

Alternatively, open `index.html` directly in a browser.

### No package manager or dependencies

There is no `package.json`, no npm/yarn, and no external JS dependencies. The only external resource is Google Fonts (Inter) loaded via CDN in `index.html`.

## Code Conventions

### HTML (`index.html`)

- Semantic HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Accessibility: ARIA attributes (`aria-label`, `aria-expanded`, `aria-live="polite"`)
- Sections identified by anchor IDs: `#planning`, `#insights`, `#data`, `#roadmap`
- Interactive elements use `data-action` attributes for JS binding

### CSS (`styles.css`)

- CSS custom properties on `:root` for theming:
  - `--bg`, `--text`, `--muted`, `--accent`, `--accent-soft`, `--card`, `--border`, `--success`
- BEM-like class naming: `.section-header`, `.hero-card`, `.card-grid`, `.plan-form`
- Responsive breakpoints at **900px** (tablet) and **600px** (mobile)
- Border-radius values: 10px, 12px, 16px, 18px, 20px, 24px, 999px (pill)
- Font: Inter with weights 300, 400, 600, 700

### JavaScript (`app.js`)

- Vanilla ES6+ with no transpilation
- DOM queries use `data-` attributes: `document.querySelectorAll("[data-action]")`
- Event listeners attached directly to DOM elements
- camelCase naming for variables and functions
- Minimal state — only UI state (form values, menu toggle)

## Architecture Notes

### Current: Static SPA prototype

- No routing library — anchor links with smooth scroll
- No state management — DOM-only
- No API calls — placeholder data rendered in HTML
- Five content sections: Hero, Planning, Insights, Data, Roadmap

### Planned: Full-stack app (see `agents.md`)

- **Frontend:** React + Vite, deployed to GitHub Pages
- **Backend:** Supabase providing PostgreSQL, Auth, Edge Functions
- **AI agents:** Three agents (Training Plan Generator, Training Analysis, Data Ingestion)
- **Data model:** Tables for `users`, `goal_races`, `training_blocks`, `weekly_plans`, `activities`, `analytics_snapshots`, `athlete_feedback`
- **Security:** All API keys and sensitive operations via Supabase Edge Functions; frontend never exposes secrets
- **External integrations:** Strava OAuth (via Edge Functions)

## Design Principles

1. **Athlete-first usability** — training fits real life, not the other way around
2. **Evidence-informed coaching** — structured endurance methodology (Jason Koop-inspired)
3. **Explainable AI** — all recommendations include reasoning
4. **Progressive adaptation** — plans evolve based on execution and feedback
5. **Data ownership** — athlete controls their training data
6. **Single-user first** — no premature multi-user complexity

## Key Files Reference

- **`agents.md`** — The most important reference document. Contains full specifications for the three AI agents, data model guidance, training methodology assumptions, security requirements, and the product roadmap. Read this before making architectural decisions.
- **`index.html`** — All page structure and content. Sections map to planned features.
- **`styles.css`** — Complete styling with CSS variables for the design system.
- **`app.js`** — All interactivity (46 lines). Handles navigation scrolling, form submission feedback, and mobile menu toggle.

## Guidelines for AI Assistants

- Read `agents.md` before proposing backend or AI-related changes — it defines the target architecture and agent behavior
- The prototype is intentionally minimal; avoid over-engineering additions
- Preserve accessibility patterns (ARIA attributes, semantic HTML) when modifying the UI
- Keep CSS variables consistent when adding styles; use existing custom properties
- When the project migrates to React + Vite, follow the architecture outlined in `agents.md`
- No secrets, API keys, or credentials should ever appear in frontend code
- All Strava and AI API interactions must route through Supabase Edge Functions (when implemented)
