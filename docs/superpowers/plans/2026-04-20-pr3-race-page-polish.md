# PR #3 — Race Page Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the race overview to match the PDF-inspired race pages by adding a 4-card stats row, flattening completed races by participation, polishing the done/dream cards, and covering the new behavior with focused race tests.

**Architecture:** Keep `RacePage.jsx` as the page-level coordinator, but move presentation responsibilities into two new focused units: `RaceStatsRow.jsx` for the summary cards and `PlacementMedal.jsx` for participation ranking badges. Completed-tab data is reshaped at the page layer into `{ race, participation }` rows grouped by participation year; card components receive the richer props they need and remain stateless presentational units.

**Tech Stack:** React 18 + Vite, existing `control-center.css` design tokens and race card classes, Vitest + React Testing Library, existing `useAppData()` race context and `Segmented` control.

---

## File plan

| File | Action | Purpose |
|---|---|---|
| `src/pages/RacePage.jsx` | Modify | Add PDF-style header copy, insert `RaceStatsRow`, flatten completed races by participation, and update year-group subtitles. |
| `src/components/races/RaceStatsRow.jsx` | Create | Render the 4 summary cards between the header and the timeline. |
| `src/components/races/PlacementMedal.jsx` | Create | Render rank-based circular medal badge from `overall_place` and `total_finishers`. |
| `src/components/races/RaceCardDone.jsx` | Modify | Accept `{ race, participation }`, render participation date/details, optional PB/note/tag row, placement medal. |
| `src/components/races/RaceCardDream.jsx` | Modify | Polish copy/status rendering for the dreams tab, including fallback from `registration_status` to `status` to PDF-style labels. |
| `src/styles/control-center.css` | Modify | Add race stats row and placement medal styles; extend race-card layout for the richer right-side stats. |
| `tests/unit/races.test.jsx` | Modify | Replace the current page-level expectations with participation-flattening, stats-row, year-copy, and medal tests. |
| `tests/unit/mockAppData.js` | Modify | Expand the sample races fixture to include placement metadata and a second completed race season to support the new stats assertions. |

---

### Task 1: Pre-flight and failing page-level tests

**Files:**
- Modify: `tests/unit/races.test.jsx`
- Read-only: `src/pages/RacePage.jsx`, `tests/unit/mockAppData.js`

- [ ] **Step 1: Replace the RacePage test block with PR3 expectations**

Replace the existing `describe("RacePage — control-center redesign", ...)` block in `tests/unit/races.test.jsx` with:

