# Race Image Enrichment — Design Spec

**Date:** 2026-04-12
**Status:** Approved

---

## Goal

Replace the generic sports-photography prompt used to generate race card images with an artistic, topographic pencil-and-ink sketch prompt that draws on rich race-specific data (terrain, course description, elevation, key facts).

---

## Background

When a race is created, `useRaces.js` triggers a background call to the `race-image` Supabase Edge Function. That function currently builds a minimal prompt:

```
Scenic running race photography: {raceName} {distanceKm}km in {location}.
Epic landscape, runners on trail, golden hour lighting, high quality sports photography, no text or logos.
```

This produces generic images unrelated to the actual race. The `claude-coach` edge function already knows how to look up rich race metadata (`terrain`, `keyFacts`, `elevationGainM`, `location`) via its `race_info` mode — the plan intake flow uses this today. The goal is to reuse that lookup at race creation time and feed the result into the image prompt.

---

## Architecture

### Two files change

| File | Change |
|------|--------|
| `src/hooks/useRaces.js` | Sequential race_info lookup before image call |
| `supabase/functions/race-image/index.ts` | Accept enriched fields; build artistic prompt |

### No new edge functions, no DB migrations

---

## Data Flow

```
createRace()
  → insert to races table          (race visible in UI immediately)
  → [background, sequential]
      1. claude-coach(race_info, raceName)   → { terrain, keyFacts, elevationGainM, location, ... }
      2. race-image({
           raceId, raceName,
           location       : data.location       ?? raceInfo.location,
           distanceKm     : data.distance_km     ?? raceInfo.distanceKm,
           elevationGainM : data.elevation_gain_m ?? raceInfo.elevationGainM,
           description    : data.description,
           terrain        : raceInfo.terrain,
           keyFacts       : raceInfo.keyFacts,
           raceDate       : data.next_race_date,
         })
      3. Gemini generates image
      4. race row updated with imageUrl
      5. UI dispatches "updated" → card shows image
```

**Failure handling:** The race_info lookup is best-effort. If it times out or returns null, image generation still proceeds with whatever fields are available. Image generation failures are already silently swallowed — this does not change.

---

## `useRaces.js` Changes

Replace the current single-step `invoke("race-image", ...)` block with a self-contained async IIFE that:

1. Calls `client.functions.invoke("claude-coach", { body: { raceName: data.name } })`
2. Extracts `raceInfo` from the response (may be null)
3. Calls `client.functions.invoke("race-image", { body: { ...merged fields } })`
4. Dispatches `"updated"` if an `imageUrl` is returned

The entire block is wrapped in `.catch(() => {})` — failures remain silent.

---

## `race-image/index.ts` Changes

### New accepted body fields

| Field | Type | Source |
|-------|------|--------|
| `elevationGainM` | `number \| undefined` | DB `elevation_gain_m` or raceInfo |
| `terrain` | `string \| undefined` | raceInfo |
| `keyFacts` | `string \| undefined` | raceInfo |
| `description` | `string \| undefined` | DB `description` |
| `raceDate` | `string \| undefined` | DB `next_race_date` (ISO date) |

### Prompt construction

The prompt is assembled dynamically. Only present fields contribute clauses. The base template follows the user's artistic brief:

```
A detailed architectural pencil and ink sketch, hand-drawn style, on textured,
cream-colored linen art paper. Set against a textured grey background with side shadows.

Top-left corner: bold dark blue sans-serif text "{raceName}", with centered smaller
sans-serif sub-text "{Month}" below.  [Month omitted if raceDate not available]

The central and right portions show an intricate topographic pencil sketch of
{location and/or terrain description} and surrounding landscape. Features include
cross-hatching, contour lines, and detailed terrain elements.

A bold dark blue hand-drawn course line winds across the entire sketch
{distanceKm}km loop, starting and returning to the city center.  [distance clause if available]

Labels (small pencil-style text with thin leader lines) include:
- Geological features and elevation markers {elevationGainM}m D+  [if available]
- START/FINISH CP and intermediate checkpoints along the route
- {keyFacts distilled as 2-3 label hints}  [if available]

Professional, high-resolution scan quality. Meticulous technical document aesthetic.
No photorealistic people or photography style.
```

Month is derived from `raceDate` via UTC date parsing:
```ts
const month = raceDate
  ? new Date(raceDate).toLocaleString("en-US", { month: "long", timeZone: "UTC" })
  : null;
```

---

## Error Handling

| Scenario | Behaviour |
|----------|-----------|
| race_info lookup fails / returns null | Image generation proceeds with available DB fields only |
| Image generation fails | Silently ignored (existing behaviour, unchanged) |
| Gemini returns no image data | Throws, caught by outer catch, silently ignored |
| Storage upload fails | Throws, caught by outer catch, silently ignored |

---

## What Does Not Change

- Race creation UX — race is visible immediately, image arrives asynchronously
- Storage path and bucket (`race-images/{userId}/{raceId}.{ext}`)
- The `race_info` mode in `claude-coach` — no changes there
- `race-image-generator` — separate function, not used by the frontend

---

## Success Criteria

1. A newly created race with a known name (e.g. "UTMB") produces an image resembling a topographic pencil sketch rather than a generic trail photo.
2. A race with unknown name (no race_info result) still produces an image — a generic terrain sketch rather than a blank.
3. No regressions to race creation flow, error handling, or UI update timing.
