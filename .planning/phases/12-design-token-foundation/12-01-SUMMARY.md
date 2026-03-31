---
phase: 12-design-token-foundation
plan: 01
subsystem: ui
tags: [css-custom-properties, design-tokens, tailwind, google-fonts, glassmorphism, manrope, inter]

# Dependency graph
requires: []
provides:
  - "--pa-* CSS custom property namespace with 5 core palette colors, 3 surface tokens, 2 font stacks, 9 spacing values on 4px grid, 5 elevation tokens, 3 glassmorphism tokens, 1 gradient token, and full type scale"
  - ".pa-glass utility class with @supports fallback for glassmorphism (includes -webkit-backdrop-filter for Safari)"
  - "Manrope (400/600/700) and Inter (400/500/600) loaded from Google Fonts CDN with display=swap"
  - "font-manrope and font-inter Tailwind utility classes via @theme block"
  - "Automated token validation via pa-tokens unit tests (24 tests)"
affects:
  - 13-constraint-aware-load-analysis
  - 14-four-week-grid-component
  - 15-weekly-plan-editor
  - 16-volume-trend-header

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Precision Athlete token namespace: all new tokens use --pa-* prefix to prevent collision with existing --color-*, --space-*, shadcn vars"
    - "No-Line Rule: tonal surface layering replaces 1px solid borders in all pa-* components"
    - "Glassmorphism with @supports: fallback for unsupported browsers via solid bg on .pa-glass, enhanced with backdrop-filter when supported"
    - "TDD for CSS: pa-tokens.test.js reads pa-tokens.css as text and asserts token presence via string matching"

key-files:
  created:
    - src/styles/pa-tokens.css
    - tests/unit/pa-tokens.test.js
  modified:
    - index.html
    - src/styles/index.css
    - vitest.config.js

key-decisions:
  - "Token migration is additive: --pa-* namespace only, zero overlap with existing --color-*, --space-*, shadcn vars"
  - "No-Line Rule enforced in pa-tokens.css: tonal surface hierarchy replaces all 1px solid borders"
  - "Google Fonts CDN strategy: separate link tag for Manrope+Inter coexists with existing DM Sans link"
  - "Glassmorphism uses @supports with or() condition: (backdrop-filter) or (-webkit-backdrop-filter) for Safari support"

patterns-established:
  - "Pattern 1: --pa-* prefix for all Precision Athlete design tokens — prevents collision with shadcn and legacy tokens"
  - "Pattern 2: CSS token testing via readFileSync — validates token presence at build time without a browser"
  - "Pattern 3: Additive CSS imports — pa-tokens.css appended after tokens.css, before styles.css, preserving existing cascade"

requirements-completed: [DSGN-01, DSGN-02, DSGN-03, DSGN-04]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 12 Plan 01: Design Token Foundation Summary

**--pa-* CSS custom property system with Manrope/Inter Google Fonts, .pa-glass glassmorphism utility, and 24-test automated token validation**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T06:37:25Z
- **Completed:** 2026-03-24T06:41:53Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `src/styles/pa-tokens.css` with the complete Precision Athlete token set (5 core colors, 3 surfaces, 2 font stacks, 9 spacing values, 5 elevation tokens, 3 glassmorphism tokens, 1 gradient, type scale)
- Added `.pa-glass` utility class with `@supports` fallback covering both `backdrop-filter` and `-webkit-backdrop-filter` (Safari)
- Registered Manrope (400/600/700) and Inter (400/500/600) via Google Fonts CDN link in `index.html` with `display=swap`
- Added `--font-manrope` and `--font-inter` to `@theme` block enabling `className="font-manrope"` and `className="font-inter"` Tailwind utilities
- 24 unit tests pass; zero regressions in the existing test suite

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pa-tokens unit test and update vitest config (RED)** - `86b1c00` (test)
2. **Task 2: Create pa-tokens.css, add font links, register in index.css (GREEN)** - `f8fe60b` (feat)

**Plan metadata:** committed in final docs commit

_Note: TDD tasks have two commits (test RED → feat GREEN)_

## Files Created/Modified
- `src/styles/pa-tokens.css` - Complete Precision Athlete design token set with glassmorphism, elevation, type scale
- `tests/unit/pa-tokens.test.js` - 24 automated tests validating all token presence via string matching
- `index.html` - Added Manrope+Inter Google Fonts link (existing DM Sans link preserved)
- `src/styles/index.css` - Added `@import './pa-tokens.css'` and `--font-manrope`/`--font-inter` entries in `@theme` block
- `vitest.config.js` - Added `tests/unit/pa-tokens.test.js` to unit project include array

## Decisions Made
- Token migration is additive: `--pa-*` namespace only — zero overlap with existing `--color-*`, `--space-*`, shadcn vars. Global `--primary` override deferred to a future milestone.
- No-Line Rule enforced in `pa-tokens.css`: tonal surface hierarchy (`--pa-surface`, `--pa-surface-container-low`, `--pa-surface-container-lowest`) replaces all `1px solid` borders.
- Glassmorphism uses `@supports` with `or()` condition covering both `backdrop-filter` and `-webkit-backdrop-filter` for Safari compatibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures (7 tests in coach.test.jsx, dashboard.layout.test.jsx, i18n.test.jsx, weeklyplan.test.jsx) were present before this plan's changes. Confirmed via `git stash` baseline run. Zero regressions introduced.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13+ components can reference `--pa-primary`, `--pa-surface-container-low`, `--pa-font-display`, and all other `--pa-*` tokens from their first commit
- `.pa-glass` utility is ready for use in panel/sidebar components
- `font-manrope` and `font-inter` Tailwind classes are available immediately
- No blockers for Phase 13 (constraint-aware load analysis)

---
*Phase: 12-design-token-foundation*
*Completed: 2026-03-24*
