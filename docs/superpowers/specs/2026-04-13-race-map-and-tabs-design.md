# Race Map And Tabs Design

## Goal

Add a fuller interactive map to the races page using race coordinates from the database, differentiate completed races from bucket-list races with different marker icons, allow map-level filtering between those groups, and restyle the shared tabs component to match the Shadcn Studio "Tabs 3" treatment across the dashboard and race flows.

## Current Context

- The app is a Vite SPA using React, Tailwind CSS v4, and shadcn-style source components.
- The shared tabs primitive lives in `src/components/ui/tabs.jsx` and is used by the dashboard, race list page, and race detail page.
- The race list page currently renders a static map placeholder in `src/components/races/RaceListView.jsx`.
- Race records already support `latitude` and `longitude` in the `races` table, and current fixtures show those fields populated for some races.
- Race status is already inferred from `race_participations`: races with one or more participations are "done", and races with zero participations are bucket-list races.

## Requirements

### Races Map

- Replace the placeholder map on the race list page with a real interactive map surface.
- Render only races that have valid coordinates.
- Fit the map view to visible race markers when the page loads and when the map filter changes.
- Use different marker icons for:
  - races already completed
  - races on the bucket list
- Clicking a marker should select the race and navigate into the existing full `RaceDetailView`.
- Add a map-local filter with three states:
  - `All`
  - `Done`
  - `Bucket list`
- The map filter changes only which markers appear on the map. It does not replace the existing page tabs or reclassify races elsewhere on the page.

### Tabs Refresh

- Update the shared tabs styling so it visually matches the "Tabs 3" example from Shadcn Studio as closely as possible within the current codebase.
- Apply the new shared tabs treatment everywhere `src/components/ui/tabs.jsx` is used:
  - dashboard tabs on `src/pages/HeroPage.jsx`
  - race list tabs in `src/components/races/RaceListView.jsx`
  - race detail subtabs in `src/components/races/RaceDetailView.jsx`
- Keep the existing tabs API stable so current usages need minimal call-site change.

## Recommended Architecture

### Map Component

Add a focused `RaceMap` component under `src/components/races/` that is responsible for:

- receiving the full race collection
- deriving mappable races
- deriving filtered visible races from the selected map filter
- creating the correct marker icon for each race state
- fitting the map bounds to the currently visible markers
- surfacing marker clicks back to the parent via `onSelectRace`

This keeps map-specific logic out of `RaceListView` and avoids coupling map rendering to the broader race-detail state.

### Race List Page Composition

`RaceListView` remains the page-level coordinator for:

- grouping races into history and bucket-list tab content
- rendering the add-race button
- passing `onSelectRace` through to cards and map markers

The map sits above the existing list tabs as a richer entry surface, but the list/grid flow remains intact.

### Shared Tabs Primitive

Keep `src/components/ui/tabs.jsx` as the single shared primitive and update its base classes to the new visual treatment. This is preferable to creating a second tabs component because:

- the current issue is shared styling, not divergent behavior
- the dashboard and race pages already import the same primitive
- a single update avoids visual drift between pages

CSS additions needed by the new treatment should go into `src/styles/index.css`, which is the configured global Tailwind CSS file from `components.json`.

## Data Flow

1. `RacePage` continues to own `selectedRaceId` and `activeTab`.
2. `RaceListView` receives all races and renders:
   - `RaceMap`
   - race tabs and race cards
3. `RaceMap` filters races to those with coordinates, applies its own `All/Done/Bucket list` visibility filter, and renders markers.
4. Marker click calls the same `onSelectRace(race.id)` callback already used by race cards.
5. `RacePage` swaps from list view to the existing `RaceDetailView`.

## UI And Interaction Details

### Map Experience

- The map should feel like a real exploration surface, not a decorative banner.
- It should support normal pan and zoom interactions.
- If no races have coordinates, render a clear empty state in the map card rather than an empty or broken map.
- If the current map filter yields zero visible races, show a filter-aware empty state in the map area while preserving the filter control.

### Filtering Semantics

- `All` shows every race with coordinates.
- `Done` shows only races with one or more participations and valid coordinates.
- `Bucket list` shows only races with zero participations and valid coordinates.
- Existing page tabs still control the list/grid content below the map:
  - `History`
  - `Bucket list`
- Map filtering and page tab selection are intentionally independent so the map can be used as a quick visual selector without collapsing the existing page structure.

### Marker Semantics

- The primary distinction between done and bucket-list races is marker icon shape.
- Color may remain secondary or neutral but should not become the only status signal.
- Marker content should be minimal: navigation happens on click, so no secondary detail panel is required in this pass.

### Tabs Styling

- The new tabs treatment should preserve accessibility and keyboard interaction from Radix tabs.
- The shared styles should fix the current overly heavy, flat list background and align spacing, trigger shape, and active-state emphasis with the requested Tabs 3 design.
- Call sites may add icon support or spacing classes if needed, but the primitive should provide the main visual behavior.

## Error Handling

- Ignore races with missing or invalid coordinates when building map markers.
- Do not attempt geocoding in this pass.
- If the map library fails to load, the page should degrade gracefully with a non-blocking fallback state rather than breaking the race page.

## Testing Strategy

Follow TDD for implementation:

1. Add failing tests for race-map behavior.
2. Add failing tests for the tabs visual contract where practical.
3. Implement the minimum code to pass.

Test coverage should include:

- map renders only races with coordinates
- map filter switches between `All`, `Done`, and `Bucket list`
- marker selection calls the existing race selection callback
- race list page still separates history and bucket-list grids correctly
- updated shared tabs continue to render tab triggers/content correctly for dashboard and race pages

Tests can mock the underlying map library so they assert app behavior rather than external implementation details.

## Out Of Scope

- geocoding text locations into coordinates
- redesigning `RaceDetailView`
- map popovers with rich race summaries
- syncing map filter state to the existing race list tabs
- advanced map clustering or route overlays

## Implementation Notes

- Check `components.json` before wiring imports or file paths for any added shadcn-style component files.
- Install the requested dependencies with the repo's existing package manager.
- Use the shadcn CLI for required component setup only where it is actually needed by the current project state.
- Adapt the provided Tabs 3 example to this repo's JSX and file layout rather than copying TypeScript verbatim.
