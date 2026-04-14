# Race Cover Photo — Design Spec
**Date:** 2026-04-13
**Branch:** feat/race-image-enrichment

## Overview

Add a descriptive/inspirational cover photo to each race — the start line, an iconic landmark, the UTMB finish — stored separately from the existing AI-generated topographic sketch. The photo is auto-fetched from Wikipedia during race lookup, with manual URL override for smaller races. Both images are displayed in the detail view; the cover photo drives the card list redesign.

---

## 1. Data Model

### New DB column
```sql
ALTER TABLE races ADD COLUMN cover_image_url TEXT;
```

- `image_url` — existing AI topographic sketch (Gemini-generated via `race-image` edge function)
- `cover_image_url` — descriptive/inspirational photo (Wikipedia auto-fetch or manual URL entry)

Both are nullable. No breaking changes.

---

## 2. Backend — `claude-coach` edge function (`race_info` mode)

Add `wikipediaTitle` to the `raceInfo` response object — the exact English Wikipedia article title for the race (e.g. `"Ultra-Trail du Mont-Blanc"`, `"Boston Marathon"`).

Return `null` for races unlikely to have a Wikipedia article.

No new edge function required. The frontend calls the Wikipedia REST API directly (public, no auth).

---

## 3. Frontend — Photo Fetch Flow

In `RaceFormDialog.handleRaceLookup()`, after receiving `raceInfo`:

```
if (raceInfo.wikipediaTitle) {
  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/{title}`)
  → extract response.originalimage.source (fallback: response.thumbnail.source)
  → populate form.cover_image_url (only if field is currently empty)
}
```

- Only auto-fills if the field is empty (never silently overwrites a user's manual entry)
- Failures are silent (no error shown — the field just stays empty)

---

## 4. RaceFormDialog UI

- Add `cover_image_url` field: URL input, label `"Race photo"`
- Position: below the existing `image_url` field
- When auto-filled by lookup: show a subtle `"Auto-filled from Wikipedia"` helper text beneath the field
- User can clear or paste their own URL at any time — this is the manual override path for smaller races
- Field is included in form submit payload (same pattern as `image_url`)

---

## 5. RaceCard (List View)

**Banner height:** `h-20` → `h-40`

**When `cover_image_url` exists:**
- Render `<img src={cover_image_url}>` with `object-cover w-full h-full`
- Overlay: `bg-gradient-to-t from-black/60 to-transparent` at the bottom
- Race name + location rendered as white text over the overlay (bottom-left)

**When no `cover_image_url`:**
- Fall back to existing colored gradient (no regression)
- Race name continues to render as before

Stats/badges row below the banner: unchanged.

---

## 6. RaceDetailView

### Hero area
**When `cover_image_url` exists:**
- Replace the `h-24 bg-gradient-to-br` banner with a `h-64` full-width photo
- `<img>` with `object-cover w-full h-full`
- Gradient overlay: `bg-gradient-to-t from-black/70 to-transparent`
- Race name, location, and action buttons remain in bottom-left/right of the overlay

**When no `cover_image_url`:**
- Fall back to existing `h-24` gradient banner (no regression)

### AI Sketch section
Below the stats/description block inside the Card:

- Separator line
- Small muted label: `Route sketch`
- `<img src={image_url}>` — `max-h-48 object-contain mx-auto` on a `bg-slate-50 rounded-lg` background
- Section is hidden entirely when `image_url` is null

---

## 7. DB Migration

Single migration file:
```sql
ALTER TABLE races ADD COLUMN cover_image_url TEXT;
```

Update `useRaces` hook and `makeAppData()` in `tests/mockAppData.js` to include `cover_image_url`.

---

## 8. Out of Scope

- File upload (user pastes URL only)
- Automatic re-fetch / refresh of the photo after initial save
- Showing the cover photo on the map markers
- Any changes to the `race-image` edge function