```jsx
describe("RacePage — PR3 polish", () => {
  beforeEach(() => {
    __setMockValue(makeAppData());
  });

  it("renders the PDF-style race header copy", () => {
    render(<RacePage />);
    expect(screen.getByText("LØPSSENTER · VEGG OG DRØMMER")).toBeTruthy();
    expect(screen.getByText("Løp")).toBeTruthy();
    expect(
      screen.getByText(/Alt du har gjennomført og alt du sikter mot/i),
    ).toBeTruthy();
  });

  it("shows one done row per participation, not one row per race", () => {
    render(<RacePage />);
    expect(screen.getAllByText("Boston Marathon")).toHaveLength(2);
  });

  it("groups completed races by participation year", () => {
    render(<RacePage />);
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.getByText("2023")).toBeTruthy();
  });

  it("uses fullføringer copy on the done tab", () => {
    render(<RacePage />);
    expect(screen.getByText(/2 fullføringer/i)).toBeTruthy();
  });

  it("shows planlagt copy on the dreams tab", () => {
    render(<RacePage />);
    fireEvent.click(screen.getByText("Drømmer"));
    expect(screen.getByText(/1 planlagt/i)).toBeTruthy();
  });

  it("renders the stats row with participation-based totals", () => {
    render(<RacePage />);
    expect(screen.getByText("LØP GJENNOMFØRT")).toBeTruthy();
    expect(screen.getByText("SAMLET RACEDISTANSE")).toBeTruthy();
    expect(screen.getByText("LAND BESØKT")).toBeTruthy();
    expect(screen.getByText("DRØMMER PLANLAGT")).toBeTruthy();
    expect(screen.getByText(/3 fullføringer/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Add focused card/medal tests below the page block**

Append these tests to `tests/unit/races.test.jsx` after the RacePage block:

```jsx
describe("RaceCardDone + PlacementMedal", () => {
  it("renders a gold medal for a top-10% participation", async () => {
    const mod = await import("../../src/components/races/RaceCardDone");
    const RaceCardDoneReal = mod.default;
    render(
      <RaceCardDoneReal
        race={SAMPLE_RACES[0]}
        participation={SAMPLE_RACES[0].race_participations[0]}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/placement medal/i)).toHaveTextContent("5");
  });

  it("hides the medal when total_finishers is missing", async () => {
    const mod = await import("../../src/components/races/RaceCardDone");
    const RaceCardDoneReal = mod.default;
    render(
      <RaceCardDoneReal
        race={SAMPLE_RACES[0]}
        participation={{
          ...SAMPLE_RACES[0].race_participations[0],
          total_finishers: null,
        }}
        onClick={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/placement medal/i)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the race test file and confirm it fails**

Run: `npm test -- --run tests/unit/races.test.jsx`
Expected: FAIL. Current failures should include the missing header copy, only one completed Boston row, missing stats row, and no medal element.

- [ ] **Step 4: Commit the failing-test checkpoint**

```bash
git add tests/unit/races.test.jsx
git commit -m "test(races): define PR3 race-page polish expectations"
```

---

### Task 2: Expand fixtures for participation-aware stats

**Files:**
- Modify: `tests/unit/mockAppData.js`

- [ ] **Step 1: Enrich the completed participation fixtures**

Update the two `Boston Marathon` participations in `SAMPLE_RACES[0].race_participations` to include placement metadata:

```js
{
  id: "rp-1",
  race_id: "race-1",
  user_id: "user-1",
  race_date: "2025-04-21",
  finish_time: "03:12:45",
  overall_place: 5,
  total_finishers: 120,
  is_pb: true,
  notes: "Perfect weather. Nailed the negative split strategy.",
  strava_activity_id: "12345678",
  photo_album_url: "https://photos.example.com/boston-2025",
  created_at: "2025-04-21T18:00:00Z",
},
{
  id: "rp-2",
  race_id: "race-1",
  user_id: "user-1",
  race_date: "2023-04-17",
  finish_time: "03:28:10",
  overall_place: 48,
  total_finishers: 220,
  is_pb: false,
  notes: "First Boston! Went out too fast.",
  strava_activity_id: null,
  photo_album_url: null,
  created_at: "2023-04-17T18:00:00Z",
},
```

- [ ] **Step 2: Add a second completed race in another country**

Insert this third sample race object into `SAMPLE_RACES` after `race-1` and before `race-2`:

```js
{
  id: "race-3",
  user_id: "user-1",
  name: "Berlin Marathon",
  location: "Berlin, Germany",
  distance_km: 42.2,
  elevation_gain_m: 73,
  latitude: 52.5200,
  longitude: 13.4050,
  description: "Fast autumn major.",
  race_url: "https://www.bmw-berlin-marathon.com",
  next_race_date: null,
  registration_info: null,
  image_url: null,
  cover_image_url: null,
  created_at: "2026-02-10T10:00:00Z",
  race_participations: [
    {
      id: "rp-3",
      race_id: "race-3",
      user_id: "user-1",
      race_date: "2024-09-29",
      finish_time: "03:18:05",
      overall_place: 420,
      total_finishers: 3200,
      is_pb: false,
      notes: "Steady day with a small fade after 35 km.",
      strava_activity_id: null,
      photo_album_url: null,
      created_at: "2024-09-29T18:00:00Z",
    },
  ],
  race_resources: [],
},
```

- [ ] **Step 3: Update any brittle fixture comments/count assumptions in the tests**

Where `tests/unit/races.test.jsx` still says Boston has one participation or that only one race is completed, replace those comments/expectations with:

```jsx
// Boston Marathon has 2 participations; Berlin Marathon adds a third completed result overall
```

- [ ] **Step 4: Run the tests again**

Run: `npm test -- --run tests/unit/races.test.jsx`
Expected: FAIL, but the failures should now reflect missing implementation rather than bad fixture assumptions.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/mockAppData.js tests/unit/races.test.jsx
git commit -m "test(races): add multi-season fixture coverage for PR3"
```

---

### Task 3: Add the new race summary units

**Files:**
- Create: `src/components/races/PlacementMedal.jsx`
- Create: `src/components/races/RaceStatsRow.jsx`

- [ ] **Step 1: Create `PlacementMedal.jsx`**

Create `src/components/races/PlacementMedal.jsx` with:

```jsx
import React from "react";

function medalTone(place, total) {
  if (!place || !total) return null;
  const pct = place / total;
  if (pct <= 0.1) return "gold";
  if (pct <= 0.25) return "silver";
  if (pct <= 0.5) return "bronze";
  return "stone";
}

export default function PlacementMedal({ overallPlace, totalFinishers }) {
  const tone = medalTone(overallPlace, totalFinishers);
  if (!tone) return null;

  return (
    <div
      className={`placement-medal ${tone}`}
      aria-label="placement medal"
      title={`Plass ${overallPlace} av ${totalFinishers}`}
    >
      {overallPlace}
    </div>
  );
}
```

- [ ] **Step 2: Create `RaceStatsRow.jsx`**

Create `src/components/races/RaceStatsRow.jsx` with:

```jsx
import React, { useMemo } from "react";

function countryFromLocation(location = "") {
  const bits = location.split(",").map((part) => part.trim()).filter(Boolean);
  return bits.at(-1) ?? "—";
}

function formatDistance(totalKm) {
  return `${Math.round(totalKm)} km`;
}

export default function RaceStatsRow({ doneRows, dreamRaces }) {
  const stats = useMemo(() => {
    const seasons = new Set(
      doneRows
        .map((row) => row.participation?.race_date)
        .filter(Boolean)
        .map((date) => new Date(date).getUTCFullYear()),
    );
    const minYear = seasons.size ? Math.min(...seasons) : null;
    const totalDistance = doneRows.reduce(
      (sum, row) => sum + (row.race?.distance_km ?? 0),
      0,
    );
    const countries = new Set(
      doneRows.map((row) => countryFromLocation(row.race?.location)).filter(Boolean),
    );
    const nextDream = dreamRaces[0]?.location ? countryFromLocation(dreamRaces[0].location) : null;

    return {
      completedValue: doneRows.length,
      completedSub:
        doneRows.length && minYear
          ? `${doneRows.length} fullføringer · ${seasons.size} sesonger siden ${minYear}`
          : "Ingen fullføringer ennå",
      distanceValue: formatDistance(totalDistance),
      distanceSub:
        totalDistance > 0
          ? `≈ ${Math.round(totalDistance / 42.195)} maratonlengder`
          : "Ingen racedistanse logget ennå",
      countriesValue: countries.size,
      countriesSub: nextDream ? `Neste: ${nextDream}` : "Ingen nytt drømmeland valgt",
      dreamsValue: dreamRaces.length,
      dreamsSub: "A-løp, B-løp & bucket list",
    };
  }, [doneRows, dreamRaces]);

  const cards = [
    { label: "LØP GJENNOMFØRT", value: stats.completedValue, sub: stats.completedSub },
    { label: "SAMLET RACEDISTANSE", value: stats.distanceValue, sub: stats.distanceSub },
    { label: "LAND BESØKT", value: stats.countriesValue, sub: stats.countriesSub },
    { label: "DRØMMER PLANLAGT", value: stats.dreamsValue, sub: stats.dreamsSub, accent: true },
  ];

  return (
    <section className="race-stats-row" data-testid="race-stats-row">
      {cards.map((card) => (
        <article key={card.label} className={`race-stat-card${card.accent ? " accent" : ""}`}>
          <span className="cc-label">{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.sub}</p>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- --run tests/unit/races.test.jsx`
Expected: FAIL. Imports are still missing from `RacePage.jsx`, and the done/dream cards still use the old prop shape.

- [ ] **Step 4: Commit**

```bash
git add src/components/races/PlacementMedal.jsx src/components/races/RaceStatsRow.jsx
git commit -m "feat(races): add stats row and placement medal primitives"
```

---

### Task 4: Rebuild `RacePage.jsx` around participation rows

**Files:**
- Modify: `src/pages/RacePage.jsx`

- [ ] **Step 1: Add the page-level data helpers near the top of the file**

Replace the current `raceYear` / `groupByYear` helpers with:

```jsx
function rowYear(row, done) {
  const raw = done
    ? row.participation?.race_date
    : row.race?.next_race_date ?? row.race?.race_date;
  return raw ? new Date(raw).getUTCFullYear() : 0;
}

function groupByYear(rows, done = false) {
  const map = new Map();
  for (const row of rows) {
    const year = rowYear(row, done);
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(row);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}
```

- [ ] **Step 2: Import the new stats-row component**

Add this import beside the existing race component imports:

```jsx
import RaceStatsRow from "../components/races/RaceStatsRow";
```

- [ ] **Step 3: Replace the `doneRaces` / `dreamRaces` memos**

Replace the current completed/dream memo block with:

```jsx
  const doneRows = useMemo(
    () =>
      racesCtx.races.flatMap((race) =>
        (race.race_participations ?? []).map((participation) => ({
          race,
          participation,
          id: `${race.id}-${participation.id}`,
        })),
      ),
    [racesCtx.races],
  );

  const dreamRows = useMemo(
    () =>
      racesCtx.races
        .filter((race) => (race.race_participations ?? []).length === 0 || race.next_race_date)
        .map((race) => ({ race, id: race.id })),
    [racesCtx.races],
  );

  const doneByYear = useMemo(() => groupByYear(doneRows, true), [doneRows]);
  const dreamByYear = useMemo(() => groupByYear(dreamRows, false), [dreamRows]);
```

- [ ] **Step 4: Update the header block and insert the stats row**

Replace the current header JSX inside the `.full` container with:

```jsx
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p className="cc-label">LØPSSENTER · VEGG OG DRØMMER</p>
                <h1 className="display-md" style={{ margin: 0 }}>Løp</h1>
                <p className="body-sm" style={{ marginTop: 8, maxWidth: 720 }}>
                  Alt du har gjennomført og alt du sikter mot. Sorter gjerne etter år for å se hvordan sesongen bygde seg.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Segmented options={TABS} value={activeTab} onChange={setActiveTab} />
                <button className="btn-primary" type="button" onClick={() => setAddOpen(true)}>
                  + Legg til løp
                </button>
              </div>
            </div>

            <RaceStatsRow doneRows={doneRows} dreamRaces={dreamRows.map((row) => row.race)} />
          </div>
```

- [ ] **Step 5: Update the timeline rendering to use row objects**

Replace the `activeGroups`/`Card` area with:

```jsx
  const activeGroups = activeTab === "Gjennomført" ? doneByYear : dreamByYear;
  const emptyMsg = activeTab === "Gjennomført"
    ? "Ingen fullførte løp ennå. Legg til ditt første løp nedenfor."
    : "Ingen drømmeløp ennå. Legg til et løp du vil gjennomføre.";
```

Then replace the inner `activeGroups.map(...)` block with:

```jsx
              {activeGroups.map(([year, rows]) => (
                <div key={year} className="year-block">
                  <div className="year">
                    {year || "—"}
                    <span className="sub">
                      {activeTab === "Gjennomført"
                        ? `${rows.length} fullføringer`
                        : `${rows.length} planlagt`}
                    </span>
                  </div>
                  <div className="race-list">
                    {rows.map((row) =>
                      activeTab === "Gjennomført" ? (
                        <RaceCardDone
                          key={row.id}
                          race={row.race}
                          participation={row.participation}
                          onClick={() => setSelectedRaceId(row.race.id)}
                        />
                      ) : (
                        <RaceCardDream
                          key={row.id}
                          race={row.race}
                          onClick={() => setSelectedRaceId(row.race.id)}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))}
```

- [ ] **Step 6: Run the page tests**

Run: `npm test -- --run tests/unit/races.test.jsx -t "RacePage — PR3 polish"`
Expected: some assertions now pass, but medal/card-detail tests still fail until the card components are updated.

- [ ] **Step 7: Commit**

```bash
git add src/pages/RacePage.jsx
git commit -m "feat(races): flatten completed timeline by participation"
```

---

### Task 5: Polish the done and dream cards

**Files:**
- Modify: `src/components/races/RaceCardDone.jsx`
- Modify: `src/components/races/RaceCardDream.jsx`

- [ ] **Step 1: Replace `RaceCardDone.jsx`**

Replace the full file with:

```jsx
import React from "react";
import Chip from "../ui/Chip";
import PlacementMedal from "./PlacementMedal";

const NO_MONTHS = ["JAN","FEB","MAR","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DES"];

function formatRaceDate(dateStr) {
  if (!dateStr) return { d: "—", m: "" };
  const d = new Date(dateStr);
  return {
    d: String(d.getUTCDate()).padStart(2, "0"),
    m: NO_MONTHS[d.getUTCMonth()],
  };
}

function distanceTag(km) {
  if (!km) return null;
  if (km >= 80) return "100K";
  if (km >= 40) return "Maraton";
  if (km >= 21) return "Halvmaraton";
  return `${km} km`;
}

function formatFinishTime(t) {
  if (!t) return "—";
  return String(t).replace(/^0+(?=\d{2}:)/, "");
}

export default function RaceCardDone({ race, participation, onClick }) {
  const { d, m } = formatRaceDate(participation?.race_date);
  const tag = distanceTag(race.distance_km);

  return (
    <button className="race-card" type="button" onClick={onClick}>
      <div className="race-date">
        <span className="d">{d}</span>
        <span className="m">{m}</span>
      </div>

      <div className="race-main">
        <span className="name">{race.name}</span>
        <span className="loc">
          {race.location ?? ""}
          {race.elevation_gain_m ? <span>{race.elevation_gain_m} m D+</span> : null}
        </span>
        <div className="tags">
          {tag ? <Chip kind="ghost">{tag}</Chip> : null}
          {participation?.is_pb ? <Chip kind="build">PB</Chip> : null}
          {participation?.notes ? <Chip kind="ghost">{participation.notes}</Chip> : null}
        </div>
      </div>

      <div className="race-stats">
        <div>
          <span className="lbl">Tid</span>
          <span className="v">{formatFinishTime(participation?.finish_time)}</span>
        </div>
        <div>
          <span className="lbl">Plass</span>
          <span className="v">
            {participation?.overall_place ?? "—"}
            {participation?.total_finishers ? <small>/{participation.total_finishers}</small> : null}
          </span>
        </div>
        <PlacementMedal
          overallPlace={participation?.overall_place}
          totalFinishers={participation?.total_finishers}
        />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Replace `RaceCardDream.jsx`**

Replace the full file with:

```jsx
import React from "react";
import Chip from "../ui/Chip";

const NO_MONTHS = ["JAN","FEB","MAR","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DES"];

function formatRaceDate(dateStr) {
  if (!dateStr) return { d: "—", m: "" };
  const d = new Date(dateStr);
  return {
    d: String(d.getUTCDate()).padStart(2, "0"),
    m: NO_MONTHS[d.getUTCMonth()],
  };
}

function distanceTag(km) {
  if (!km) return null;
  if (km >= 80) return "100K";
  if (km >= 40) return "Maraton";
  if (km >= 21) return "Halvmaraton";
  return `${km} km`;
}

function dreamStatus(race) {
  const raw = race.status ?? race.registration_status;
  if (!raw) return "✦ DRØM";
  const normalized = String(raw).toLowerCase();
  if (normalized.includes("lotto")) return "✦ LOTTERI";
  if (normalized.includes("registered")) return "✓ REGISTRERT";
  if (normalized.includes("signed")) return "✓ PÅMELDT";
  return raw.toUpperCase();
}

export default function RaceCardDream({ race, onClick }) {
  const { d, m } = formatRaceDate(race.next_race_date ?? race.race_date);
  const tag = distanceTag(race.distance_km);

  return (
    <button className="race-card dream" type="button" onClick={onClick}>
      <div className="race-date">
        <span className="d">{d}</span>
        <span className="m">{m}</span>
      </div>

      <div className="race-main">
        <span className="name">{race.name}</span>
        <span className="loc">
          {race.location ?? ""}
          {race.elevation_gain_m ? <span>{race.elevation_gain_m} m D+</span> : null}
        </span>
        <div className="tags">
          {tag ? <Chip kind="ghost">{tag}</Chip> : null}
          {race.registration_info ? <Chip kind="ghost">{race.registration_info}</Chip> : null}
        </div>
      </div>

      <div className="race-stats">
        <div>
          <span className="lbl">Mål</span>
          <span className="v">{race.target_time ?? "Velg mål senere"}</span>
        </div>
        <Chip kind="recovery">{dreamStatus(race)}</Chip>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Run the race tests**

Run: `npm test -- --run tests/unit/races.test.jsx`
Expected: only styling/layout-related assertions should remain, if any. Functional page and medal tests should now pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/races/RaceCardDone.jsx src/components/races/RaceCardDream.jsx
git commit -m "feat(races): polish completed and dream race cards for PR3"
```

---

### Task 6: Add race stats-row and medal styling

**Files:**
- Modify: `src/styles/control-center.css`

- [ ] **Step 1: Append the PR3 race styles**

Append this block near the existing race styles in `src/styles/control-center.css`:

```css
.race-stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.race-stat-card {
  background: var(--surface-lowest);
  border-radius: var(--r-xl);
  padding: 18px;
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.race-stat-card.accent { background: var(--primary-050); }
.race-stat-card strong {
  font-family: var(--ff-display);
  font-size: 28px;
  line-height: 1;
  color: var(--ink-strong);
}
.race-stat-card p {
  margin: 0;
  color: var(--ink-muted);
  font-size: 12px;
}

.placement-medal {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ff-mono);
  font-size: 12px;
  font-weight: 700;
}

.placement-medal.gold { background: #f7e08b; color: #6d5200; }
.placement-medal.silver { background: #dce3ed; color: #445062; }
.placement-medal.bronze { background: #e7c5a6; color: #724624; }
.placement-medal.stone { background: var(--surface-sunken); color: var(--ink-muted); }

.race-card .tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 900px) {
  .race-stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

- [ ] **Step 2: Build to catch CSS mistakes**

Run: `npm run build`
Expected: PASS with no CSS parse errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/control-center.css
git commit -m "style(races): add PR3 stats-row and placement medal styles"
```

---

### Task 7: Final verification and responsive check

**Files:**
- Read-only verification across `src/pages/RacePage.jsx`, race components, tests

- [ ] **Step 1: Run the focused race tests**

Run: `npm test -- --run tests/unit/races.test.jsx`
Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --run`
Expected: repository baseline passes with no new failures outside the known `claudeCoach.*` allowance from the UAT baseline.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manually verify the Race page**

Run: `npm run dev`
Then open the app and confirm:

- Done tab header reads `LØPSSENTER · VEGG OG DRØMMER`.
- The 4-card `RaceStatsRow` appears between the header and the year-grouped timeline.
- Boston Marathon appears twice on the completed timeline, once for `2025` and once for `2023`.
- Year subtitles use `fullføringer` on `Gjennomført` and `planlagt` on `Drømmer`.
- Dream rows show the right-side `MÅL` label and a status chip.
- Placement medals appear only when `total_finishers` is present.

- [ ] **Step 5: Create the final implementation checkpoint commit**

```bash
git add -A
git commit -m "feat(races): complete PR3 race page polish"
```

---

## Acceptance checklist

- [x] `RacePage.jsx` uses PDF-style eyebrow/title/subtitle copy.
- [x] `RaceStatsRow` renders 4 summary cards between the header and timeline.
- [x] Completed races are flattened to one row per participation and grouped by participation year.
- [x] A race with multiple participations appears once in each participation year group.
- [x] Done-tab year subtitles use `fullføringer`; dream-tab subtitles use `planlagt`.
- [x] `RaceCardDone` accepts `{ race, participation }` and renders placement data with `PlacementMedal`.
- [x] `RaceCardDream` renders polished target/status content.
- [x] `tests/unit/races.test.jsx` and the full suite pass.
- [x] `npm run build` succeeds.

## Self-review notes

**Spec coverage**
- PR3 page copy, stats row, done/dream year-block wording, and participation flattening are covered in Tasks 1, 3, 4, and 5.
- New components called out in the spec (`RaceStatsRow`, `PlacementMedal`) are explicit creation tasks.
- Test coverage for multi-participation races, counts, and medal visibility is defined before implementation.

**Placeholder scan**
- No `TODO`, `TBD`, or “handle appropriately” wording remains.
- Each code-edit step includes the actual code to insert or replace.
- Each verification step names the concrete command and expected outcome.

**Type consistency**
- Completed rows consistently use `{ race, participation, id }`.
- `PlacementMedal` consumes `overallPlace` and `totalFinishers`, matching the new participation fixture keys.
- `RaceStatsRow` consumes `doneRows` and `dreamRaces`, matching the page-level memo outputs in Task 4.
