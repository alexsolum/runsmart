# RunSmart UX Improvement Plan (Dashboard Refresh)

This plan translates the provided dashboard inspiration into practical, incremental UX improvements for RunSmart.

## 1) UX Direction

Target experience:
- Calm, data-dense, athlete-first dashboard.
- Fast weekly decision-making ("what to do today" and "what changed this week").
- Better visual hierarchy, not just more data.

Design principles:
- **Scan first, drill second**: clear top-line metrics and obvious next actions.
- **One primary focus per panel**: avoid mixed-purpose cards.
- **Consistency over novelty**: repeat spacing, card structure, and chart styles.
- **Mobile parity**: same information architecture with responsive reflow.

## 2) Information Architecture Updates

### A. Three-column desktop layout
- **Left rail (navigation)**
  - Keep global sections: Overview, Plan, Activities, Analytics, Settings.
  - Add subtle active-state indicator and icon alignment.
  - Keep account/actions pinned at bottom.

- **Center workspace (primary content)**
  - Welcome + date range controls.
  - KPI strip (3–4 metrics): Weekly Distance, Training Load, Consistency, Readiness.
  - Main trend chart card with compact filters (week/month, run type).
  - Two supporting insight cards below (Workout mix, Fatigue/Form).

- **Right rail (context stream)**
  - "Recent Activity" timeline with quick filters (Today, Week, Month).
  - Search input for workouts/events.
  - Compact event rows with icon, short summary, timestamp.

### B. Mobile/tablet reflow
- Convert to stacked sections:
  1) Header controls
  2) KPI strip (horizontal scroll)
  3) Main chart
  4) Insights cards
  5) Recent activity feed
- Keep sticky top controls for date-range and quick actions.

## 3) Component-Level Improvements

### Header and controls
- Add persistent greeting/context block: athlete name + current training phase.
- Add unified control group for date range, filters, and notifications.
- Standardize control sizes (36–40px heights) for touch ergonomics.

### KPI cards
- Use compact cards with:
  - Title
  - Primary value
  - Delta vs prior period (+/- with color and icon)
  - Optional helper text ("vs last week")
- Keep deltas color-safe (green/amber/red plus icon/label).

### Main chart panel
- Increase chart legibility with:
  - softer grid lines
  - clearer tooltip
  - selectable metric overlays (distance, load, pace)
- Place filters in card header, not mixed into plot area.

### Activity timeline (right rail)
- Create reusable row component:
  - category icon
  - one-line title
  - secondary context line
  - timestamp right aligned
- Use subtle separators to avoid visual clutter.

## 4) Visual System and Styling

- Introduce a lightweight design token layer in CSS:
  - spacing scale (4/8/12/16/24/32)
  - radius scale (8/12/16)
  - elevation levels (none, card, floating)
  - semantic color tokens (success/warning/critical/info)
- Increase contrast of labels and small text to improve readability.
- Reduce heavy borders; prefer neutral backgrounds + soft shadows.
- Use consistent card padding and gap rhythm across dashboard.

## 5) Interaction and UX Behavior

- Preserve filter state when navigating between sections.
- Add skeleton loaders for KPI cards, chart, and activity feed.
- Add empty-state guidance (e.g., "Connect Strava" CTA).
- Add progressive disclosure:
  - compact default cards
  - "Details" actions for deeper analysis views.

## 6) Accessibility and Quality Bar

- Meet WCAG AA contrast for text and chart labels.
- Ensure full keyboard navigation for sidebar, filters, tabs, and timeline rows.
- Add focus-visible styles on interactive controls.
- Ensure chart alternatives exist (summary text below chart).
- Verify tap targets >= 44x44 on touch devices.

## 7) Implementation Roadmap

### Phase 1 — Foundation (low risk)
1. Introduce layout shell (left/center/right) and responsive breakpoints.
2. Add shared card component and tokenized spacing/typography styles.
3. Refactor existing dashboard sections into the new card layout.

### Phase 2 — Data UX
1. Build KPI strip with trend deltas.
2. Upgrade main trend chart panel with better tooltips + filters.
3. Add right-rail activity timeline with quick filters.

### Phase 3 — Polish + accessibility
1. Add loading/empty/error states.
2. Add keyboard and focus improvements.
3. Tune spacing, contrast, and motion for perceived performance.

## 8) Success Metrics

Measure impact after rollout:
- Time-to-insight: median time to identify weekly training status.
- Engagement: increase in dashboard interactions/session.
- Planner completion: % of users confirming weekly plan after viewing dashboard.
- Error rate: reduced navigation mis-clicks and filter resets.
- Accessibility: zero critical issues in automated + manual audits.

## 9) Immediate Next Tasks (Execution Backlog)

1. Create wireframe variants for desktop and mobile using this structure.
2. Map existing React components to new layout slots.
3. Define CSS tokens and card primitives in `styles.css`.
4. Implement KPI strip + activity timeline components in `src`.
5. Validate with a quick usability pass (3–5 realistic training scenarios).
