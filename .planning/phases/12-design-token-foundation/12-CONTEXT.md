# Phase 12: Design Token Foundation - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the Precision Athlete design system as CSS custom properties and Google Fonts links so that all new planner components (Phases 13-16) can be built against the correct colors, typography, and surface rules from their first commit. Existing pages must remain visually unchanged — token migration is additive and namespaced.

</domain>

<decisions>
## Implementation Decisions

### Font loading
- Google Fonts `<link>` tags for Manrope and Inter go in `index.html` `<head>` — same pattern as existing DM Sans loading
- Existing fonts (DM Sans, Instrument Serif, Outfit) stay alongside — remove only when existing pages are migrated in Phase 16
- `font-display: swap` for both Manrope and Inter — brief FOUT acceptable, no invisible text
- Manrope weights: 400, 600, 700 (body, semi-bold labels, bold headlines)
- Inter weights: 400, 500, 600 (body, medium labels, semi-bold data)

### Surface & elevation tokens
- Three tonal surface levels only (matching DESIGN.md): surface (#f8f9fa), surface-container-low (#f3f4f5), surface-container-lowest (#ffffff)
- Glassmorphism as dedicated tokens: --pa-glass-bg (rgba primary at 85% opacity), --pa-glass-blur (20px), --pa-glass-shadow — components compose these
- A `.pa-glass` utility class in the token file with `@supports(backdrop-filter)` fallback built in
- Ghost border token (--pa-outline) at 20% opacity for input field accessibility per DESIGN.md guidance
- Primary-tinted ambient shadows: rgba(0, 51, 113, 0.08) — matches DESIGN.md vibrant depth spec

### Migration boundary
- Phase 12 delivers tokens + font links only — no demo component or test page
- New tokens live in a separate file: `src/styles/pa-tokens.css` — clean separation from existing `tokens.css`
- Both files imported in `index.css` — no collision risk between old and new design systems
- Workout-type card colors (navy intensity, blue recovery, amber long run) deferred to Phase 13 — they belong with the workout type registry, not the generic token layer
- `@supports` glassmorphism fallback defined centrally in the token file, not per-component

### Token namespace strategy
Claude's discretion — use a `--pa-*` prefix (Precision Athlete) for all new tokens to avoid collision with existing `--color-*`, `--space-*`, `--shadow-*` tokens.

### Claude's Discretion
- Exact `--pa-*` token names and grouping within the file
- Inter font weights to load (400/500/600 recommended based on DESIGN.md data-text usage)
- Exact rgba values for glass background opacity
- Spacing token values (4px baseline grid from DESIGN.md)
- Typography scale token names and sizes
- CTA gradient token structure (primary to primary_container at 135deg)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design system spec
- `DESIGN.md` — Full Precision Athlete design system: color palette, typography rules, surface hierarchy, elevation strategy, component primitives, do's and don'ts
- `docs/stitch_weekly_planner/screen.png` — Visual reference for the target planner design (4-week grid with Precision Athlete styling)

### Existing token system
- `src/styles/tokens.css` — Current design tokens (DM Sans/Outfit fonts, blue #2563eb primary) — must NOT be modified, only coexist with new pa-tokens.css
- `src/styles/index.css` — Main stylesheet entry point where both token files will be imported

### Requirements
- `.planning/REQUIREMENTS.md` — DSGN-01 through DSGN-04 define the success criteria for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/styles/tokens.css`: Existing token file with established naming patterns (--color-*, --space-*, --radius-*, --shadow-*, --font-*). New file follows similar structure with --pa-* prefix.
- `index.html`: Already loads Google Fonts (DM Sans) via CDN link tags — Manrope/Inter links follow the same pattern.

### Established Patterns
- CSS custom properties on `:root` — new tokens follow the same approach
- `src/styles/index.css` imports token files — new pa-tokens.css added here
- Utility-class-heavy JSX — the `.pa-glass` utility class fits this pattern

### Integration Points
- `index.html` `<head>`: Add Google Fonts link tags for Manrope and Inter
- `src/styles/index.css`: Import new `pa-tokens.css` alongside existing `tokens.css`
- No component changes in this phase — tokens are consumed starting in Phase 14

</code_context>

<specifics>
## Specific Ideas

- The Precision Athlete visual target is captured in the stitch export (docs/stitch_weekly_planner/screen.png) — navy palette, borderless tonal cards, Manrope headlines, editorial layout
- DESIGN.md's "No-Line Rule" is a core principle — no 1px solid borders, separation via background shifts and whitespace only
- The "Pulse" gradient (primary #003371 to primary_container #00499c at 135deg) should be tokenized for CTA buttons

</specifics>

<deferred>
## Deferred Ideas

- Workout-type color tokens (intensity/recovery/long run) — Phase 13 (workout type registry)
- App shell component styling (sidebar, topbar, mobile nav) — Phase 16
- Removal of old fonts (DM Sans, Instrument Serif, Outfit) — Phase 16 when existing pages migrate
- Dark mode tokens — explicitly out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 12-design-token-foundation*
*Context gathered: 2026-03-24*
