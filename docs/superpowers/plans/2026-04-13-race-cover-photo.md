# Race Cover Photo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a descriptive cover photo to each race (auto-fetched from Wikipedia during lookup, with manual URL override), display it as the card banner in the list view and as a cinematic hero in the detail view, and show the existing AI sketch as a dedicated "Route sketch" section in the detail view.

**Architecture:** A new `cover_image_url TEXT` column is added to the `races` table. The `claude-coach` edge function returns a `wikipediaTitle` field alongside existing race info; the frontend calls the public Wikipedia REST API to resolve a photo URL and pre-fills the form field. Both `RaceCard` and `RaceDetailView` conditionally render the photo or fall back to the existing gradient banner.

**Tech Stack:** React 18, Supabase PostgreSQL, Wikipedia REST API (public, no auth), Vitest + React Testing Library, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-13-race-cover-photo-design.md`

---

### Task 1: DB Migration — add `cover_image_url`

**Files:**
- Create: `supabase/migrations/20260413_races_cover_image_url.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260413_races_cover_image_url.sql
ALTER TABLE races ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with the SQL above. Confirm the column appears in `mcp__supabase__list_tables` output for the `races` table.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260413_races_cover_image_url.sql
git commit -m "feat: add cover_image_url column to races"
```

---

### Task 2: Add `wikipediaTitle` to `RaceInfo` interface

**Files:**
- Modify: `supabase/functions/claude-coach/raceInfo.ts`
- Modify: `tests/unit/claudeCoach.raceInfoParsing.test.js`

- [ ] **Step 1: Write the failing test**

Add to `tests/unit/claudeCoach.raceInfoParsing.test.js` (inside the existing `describe` block):

```js
it("preserves wikipediaTitle when present", () => {
  const parsed = parseRaceInfoResponse(
    '{"displayName":"Boston Marathon","distanceKm":42.2,"wikipediaTitle":"Boston Marathon"}',
  );
  expect(parsed?.wikipediaTitle).toBe("Boston Marathon");
});

