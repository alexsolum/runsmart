---
phase: quick-4
plan: 4
subsystem: insights
tags: [caching, performance, ai, gemini, insights]
dependency_graph:
  requires: []
  provides: [synthesis-cache]
  affects: [InsightsPage]
tech_stack:
  added: []
  patterns: [module-level cache, TTL cache, lazy useState initializer]
key_files:
  created: []
  modified:
    - src/pages/InsightsPage.jsx
decisions:
  - Module-level (not React state/ref) cache chosen so it survives component unmount/remount across navigation without persisting to localStorage
  - Cache keyed by lang so English and Norwegian each have independent TTLs
  - useState lazy initializer used so cached synthesis renders immediately on mount with no flicker or loading skeleton
  - lang-change useEffect sets synthesisFetchedRef.current = true when cache is valid, preventing the fetch useEffect from firing redundantly
metrics:
  duration: 8m
  completed: "2026-03-12"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 4: Cache AI Coaching Synthesis in InsightsPage Summary

**One-liner:** Module-level synthesis cache with 1-hour TTL keyed by language — navigating away and back renders instantly with no Gemini call.

## What Was Done

Added `SYNTHESIS_CACHE` (a plain object) and `SYNTHESIS_CACHE_TTL_MS = 3600000` at module scope in `src/pages/InsightsPage.jsx`, just before the `InsightsPage` component function. Updated the synthesis state/effects block to:

1. **Hydrate on mount** — `useState` lazy initializer checks the cache; if a valid entry for `lang` exists, synthesis renders immediately without any loading skeleton.
2. **Handle language switches** — the `lang` useEffect now checks the cache for the new language. If valid, it restores cached text and marks `synthesisFetchedRef.current = true` (blocking the fetch useEffect). If stale/absent, it clears state and allows a fresh fetch.
3. **Write to cache on success** — after a successful Gemini response passes validation, `SYNTHESIS_CACHE[lang] = { text, cachedAt: Date.now() }` is written before `setSynthesis`.

Cache scope is module-level (JavaScript module singleton). It survives React unmount/remount (navigation) but resets on full browser page reload, which is the desired behavior.

## Files Modified

- `src/pages/InsightsPage.jsx` — added cache constants (lines 349-353), replaced synthesis useState + 2 useEffect blocks

## Decisions Made

- **Module-level vs. React state/ref**: Module-level object chosen because refs/state are reset on component unmount. Navigation in a SPA unmounts the component, so a ref would not survive navigation.
- **No localStorage**: Synthesis content can be several hundred characters of AI output that changes with new training data. In-memory cache is sufficient for within-session reuse; localStorage would introduce stale-data risk across days.
- **Lang as cache key**: English and Norwegian synthesis are entirely different content; independent TTLs prevent cross-language cache poisoning.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm test -- --run` run: 280 tests pass, 6 failures are pre-existing (unrelated to InsightsPage — `gemini-instructions.test.jsx` and `weeklyplan.rolling.test.jsx` timeout).
- Only `src/pages/InsightsPage.jsx` was modified.

## Self-Check: PASSED

- `src/pages/InsightsPage.jsx` — modified and committed (68345f5)
- `SYNTHESIS_CACHE` object present at module scope (line 350)
- `SYNTHESIS_CACHE_TTL_MS` present (line 353)
- `useState` lazy initializer reads from cache (line 742-749)
- lang useEffect writes to `synthesisFetchedRef.current` based on cache validity (line 754-759)
- fetch useEffect writes to `SYNTHESIS_CACHE[lang]` on success (line 786)
