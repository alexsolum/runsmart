# Phase 12: Design Token Foundation - Research

**Researched:** 2026-03-24
**Domain:** CSS custom properties, Google Fonts CDN, glassmorphism, design token architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Font loading**
- Google Fonts `<link>` tags for Manrope and Inter go in `index.html` `<head>` — same pattern as existing DM Sans loading
- Existing fonts (DM Sans, Instrument Serif, Outfit) stay alongside — remove only when existing pages are migrated in Phase 16
- `font-display: swap` for both Manrope and Inter — brief FOUT acceptable, no invisible text
- Manrope weights: 400, 600, 700 (body, semi-bold labels, bold headlines)
- Inter weights: 400, 500, 600 (body, medium labels, semi-bold data)

**Surface & elevation tokens**
- Three tonal surface levels only (matching DESIGN.md): surface (#f8f9fa), surface-container-low (#f3f4f5), surface-container-lowest (#ffffff)
- Glassmorphism as dedicated tokens: --pa-glass-bg (rgba primary at 85% opacity), --pa-glass-blur (20px), --pa-glass-shadow — components compose these
- A `.pa-glass` utility class in the token file with `@supports(backdrop-filter)` fallback built in
- Ghost border token (--pa-outline) at 20% opacity for input field accessibility per DESIGN.md guidance
- Primary-tinted ambient shadows: rgba(0, 51, 113, 0.08) — matches DESIGN.md vibrant depth spec

**Migration boundary**
- Phase 12 delivers tokens + font links only — no demo component or test page
- New tokens live in a separate file: `src/styles/pa-tokens.css` — clean separation from existing `tokens.css`
- Both files imported in `index.css` — no collision risk between old and new design systems
- Workout-type card colors (navy intensity, blue recovery, amber long run) deferred to Phase 13 — they belong with the workout type registry, not the generic token layer
- `@supports` glassmorphism fallback defined centrally in the token file, not per-component

**Token namespace strategy**
- Use a `--pa-*` prefix (Precision Athlete) for all new tokens to avoid collision with existing `--color-*`, `--space-*`, `--shadow-*` tokens

### Claude's Discretion
- Exact `--pa-*` token names and grouping within the file
- Inter font weights to load (400/500/600 recommended based on DESIGN.md data-text usage)
- Exact rgba values for glass background opacity
- Spacing token values (4px baseline grid from DESIGN.md)
- Typography scale token names and sizes
- CTA gradient token structure (primary to primary_container at 135deg)

### Deferred Ideas (OUT OF SCOPE)
- Workout-type color tokens (intensity/recovery/long run) — Phase 13 (workout type registry)
- App shell component styling (sidebar, topbar, mobile nav) — Phase 16
- Removal of old fonts (DM Sans, Instrument Serif, Outfit) — Phase 16 when existing pages migrate
- Dark mode tokens — explicitly out of scope per REQUIREMENTS.md
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DSGN-01 | User sees Precision Athlete navy palette (#003371) and tonal surface hierarchy on all new planner components | Color tokens section: --pa-primary, --pa-surface-*, surface nesting rules |
| DSGN-02 | User sees Manrope font for headlines/display metrics and Inter for body/data text | Font loading section: Google Fonts CSS2 API URLs, @theme inline Tailwind registration |
| DSGN-03 | User sees borderless cards with tonal surface layering (no 1px solid borders) | No-Line Rule section: surface nesting hierarchy, roundedness tokens |
| DSGN-04 | User sees glassmorphism effect on floating action elements with backdrop-blur | Glassmorphism section: @supports fallback pattern, .pa-glass utility class |
</phase_requirements>

---

## Summary

Phase 12 is a CSS infrastructure delivery. The work is entirely additive: a new file (`src/styles/pa-tokens.css`) defining the Precision Athlete design system as CSS custom properties, plus two `<link>` tags in `index.html` for Manrope and Inter from Google Fonts. No React components are created. No existing files are modified except appending one import line to `index.css`.

The key technical challenge is collision safety: the existing `tokens.css` uses `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, and `--font-*` prefixes, plus `index.css` defines unprefixed shadcn variables (`--primary`, `--background`, `--border`, etc.) that Tailwind reads via `@theme inline`. The `--pa-*` namespace is completely clean against all of these. No CSS specificity or cascade conflicts are possible since the new tokens are only referenced by new Phase 13+ components.

The glassmorphism requirement (DSGN-04) is the only technically nuanced item: `backdrop-filter` has ~95% global browser support in 2026, but the `@supports` fallback must be defined centrally in `pa-tokens.css` (not per-component). The `.pa-glass` utility class handles both the supported and fallback paths in one place.

**Primary recommendation:** Write `pa-tokens.css` with clear section comments grouping Color, Typography, Spacing, Elevation, and Glassmorphism tokens, then register the two new font families in `index.css` under `@theme` so Tailwind utilities (`font-manrope`, `font-inter`) are available alongside the CSS variables.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Custom Properties (native) | CSS3 | Design token storage on `:root` | Zero dependency, cascade-aware, composable via `var()` |
| Google Fonts CSS2 API | current | Manrope + Inter font loading | Same CDN already used for DM Sans/Outfit/etc in this project |
| `@supports` (native) | CSS3 | Glassmorphism progressive enhancement | No JS needed; centralizes feature detection in CSS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind `@theme inline` | v4.2 | Expose CSS vars as Tailwind utilities | Register `--font-manrope` so `font-manrope` class is available in JSX |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS custom properties | JS design tokens (style-dictionary) | Overkill for a single CSS file; no build step needed |
| Google Fonts CDN | Self-hosted fonts | Better privacy/performance but out of scope for this phase |
| `@supports` fallback | JS feature detection | CSS-native is simpler, colocated with the token definition |

**Installation:** No new npm packages required. All capabilities are native CSS or existing project dependencies.

---

## Architecture Patterns

### Recommended Project Structure

No new directories are needed. Two file changes:

```
src/
└── styles/
    ├── tokens.css          # EXISTING — do not modify
    ├── pa-tokens.css       # NEW — Precision Athlete design tokens
    └── index.css           # MODIFY — add @import './pa-tokens.css'
index.html                  # MODIFY — add Manrope + Inter <link> tags
```

### Pattern 1: Token File Structure with Section Comments

**What:** Single `:root` block with clearly delimited sections for each token group.
**When to use:** Any design token file in a project with multiple token namespaces.

```css
/* src/styles/pa-tokens.css */

/* ── 1. Color: Core Palette ── */
:root {
  --pa-primary:            #003371;
  --pa-primary-container:  #00499c;
  --pa-on-primary:         #ffffff;
  /* ... */
}

/* ── 2. Color: Surface Hierarchy ── */
:root {
  --pa-surface:                  #f8f9fa;
  --pa-surface-container-low:    #f3f4f5;
  --pa-surface-container-lowest: #ffffff;
  /* ... */
}

/* ── 3. Typography ── */
:root {
  --pa-font-display: "Manrope", system-ui, sans-serif;
  --pa-font-body:    "Inter", system-ui, sans-serif;
  /* ... */
}

/* ── 4. Spacing (4px baseline grid) ── */
:root {
  --pa-space-1:  4px;
  --pa-space-2:  8px;
  --pa-space-3:  12px;
  --pa-space-4:  16px;
  --pa-space-6:  24px;
  --pa-space-8:  32px;
  --pa-space-10: 40px;
  --pa-space-12: 48px;
  --pa-space-16: 64px;
}

/* ── 5. Elevation & Shadows ── */
:root {
  --pa-shadow-ambient: 0 12px 32px rgba(0, 51, 113, 0.08);
  --pa-shadow-card:    0 4px 16px rgba(0, 51, 113, 0.06);
  --pa-outline:        rgba(0, 51, 113, 0.20);
  --pa-radius-card:    0.75rem;   /* roundedness-xl per DESIGN.md */
  --pa-radius-full:    999px;
}

/* ── 6. Glassmorphism ── */
:root {
  --pa-glass-bg:     rgba(0, 51, 113, 0.85);
  --pa-glass-blur:   20px;
  --pa-glass-shadow: 0 8px 32px rgba(0, 51, 113, 0.24);
}

/* .pa-glass — floating action elements (FAB, overlay nav)
   Fallback: solid primary background when backdrop-filter unsupported */
.pa-glass {
  background: var(--pa-glass-bg);
  box-shadow: var(--pa-glass-shadow);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .pa-glass {
    background: rgba(0, 51, 113, 0.15);
    -webkit-backdrop-filter: blur(var(--pa-glass-blur));
    backdrop-filter: blur(var(--pa-glass-blur));
  }
}

/* ── 7. Gradient ── */
:root {
  --pa-gradient-cta: linear-gradient(135deg, #003371 0%, #00499c 100%);
}
```

### Pattern 2: Google Fonts Multi-Family Link Tag

**What:** Single `<link>` combining Manrope and Inter to minimize round trips.
**When to use:** When loading 2+ families from Google Fonts CDN.

```html
<!-- index.html <head> — insert after existing preconnect tags -->
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

Note: The existing preconnect tags (`fonts.googleapis.com` and `fonts.gstatic.com`) already in `index.html` cover the new request — no additional preconnects needed.

### Pattern 3: Tailwind v4 Font Registration

**What:** Register new font families in `index.css` `@theme` block so Tailwind generates `font-manrope` and `font-inter` utility classes.
**When to use:** Any new font used with Tailwind v4.

```css
/* src/styles/index.css — add to existing @theme block */
@theme {
  /* existing entries stay */
  --font-sans:    "DM Sans", system-ui, sans-serif;
  --font-serif:   "Instrument Serif", Georgia, serif;
  --font-mono:    "JetBrains Mono", monospace;
  --font-display: "Outfit", "DM Sans", system-ui, sans-serif;

  /* new PA entries */
  --font-manrope: "Manrope", system-ui, sans-serif;
  --font-inter:   "Inter", system-ui, sans-serif;
}
```

This enables `className="font-manrope"` and `className="font-inter"` in JSX starting Phase 13.

### Anti-Patterns to Avoid

- **Modifying `tokens.css`:** Tempting to add PA tokens there, but it breaks the clean migration boundary. Existing pages depend on `tokens.css` — any change risks regression.
- **Using `--primary` as a PA token name:** Collides directly with shadcn's `--primary: #2563eb` defined in `index.css`. All PA tokens must carry the `--pa-` prefix.
- **Putting `@supports` in future component files:** The CONTEXT.md decision locks glassmorphism fallback to `pa-tokens.css` via the `.pa-glass` utility class. Per-component `@supports` duplication violates DRY and risks inconsistent fallbacks.
- **Separate `<link>` tags per font:** Loading Manrope and Inter in separate `<link>` tags doubles DNS + TLS round trips. Combine in one URL with `&family=` separator.
- **Loading unused font weights:** Only load declared weights (Manrope: 400/600/700, Inter: 400/500/600). Each additional weight adds ~30-50KB to the font CSS payload.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading with FOUT prevention | Custom font-face + JS loader | Google Fonts `display=swap` | `font-display: swap` is the spec-correct solution; CDN handles caching/subsetting |
| Glassmorphism browser detection | `window.CSS.supports()` in JS | CSS `@supports` feature query | CSS-native; works before JS parses; no hydration mismatch risk |
| Token collision namespacing | Manual audit of all existing var names | `--pa-*` prefix convention | Systematic; zero possibility of collision with `--color-*`, `--space-*`, shadcn vars |

---

## Common Pitfalls

### Pitfall 1: shadcn Variable Collision

**What goes wrong:** `index.css` defines many unprefixed variables including `--primary`, `--background`, `--border`, `--card`, `--ring`, `--input`, `--muted`, `--accent`. If PA tokens reuse any of these names, existing shadcn components (Button, Card, Input) will change appearance silently.
**Why it happens:** The shadcn variables look like generic names. It is natural to want `--primary` to mean the navy primary color.
**How to avoid:** Prefix every PA token with `--pa-`. Never use `--primary`, `--surface`, `--card`, `--border` without the `--pa-` prefix.
**Warning signs:** Existing component tests (shadcn.contract.test.jsx) pass but buttons turn navy — meaning the shadcn `--primary` was overwritten.

### Pitfall 2: @theme vs :root Font Declaration

**What goes wrong:** Declaring `--font-manrope` only in a `:root {}` block (in `pa-tokens.css`) does NOT make `font-manrope` a Tailwind utility. Tailwind v4 reads `@theme` blocks only.
**Why it happens:** The developer adds the font variable to `:root` in `pa-tokens.css` expecting Tailwind to pick it up automatically.
**How to avoid:** Register fonts in `index.css` inside the existing `@theme { }` block.
**Warning signs:** `className="font-manrope"` produces no style change. `npx tailwindcss` class scan shows no `font-manrope` utility.

### Pitfall 3: Missing -webkit- Prefix on backdrop-filter

**What goes wrong:** Safari requires `-webkit-backdrop-filter` alongside `backdrop-filter`. Without it, glassmorphism silently falls back to solid background on Safari desktop/iOS.
**Why it happens:** Standard-only syntax; `-webkit-` prefix feels archaic and is often forgotten.
**How to avoid:** Always write both properties in `.pa-glass`. The `@supports` query should also check both: `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))`.
**Warning signs:** Glassmorphism works in Chrome but not Safari; iOS screenshots show solid navy background instead of blur.

### Pitfall 4: Font Link Placed After `<script src="/runtime-config.js">`

**What goes wrong:** Font loading is delayed, increasing FOUT duration. The runtime-config script blocks subsequent parsing momentarily.
**Why it happens:** Developer appends the new font link at the end of `<head>` for convenience.
**How to avoid:** Insert the Manrope/Inter link immediately after the existing font link (line 9 of `index.html`), keeping both font links together and before the script tag.
**Warning signs:** Lighthouse shows "Render-blocking resources" for Google Fonts despite `display=swap`.

### Pitfall 5: Import Order in index.css

**What goes wrong:** If `pa-tokens.css` is imported before `tailwindcss`, Tailwind's reset may override `:root` custom properties, or `@layer base` styles may take unexpected precedence.
**Why it happens:** CSS cascade order matters — later imports win.
**How to avoid:** Import `pa-tokens.css` after `@import "tailwindcss"` and after `@import './tokens.css'`. Suggested order:
```css
@import "tailwindcss";
@import './tokens.css';
@import './pa-tokens.css';   /* new — after existing imports */
@import '../../styles.css';
```
**Warning signs:** `:root` token values appear undefined in browser DevTools.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Google Fonts Combined URL (DSGN-02)

```html
<!-- Source: https://developers.google.com/fonts/docs/css2 -->
<!-- Combines Manrope + Inter in one request; preconnects already exist in index.html -->
<link
  href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

### Glassmorphism Utility Class with @supports Fallback (DSGN-04)

```css
/* Source: MDN @supports + caniuse backdrop-filter (~95% global support 2026) */
/* Fallback: solid semi-opaque primary background when backdrop-filter unavailable */
.pa-glass {
  background: var(--pa-glass-bg);      /* rgba(0,51,113,0.85) — opaque fallback */
  box-shadow: var(--pa-glass-shadow);
  color: var(--pa-on-primary);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .pa-glass {
    background: rgba(0, 51, 113, 0.15); /* translucent when blur is available */
    -webkit-backdrop-filter: blur(var(--pa-glass-blur));
    backdrop-filter: blur(var(--pa-glass-blur));
  }
}
```

### Surface Hierarchy Nesting (DSGN-01, DSGN-03)

```css
/* Source: DESIGN.md §2 Surface Hierarchy & §4 Elevation */
/* No borders — separation via background shift only (The "No-Line" Rule) */

/* Page background */
.pa-surface { background: var(--pa-surface); }

/* Section / panel inside page */
.pa-surface-low { background: var(--pa-surface-container-low); }

/* Interactive card — highest contrast, "lifted" */
.pa-card {
  background: var(--pa-surface-container-lowest);
  border-radius: var(--pa-radius-card);
  box-shadow: var(--pa-shadow-card);
  /* NO border: none needed — contrast handles separation */
}
```

### Tailwind Font Registration (DSGN-02)

```css
/* Source: Tailwind v4 @theme docs — https://tailwindcss.com/docs/v4-upgrade */
/* Add to existing @theme block in src/styles/index.css */
@theme {
  --font-manrope: "Manrope", system-ui, sans-serif;
  --font-inter:   "Inter", system-ui, sans-serif;
}
```

Usage in JSX: `<h1 className="font-manrope font-bold text-2xl">Weekly Plan</h1>`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Fonts CSS v1 (`?family=`) | CSS v2 (`/css2?family=`) | ~2020 | v2 supports variable fonts, weight ranges, axis-based loading |
| Separate `<link>` per font | Multiple `family=` params in one URL | ~2020 | Single HTTP request for all families |
| `backdrop-filter` with `-webkit-` only | Both prefixed + unprefixed required | ~2022 | Firefox 103+ added standard property |
| Per-component `@supports` | Central utility class pattern | Design pattern | Consistent fallback; single definition |

**Deprecated/outdated:**
- Google Fonts v1 URL format (`?family=Manrope:400`): Works but lacks `display=swap` control; use v2 `/css2` path instead.
- `@supports (-webkit-backdrop-filter: none)` alone: Insufficient; must also include unprefixed `(backdrop-filter: none)` for Firefox/Chrome coverage.

---

## Open Questions

1. **Tailwind utility classes vs CSS var()-only for PA tokens**
   - What we know: Existing components use both CSS vars and Tailwind utilities (e.g., `bg-primary`, `text-foreground`)
   - What's unclear: Phase 13+ components will be written in Tailwind-heavy JSX — do they need `bg-[var(--pa-surface)]` arbitrary values, or should PA surface colors be exposed as named Tailwind utilities (`bg-pa-surface`)?
   - Recommendation: Decide at Phase 13 planning. For Phase 12, `:root` custom properties are sufficient; arbitrary value syntax works as a fallback. Registering colors in `@theme inline` can be added in Phase 12 if the planner chooses.

2. **Ghost border (--pa-outline) as border-color vs box-shadow**
   - What we know: DESIGN.md says 20% opacity `outline_variant` for input fields. The "No-Line Rule" bans 1px solid borders for section separation, but input fields are explicitly carved out.
   - What's unclear: Whether input ghost borders use `border: 1px solid var(--pa-outline)` or `box-shadow: inset 0 0 0 1px var(--pa-outline)` (avoids layout reflow on focus state changes)
   - Recommendation: Use `box-shadow` inset technique — consistent with DESIGN.md's shadow-based approach and avoids box model shifts. Implement at Phase 15 (Edit modal) where input fields first appear.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.0 + React Testing Library |
| Config file | `vitest.config.js` |
| Quick run command | `npm test -- --run --reporter=verbose` |
| Full suite command | `npm test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSGN-01 | `--pa-primary: #003371` defined in `:root` | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 |
| DSGN-02 | Manrope + Inter `<link>` tags present in `index.html` | manual-only | Visual check in browser | N/A |
| DSGN-02 | `--pa-font-display` and `--pa-font-body` tokens defined | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 |
| DSGN-03 | No `border:` property in `pa-tokens.css` card rules | lint/grep | `grep -n "1px solid" src/styles/pa-tokens.css` | N/A |
| DSGN-04 | `.pa-glass` class has `backdrop-filter` inside `@supports` block | unit (CSS parse) | `npm test -- --run --project=unit` | No — Wave 0 |
| DSGN-04 | `-webkit-backdrop-filter` present alongside standard property | lint/grep | `grep -n "webkit-backdrop-filter" src/styles/pa-tokens.css` | N/A |

**Note on DSGN-02 font rendering:** Whether fonts visually render is not automatable in jsdom (no real CSS engine). Browser visual check is the correct gate. The token definition test (token names defined with correct values) is automatable.

**Note on CSS parse testing:** jsdom does not evaluate CSS files natively. The pragmatic approach is a simple Node.js test that reads `pa-tokens.css` as a text file and asserts expected variable names and values are present using string matching. This is lightweight, fast, and catches typos in token values.

### Sampling Rate
- **Per task commit:** `npm test -- --run --reporter=verbose`
- **Per wave merge:** `npm test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/pa-tokens.test.js` — asserts `--pa-primary`, surface hierarchy values, glassmorphism tokens, and font stack vars are defined correctly in `pa-tokens.css`

Test approach (no CSS engine needed):
```js
// tests/unit/pa-tokens.test.js
import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/styles/pa-tokens.css", "utf-8");

describe("pa-tokens.css token definitions", () => {
  it("defines navy primary", () => {
    expect(css).toContain("--pa-primary: #003371");
  });
  it("defines three surface levels", () => {
    expect(css).toContain("--pa-surface:");
    expect(css).toContain("--pa-surface-container-low:");
    expect(css).toContain("--pa-surface-container-lowest:");
  });
  it(".pa-glass has @supports fallback", () => {
    expect(css).toContain("@supports");
    expect(css).toContain("backdrop-filter");
    expect(css).toContain("-webkit-backdrop-filter");
  });
  it("defines display and body font stacks", () => {
    expect(css).toContain("--pa-font-display");
    expect(css).toContain("--pa-font-body");
  });
});
```

---

## Sources

### Primary (HIGH confidence)
- `DESIGN.md` (project file) — Precision Athlete color palette, surface hierarchy values, typography rules, glassmorphism spec, spacing grid, No-Line Rule
- `src/styles/tokens.css` (project file) — Existing token namespaces to avoid (`--color-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*`)
- `src/styles/index.css` (project file) — shadcn variable names to avoid (`--primary`, `--background`, `--border`, etc.), `@theme` block pattern, import order
- `index.html` (project file) — Existing font `<link>` pattern and preconnect tags already present
- [Google Fonts CSS2 API docs](https://developers.google.com/fonts/docs/css2) — Verified URL format for multi-family + `display=swap`

### Secondary (MEDIUM confidence)
- [Can I Use — backdrop-filter](https://caniuse.com/css-backdrop-filter) — ~95% global support as of 2026; `-webkit-` prefix still required for full Safari support
- [MDN @supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports) — Feature query syntax for `backdrop-filter`

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all technical approaches are native CSS or confirmed project dependencies
- Architecture: HIGH — exact file paths and import order verified from reading project source
- Pitfalls: HIGH — collision risk verified by reading `index.css` shadcn variables and `tokens.css` existing namespaces; `@supports` syntax verified against MDN/caniuse
- Token values: HIGH — all specific values (#003371, #f8f9fa, etc.) sourced directly from `DESIGN.md`

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (stable CSS domain; Google Fonts API URL format is versioned and stable)