it("accepts null wikipediaTitle", () => {
  const parsed = parseRaceInfoResponse(
    '{"displayName":"Local 5K","distanceKm":5,"wikipediaTitle":null}',
  );
  expect(parsed?.wikipediaTitle).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A3 "wikipediaTitle"
```

Expected: two failures — `wikipediaTitle` is not on the type yet (TypeScript compile error or `undefined` assertion fail).

- [ ] **Step 3: Add `wikipediaTitle` to the `RaceInfo` interface**

In `supabase/functions/claude-coach/raceInfo.ts`, add one field to the interface:

```typescript
interface RaceInfo {
  displayName: string;
  distanceKm: number;
  elevationGainM?: number | null;
  terrain?: string | null;
  location?: string | null;
  keyFacts?: string | null;
  description?: string | null;
  registrationInfo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nextRaceDate?: string | null;
  raceUrl?: string | null;
  sections?: RaceSection[];
  unknown?: boolean;
  wikipediaTitle?: string | null;
}
```

No changes needed to `isValidRaceInfo` — the field is optional and passes through transparently.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A3 "wikipediaTitle"
```

Expected: both new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/claude-coach/raceInfo.ts tests/unit/claudeCoach.raceInfoParsing.test.js
git commit -m "feat: add wikipediaTitle field to RaceInfo interface"
```

---

### Task 3: Add `wikipediaTitle` to the AI prompt in `index.ts`

**Files:**
- Modify: `supabase/functions/claude-coach/index.ts` (lines ~385–409, the `RACE_INFO_SYSTEM` constant)

- [ ] **Step 1: Add `wikipediaTitle` to the JSON template in `RACE_INFO_SYSTEM`**

Find the line with `"raceUrl"` in the JSON template inside `RACE_INFO_SYSTEM` and add the new field after it:

```typescript
  "raceUrl": "offisiell nettside-URL, eller null",
  "wikipediaTitle": "the exact English Wikipedia article title for this race, e.g. \"Boston Marathon\" or \"Ultra-Trail du Mont-Blanc\". Return null if no Wikipedia article exists for this specific race."
```

The full updated JSON template in the prompt should look like:

```
{
  "displayName": "full official race name",
  "distanceKm": number,
  "elevationGainM": number or null,
  "terrain": "kort terrengbeskrivelse",
  "location": "By, Land",
  "keyFacts": "1-2 setninger om viktige treningsimplikasjoner",
  "description": "2-3 setninger om løpets karakter, sceneri og hva som gjør det spesielt",
  "registrationInfo": "kort info om påmelding, typiske åpningsdatoer, lotteri hvis aktuelt",
  "latitude": number or null,
  "longitude": number or null,
  "nextRaceDate": "YYYY-MM-DD for neste kjente utgave, eller null",
  "raceUrl": "offisiell nettside-URL, eller null",
  "wikipediaTitle": "the exact English Wikipedia article title for this race, e.g. \"Boston Marathon\" or \"Ultra-Trail du Mont-Blanc\". Return null if no Wikipedia article exists for this specific race.",
  "sections": [...]
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/claude-coach/index.ts
git commit -m "feat: include wikipediaTitle in race_info AI prompt"
```

---

### Task 4: Update test fixtures with `cover_image_url`

**Files:**
- Modify: `tests/unit/mockAppData.js`

- [ ] **Step 1: Add `cover_image_url` to each race in `SAMPLE_RACES`**

Find the `SAMPLE_RACES` export (line ~379). Add `cover_image_url` to each race object. For the first race (Boston Marathon), give it a value so photo-rendering paths can be tested; leave others `null`:

```js
export const SAMPLE_RACES = [
  {
    id: "race-1",
    user_id: "user-1",
    name: "Boston Marathon",
    // ... existing fields ...
    image_url: null,
    cover_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Boston_Marathon_Finish_Line.jpg/1280px-Boston_Marathon_Finish_Line.jpg",
    created_at: "2026-01-15T10:00:00Z",
    race_participations: [ /* unchanged */ ],
    race_resources: [ /* unchanged */ ],
  },
  // For all other races, add:
  //   cover_image_url: null,
];
```

Apply `cover_image_url: null` to every other race in `SAMPLE_RACES` that doesn't already have the field.

- [ ] **Step 2: Run full test suite to confirm no regressions**

```bash
npm test -- --run
```

Expected: all existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/mockAppData.js
git commit -m "test: add cover_image_url to SAMPLE_RACES fixture"
```

---

### Task 5: Update `RaceCard` to show cover photo

**Files:**
- Modify: `src/components/races/RaceCard.jsx`
- Modify: `tests/unit/races.test.jsx`

- [ ] **Step 1: Write failing component test**

In `tests/unit/races.test.jsx`, import `RaceCard` and add a `describe("RaceCard", ...)` block. Add it before or after the existing tests in the file. First check what's already imported at the top of the file and add any missing imports:

```jsx
import RaceCard from "../../src/components/races/RaceCard";
```

Then add the describe block:

```jsx
describe("RaceCard", () => {
  it("renders cover photo as banner when cover_image_url is set", () => {
    const race = {
      id: "race-photo",
      name: "UTMB",
      location: "Chamonix, France",
      distance_km: 171,
      elevation_gain_m: 10000,
      cover_image_url: "https://example.com/utmb.jpg",
      image_url: null,
      race_participations: [],
      race_resources: [],
    };
    render(<RaceCard race={race} onClick={vi.fn()} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/utmb.jpg");
    expect(img).toHaveAttribute("alt", "UTMB");
  });

  it("renders gradient banner when cover_image_url is absent", () => {
    const race = {
      id: "race-gradient",
      name: "Local 5K",
      location: null,
      distance_km: 5,
      elevation_gain_m: null,
      cover_image_url: null,
      image_url: null,
      race_participations: [],
      race_resources: [],
    };
    const { container } = render(<RaceCard race={race} onClick={vi.fn()} />);
    expect(container.querySelector("img")).toBeNull();
    // Gradient banner should be present
    expect(container.querySelector(".bg-gradient-to-br")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A5 "RaceCard"
```

Expected: FAIL — `cover_image_url` not yet used, no `<img>` rendered.

- [ ] **Step 3: Update `RaceCard.jsx`**

Replace the banner `<div>` (the `h-20 bg-gradient-to-br ...` element) with:

```jsx
{race.cover_image_url ? (
  <div className="h-40 relative overflow-hidden">
    <img
      src={race.cover_image_url}
      alt={race.name}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    <div className="absolute bottom-0 left-0 p-3">
      <span className="text-white font-bold text-base drop-shadow-sm">{race.name}</span>
    </div>
  </div>
) : (
  <div className={`h-40 bg-gradient-to-br ${isBucketList ? "from-amber-400 to-amber-600" : gradient} flex items-end p-3`}>
    <span className="text-white font-bold text-base drop-shadow-sm">{race.name}</span>
  </div>
)}
```

Note the banner height increases from `h-20` to `h-40` in both branches.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A5 "RaceCard"
```

Expected: both new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/races/RaceCard.jsx tests/unit/races.test.jsx
git commit -m "feat: show cover photo as banner in RaceCard"
```

---

### Task 6: Update `RaceDetailView` — cinematic hero + sketch section

**Files:**
- Modify: `src/components/races/RaceDetailView.jsx`
- Modify: `tests/unit/races.test.jsx`

- [ ] **Step 1: Write failing component test**

In the existing `describe("RaceCard", ...)` block or as a new `describe("RaceDetailView", ...)` block in `tests/unit/races.test.jsx`:

```jsx
// At top of file, add import if not present:
// import RaceDetailView from "../../src/components/races/RaceDetailView";
// Note: RaceDetailView is already mocked via vi.mock at the top of races.test.jsx —
// import the REAL component under a different name for these tests:

import RaceDetailViewReal from "../../src/components/races/RaceDetailView";

describe("RaceDetailView (real)", () => {
  const mockRacesCtx = {
    updateRace: vi.fn().mockResolvedValue({}),
    addParticipation: vi.fn().mockResolvedValue({}),
    addResource: vi.fn().mockResolvedValue({}),
    deleteResource: vi.fn().mockResolvedValue({}),
  };

  function renderDetail(raceOverrides = {}) {
    const race = {
      id: "race-1",
      name: "UTMB",
      location: "Chamonix, France",
      distance_km: 171,
      elevation_gain_m: 10000,
      cover_image_url: null,
      image_url: null,
      description: null,
      next_race_date: null,
      registration_info: null,
      race_participations: [],
      race_resources: [],
      sections: [],
      ...raceOverrides,
    };
    const appData = makeAppData({
      races: { ...makeAppData().races, races: [race], ...mockRacesCtx },
    });
    vi.mock("../../src/context/AppDataContext", () => ({
      useAppData: () => appData,
    }));
    return render(<RaceDetailViewReal race={race} onBack={vi.fn()} />);
  }

  it("renders cover photo hero when cover_image_url is set", () => {
    const { container } = renderDetail({
      cover_image_url: "https://example.com/utmb.jpg",
    });
    const img = container.querySelector("img[alt='UTMB']");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/utmb.jpg");
  });

  it("renders gradient banner when cover_image_url is absent", () => {
    const { container } = renderDetail({ cover_image_url: null });
    expect(container.querySelector(".bg-gradient-to-br")).toBeTruthy();
  });

  it("renders AI sketch section when image_url is set", () => {
    const { container } = renderDetail({
      image_url: "https://example.com/sketch.png",
    });
    expect(screen.getByText(/Route sketch/i)).toBeTruthy();
    const sketchImg = container.querySelector("img[alt*='sketch']");
    expect(sketchImg).toBeTruthy();
    expect(sketchImg.getAttribute("src")).toBe("https://example.com/sketch.png");
  });

  it("hides AI sketch section when image_url is null", () => {
    renderDetail({ image_url: null });
    expect(screen.queryByText(/Route sketch/i)).toBeNull();
  });
});
```

> **Note:** `RaceDetailView` is already mocked at the file top (`vi.mock("../../src/components/races/RaceDetailView", ...)`). Import the real component as `RaceDetailViewReal` to bypass that mock. Add `useAppData` mock at the top of the describe block.

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A5 "RaceDetailView (real)"
```

Expected: FAIL on all four tests.

- [ ] **Step 3: Update `RaceDetailView.jsx` — hero section**

Replace the current hero `<div>` (lines 93–111 of the current file, inside `<Card className="overflow-hidden mb-6">`):

```jsx
{/* Hero — cover photo or gradient fallback */}
{race.cover_image_url ? (
  <div className="h-64 relative overflow-hidden">
    <img
      src={race.cover_image_url}
      alt={race.name}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-5">
      <div>
        <h2 className="text-white font-bold text-xl drop-shadow-sm">{race.name}</h2>
        {race.location && (
          <p className="text-white/80 text-sm">{race.location}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setEditOpen(true)}>
          <Pencil size={14} className="mr-1" />
          {t("races.editRace")}
        </Button>
        <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setAddParticipationOpen(true)}>
          <Plus size={14} className="mr-1" />
          {t("races.addParticipation")}
        </Button>
      </div>
    </div>
  </div>
) : (
  <div className="h-24 bg-gradient-to-br from-blue-500 to-blue-700 flex items-end p-5 relative">
    <div>
      <h2 className="text-white font-bold text-xl drop-shadow-sm">{race.name}</h2>
      {race.location && (
        <p className="text-blue-100 text-sm">{race.location}</p>
      )}
    </div>
    <div className="ml-auto flex gap-2">
      <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setEditOpen(true)}>
        <Pencil size={14} className="mr-1" />
        {t("races.editRace")}
      </Button>
      <Button size="sm" variant="secondary" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => setAddParticipationOpen(true)}>
        <Plus size={14} className="mr-1" />
        {t("races.addParticipation")}
      </Button>
    </div>
  </div>
)}
```

- [ ] **Step 4: Update `RaceDetailView.jsx` — AI sketch section**

Inside `<CardContent className="p-5">`, after the `{race.description && (...)}` block (and its `<Separator>`), add:

```jsx
{race.image_url && (
  <>
    <Separator className="mb-4 mt-4" />
    <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Route sketch</p>
    <div className="bg-slate-50 rounded-lg p-3 flex justify-center">
      <img
        src={race.image_url}
        alt={`${race.name} route sketch`}
        className="max-h-48 object-contain"
      />
    </div>
  </>
)}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --run --reporter=verbose 2>&1 | grep -A5 "RaceDetailView (real)"
```

Expected: all four tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add src/components/races/RaceDetailView.jsx tests/unit/races.test.jsx
git commit -m "feat: cinematic cover photo hero and AI sketch section in RaceDetailView"
```

---

### Task 7: Update `RaceFormDialog` — Wikipedia fetch + `cover_image_url` field

**Files:**
- Modify: `src/components/races/RaceFormDialog.jsx`

- [ ] **Step 1: Add `cover_image_url` and `coverImageAutoFilled` to state**

In `RaceFormDialog.jsx`, add `cover_image_url` to the form state and a helper state flag:

```jsx
const [form, setForm] = useState({
  name: "",
  location: "",
  distance_km: "",
  elevation_gain_m: "",
  latitude: "",
  longitude: "",
  description: "",
  race_url: "",
  next_race_date: "",
  registration_info: "",
  image_url: "",
  cover_image_url: "",   // ← new
  sections: null,
});

const [coverImageAutoFilled, setCoverImageAutoFilled] = useState(false);
```

- [ ] **Step 2: Populate `cover_image_url` in the edit `useEffect`**

In the `useEffect` that runs when `initialData` changes (the pre-fill block), add:

```jsx
cover_image_url: initialData.cover_image_url ?? "",
```

And in the reset branch (the `else`):

```jsx
cover_image_url: "",
```

Also reset the auto-fill flag in both branches:

```jsx
setCoverImageAutoFilled(false);
```

- [ ] **Step 3: Add Wikipedia fetch to `handleRaceLookup`**

After the existing `setForm` block that pre-fills fields from `info`, add the Wikipedia photo fetch:

```jsx
// Wikipedia photo fetch
if (info?.wikipediaTitle) {
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(info.wikipediaTitle)}`
    );
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const photoUrl =
        wikiData.originalimage?.source ?? wikiData.thumbnail?.source ?? null;
      if (photoUrl) {
        setForm((prev) => ({
          ...prev,
          cover_image_url: prev.cover_image_url || photoUrl,
        }));
        setCoverImageAutoFilled(true);
      }
    }
  } catch {
    // silent — field stays empty if fetch fails
  }
}
```

Place this block after the existing `setForm(...)` call inside the `if (info)` block, but still inside the `try` block and before `setRaceInfoLoading(false)`.

- [ ] **Step 4: Include `cover_image_url` in `handleSubmit`**

In `handleSubmit`, the `data` object sent to `onSubmit` must include:

```jsx
cover_image_url: form.cover_image_url.trim() || null,
```

Add it alongside `image_url`.

- [ ] **Step 5: Add `cover_image_url` form field to the JSX**

After the existing `image_url` field block:

```jsx
<div>
  <Label htmlFor="race-cover-image">Race photo (URL)</Label>
  <Input
    id="race-cover-image"
    type="url"
    value={form.cover_image_url}
    onChange={(e) => {
      setCoverImageAutoFilled(false);
      setForm((prev) => ({ ...prev, cover_image_url: e.target.value }));
    }}
  />
  {coverImageAutoFilled && (
    <p className="text-xs text-slate-400 mt-1">Auto-filled from Wikipedia</p>
  )}
</div>
```

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/races/RaceFormDialog.jsx
git commit -m "feat: Wikipedia photo auto-fetch and cover_image_url field in RaceFormDialog"
```

---

### Task 8: Deploy edge function

**Files:**
- No code changes — this deploys the already-modified `claude-coach` function.

- [ ] **Step 1: Deploy via Supabase MCP**

Use `mcp__supabase__deploy_edge_function` with:
- `function_name: "claude-coach"`
- `verify_jwt: false` (REQUIRED — see `docs/edge-function-auth-pattern.md`)

- [ ] **Step 2: Smoke test in the app**

1. Open the app, go to Races, click Add Race
2. Type "UTMB" and click "Slå opp →"
3. Verify the Race photo field auto-fills with a Wikipedia URL
4. Verify "Auto-filled from Wikipedia" helper text appears
5. Save the race, then open it — the detail view should show the cinematic photo hero
6. Try a smaller/unknown race (e.g. "Nøklevannsløpet") — field should remain empty, gradient fallback shown

- [ ] **Step 3: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: post-deploy smoke test adjustments"
```
