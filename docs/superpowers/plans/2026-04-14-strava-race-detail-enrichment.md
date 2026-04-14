# Strava Race Detail Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich race participation panels with a route map, pace/HR chart, suffer score, and pacing analysis by reorganising `StravaDetailPanel` into a 4-tab layout (Stats / Route / Splits / Photos).

**Architecture:** Create two new isolated components (`SplitsPaceChart`, `StravaRouteMap`), then redesign `StravaDetailPanel` to host them inside shadcn `Tabs`. Move the "View on Strava" and photo-album links out of `ParticipationItem` and into the Stats tab. All data is already fetched by the existing `strava-activity-detail` edge function — no backend changes needed.

**Tech Stack:** React, shadcn `Tabs`/`Badge`, Recharts `ComposedChart` (already installed), Leaflet + react-leaflet (already installed), Vitest + React Testing Library.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/races/SplitsPaceChart.jsx` | Recharts bar+line chart for per-km pace and HR |
| Create | `src/components/races/StravaRouteMap.jsx` | Leaflet map rendered from encoded polyline |
| Modify | `src/components/races/StravaDetailPanel.jsx` | 4-tab layout; pacing analysis; hosts the two new components |
| Modify | `src/components/races/ParticipationItem.jsx` | Remove links (they move to Stats tab); pass `participation` prop to panel |
| Create | `tests/unit/stravaDetailPanel.test.jsx` | Component tests for all three new/changed components |

---

## Task 1: Create test file with SplitsPaceChart tests, then implement

**Files:**
- Create: `tests/unit/stravaDetailPanel.test.jsx`
- Create: `src/components/races/SplitsPaceChart.jsx`

- [ ] **Step 1.1 — Write failing tests for SplitsPaceChart**

Create `tests/unit/stravaDetailPanel.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("recharts", () => ({
  ComposedChart: ({ children }) =>
    React.createElement("div", { "data-testid": "composed-chart" }, children),
  ResponsiveContainer: ({ children }) =>
    React.createElement("div", { "data-testid": "responsive-container" }, children),
  Bar: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) =>
    React.createElement("div", { "data-testid": "map-container" }, children),
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: () => null,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

vi.mock("leaflet", () => ({
  default: { latLngBounds: vi.fn(() => ({})) },
}));

vi.mock("../../src/lib/edgeFunctionAuth", () => ({
  invokeEdgeFunctionWithSessionRetry: vi.fn(),
}));

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: () => ({ auth: { client: {} } }),
}));

vi.mock("../../src/i18n/translations", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

// Make all Tabs content visible simultaneously so tests can assert on content
// regardless of which tab is "active" (Radix hides inactive tabs via CSS).
vi.mock("../../src/components/ui/tabs", () => ({
  Tabs: ({ children }) => React.createElement("div", null, children),
  TabsList: ({ children }) =>
    React.createElement("div", { "data-testid": "tabs-list" }, children),
  TabsTrigger: ({ children, value }) =>
    React.createElement("button", { "data-testid": `tab-${value}` }, children),
  TabsContent: ({ children, value }) =>
    React.createElement("div", { "data-testid": `tab-content-${value}` }, children),
}));

// ── SplitsPaceChart ────────────────────────────────────────────────────────

import SplitsPaceChart from "../../src/components/races/SplitsPaceChart";

const SAMPLE_SPLITS = [
  { split: 1, average_speed: 3.2, average_heartrate: 145, elevation_difference: 5 },
  { split: 2, average_speed: 3.5, average_heartrate: 155, elevation_difference: -2 },
  { split: 3, average_speed: 3.4, average_heartrate: 158, elevation_difference: 3 },
  { split: 4, average_speed: 3.1, average_heartrate: 162, elevation_difference: 8 },
  { split: 5, average_speed: 3.6, average_heartrate: 150, elevation_difference: -5 },
];

describe("SplitsPaceChart", () => {
  it("renders a chart container given splits", () => {
    render(<SplitsPaceChart splits={SAMPLE_SPLITS} />);
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
    expect(screen.getByTestId("composed-chart")).toBeTruthy();
  });

  it("renders when HR data is absent", () => {
    const splitsNoHR = SAMPLE_SPLITS.map(({ average_heartrate: _, ...rest }) => rest);
    render(<SplitsPaceChart splits={splitsNoHR} />);
    expect(screen.getByTestId("composed-chart")).toBeTruthy();
  });
});
```

- [ ] **Step 1.2 — Run tests to verify they fail**

```bash
cd C:/Users/HP/Documents/Koding/Runsmart/runsmart
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/components/races/SplitsPaceChart'`

- [ ] **Step 1.3 — Implement SplitsPaceChart**

Create `src/components/races/SplitsPaceChart.jsx`:

```jsx
import React from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function formatPace(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "-";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

const TICK = { fontSize: 11, fill: "#94a3b8" };
const TOOLTIP_STYLE = {
  backgroundColor: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  fontSize: 12,
};

function getBarColor(speed, meanSpeed) {
  if (speed >= meanSpeed * 1.03) return "#34d399";
  if (speed <= meanSpeed * 0.97) return "#f87171";
  return "#60a5fa";
}

export default function SplitsPaceChart({ splits }) {
  const hasHR = splits.some((s) => s.average_heartrate != null);
  const meanSpeed = splits.reduce((sum, s) => sum + s.average_speed, 0) / splits.length;

  const data = splits.map((s) => ({
    km: s.split,
    speed: s.average_speed,
    hr: s.average_heartrate ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 4, right: hasHR ? 32 : 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="km" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis yAxisId="speed" hide />
        {hasHR && (
          <YAxis
            yAxisId="hr"
            orientation="right"
            tick={TICK}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
        )}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value, name) => {
            if (name === "speed") return [formatPace(value), "Pace"];
            if (name === "hr") return [`${Math.round(value)} bpm`, "HR"];
            return [value, name];
          }}
          labelFormatter={(v) => `km ${v}`}
        />
        <Bar yAxisId="speed" dataKey="speed" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.speed, meanSpeed)} />
          ))}
        </Bar>
        {hasHR && (
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 1.4 — Run tests to verify they pass**

```bash
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: PASS for the 2 SplitsPaceChart tests.

- [ ] **Step 1.5 — Commit**

```bash
git add src/components/races/SplitsPaceChart.jsx tests/unit/stravaDetailPanel.test.jsx
git commit -m "feat: add SplitsPaceChart component with Recharts ComposedChart"
```

---

## Task 2: StravaRouteMap component with tests

**Files:**
- Modify: `tests/unit/stravaDetailPanel.test.jsx` (add StravaRouteMap tests)
- Create: `src/components/races/StravaRouteMap.jsx`

- [ ] **Step 2.1 — Add StravaRouteMap tests to the test file**

Append to `tests/unit/stravaDetailPanel.test.jsx` (after the SplitsPaceChart describe block):

```jsx
import StravaRouteMap from "../../src/components/races/StravaRouteMap";

// Encoded polyline for a tiny triangle (3 points) — valid Google Encoded Polyline format
const SAMPLE_POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("StravaRouteMap", () => {
  it("renders the map container when a polyline is provided", () => {
    render(<StravaRouteMap polyline={SAMPLE_POLYLINE} />);
    expect(screen.getByTestId("map-container")).toBeTruthy();
  });

  it("shows a fallback message when polyline is null", () => {
    render(<StravaRouteMap polyline={null} />);
    expect(screen.queryByTestId("map-container")).toBeNull();
    expect(screen.getByText(/No route data available/i)).toBeTruthy();
  });

  it("shows a fallback message when polyline is an empty string", () => {
    render(<StravaRouteMap polyline="" />);
    expect(screen.queryByTestId("map-container")).toBeNull();
    expect(screen.getByText(/No route data available/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2.2 — Run tests to verify StravaRouteMap tests fail**

```bash
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: FAIL — `Cannot find module '../../src/components/races/StravaRouteMap'`

- [ ] **Step 2.3 — Implement StravaRouteMap**

Create `src/components/races/StravaRouteMap.jsx`:

```jsx
import React, { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";

/**
 * Decodes a Google Encoded Polyline string into an array of [lat, lng] pairs.
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function FitPolyline({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, positions]);
  return null;
}

export default function StravaRouteMap({ polyline }) {
  const positions = useMemo(() => {
    if (!polyline) return [];
    try {
      return decodePolyline(polyline);
    } catch {
      return [];
    }
  }, [polyline]);

  if (positions.length === 0) {
    return (
      <p className="text-sm text-slate-400 italic py-4 text-center">
        No route data available for this activity.
      </p>
    );
  }

  return (
    <MapContainer
      center={positions[0]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: 200, borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitPolyline positions={positions} />
      <Polyline positions={positions} color="#3b82f6" weight={3} />
      <CircleMarker
        center={positions[0]}
        radius={6}
        pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1 }}
      />
      <CircleMarker
        center={positions[positions.length - 1]}
        radius={6}
        pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1 }}
      />
    </MapContainer>
  );
}
```

- [ ] **Step 2.4 — Run tests to verify they pass**

```bash
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: all 5 tests PASS.

- [ ] **Step 2.5 — Commit**

```bash
git add src/components/races/StravaRouteMap.jsx tests/unit/stravaDetailPanel.test.jsx
git commit -m "feat: add StravaRouteMap component with inline polyline decoder"
```

---

## Task 3: Redesign StravaDetailPanel — tests first

**Files:**
- Modify: `tests/unit/stravaDetailPanel.test.jsx` (add panel tests)
- Modify: `src/components/races/StravaDetailPanel.jsx`

- [ ] **Step 3.1 — Add StravaDetailPanel tests**

Append to `tests/unit/stravaDetailPanel.test.jsx`:

```jsx
import { waitFor } from "@testing-library/react";
import { invokeEdgeFunctionWithSessionRetry } from "../../src/lib/edgeFunctionAuth";
import StravaDetailPanel from "../../src/components/races/StravaDetailPanel";

function makeStravaData(overrides = {}) {
  return {
    description: "Great race, negative split the back half.",
    map_polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    splits: [
      { split: 1, average_speed: 3.1, average_heartrate: 145, elevation_difference: 2 },
      { split: 2, average_speed: 3.5, average_heartrate: 150, elevation_difference: -1 },
      { split: 3, average_speed: 3.4, average_heartrate: 155, elevation_difference: 3 },
      { split: 4, average_speed: 3.6, average_heartrate: 148, elevation_difference: -2 },
    ],
    photos: [
      { url: "https://example.com/photo1.jpg", caption: "Finish line" },
    ],
    stats: {
      average_heartrate: 152,
      max_heartrate: 168,
      average_speed: 3.4,
      calories: 2400,
      suffer_score: 118,
      gear_name: "Nike Vaporfly",
    },
    ...overrides,
  };
}

describe("StravaDetailPanel", () => {
  it("shows loading skeleton before data arrives", () => {
    invokeEdgeFunctionWithSessionRetry.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<StravaDetailPanel stravaActivityId="12345" />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows error message when fetch fails", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({
      error: { message: "Strava unavailable" },
    });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByText("races.stravaUnavailable")).toBeTruthy();
    });
  });

  it("renders Stats tab by default with description and chips", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByText(/Great race, negative split/)).toBeTruthy();
    });
    expect(screen.getByText(/152 bpm/)).toBeTruthy(); // avg HR chip
    expect(screen.getByText(/118/)).toBeTruthy(); // suffer score
  });

  it("shows negative splits badge when second half is faster", async () => {
    // splits[2] and splits[3] are faster than splits[0] and splits[1]
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByText("Negative splits")).toBeTruthy();
    });
  });

  it("shows positive splits badge when second half is slower", async () => {
    const data = makeStravaData({
      splits: [
        { split: 1, average_speed: 3.8, average_heartrate: 145, elevation_difference: 0 },
        { split: 2, average_speed: 3.7, average_heartrate: 148, elevation_difference: 0 },
        { split: 3, average_speed: 3.2, average_heartrate: 160, elevation_difference: 0 },
        { split: 4, average_speed: 3.1, average_heartrate: 162, elevation_difference: 0 },
      ],
    });
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByText("Positive splits")).toBeTruthy();
    });
  });

  it("renders Route and Splits tab triggers", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-stats")).toBeTruthy();
      expect(screen.getByTestId("tab-route")).toBeTruthy();
      expect(screen.getByTestId("tab-splits")).toBeTruthy();
    });
  });

  it("renders Photos tab trigger only when photos exist", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-photos")).toBeTruthy();
    });
  });

  it("hides Photos tab trigger when photos array is empty", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({
      data: makeStravaData({ photos: [] }),
    });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-stats")).toBeTruthy();
    });
    expect(screen.queryByTestId("tab-photos")).toBeNull();
  });

  it("hides Splits tab trigger when splits array is empty", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({
      data: makeStravaData({ splits: [] }),
    });
    render(<StravaDetailPanel stravaActivityId="12345" />);
    await waitFor(() => {
      expect(screen.getByTestId("tab-stats")).toBeTruthy();
    });
    expect(screen.queryByTestId("tab-splits")).toBeNull();
  });

  it("shows Strava activity link in Stats tab", async () => {
    invokeEdgeFunctionWithSessionRetry.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="99999" />);
    await waitFor(() => {
      const link = screen.getByText("races.viewOnStrava").closest("a");
      expect(link).toHaveAttribute("href", "https://www.strava.com/activities/99999");
    });
  });
});
```

- [ ] **Step 3.2 — Run tests to verify they fail**

```bash
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: FAIL — multiple failures because the panel doesn't have the new tab structure yet.

- [ ] **Step 3.3 — Implement the redesigned StravaDetailPanel**

Replace the entire contents of `src/components/races/StravaDetailPanel.jsx`:

```jsx
import React, { useEffect, useState } from "react";
import { ExternalLink, Camera } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { useAppData } from "../../context/AppDataContext";
import { invokeEdgeFunctionWithSessionRetry } from "../../lib/edgeFunctionAuth";
import { useI18n } from "../../i18n/translations";
import SplitsPaceChart from "./SplitsPaceChart";
import StravaRouteMap from "./StravaRouteMap";

function formatPace(avgSpeed) {
  if (!avgSpeed || avgSpeed <= 0) return "-";
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.round(paceSeconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")} /km`;
}

function classifySplits(splits) {
  if (!splits || splits.length < 4) return null;
  const mid = Math.floor(splits.length / 2);
  const firstHalf = splits.slice(0, mid);
  const secondHalf = splits.slice(mid);
  const avgFirst = firstHalf.reduce((sum, s) => sum + s.average_speed, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + s.average_speed, 0) / secondHalf.length;
  const ratio = avgSecond / avgFirst;
  if (ratio > 1.02) return "negative";
  if (ratio < 0.98) return "positive";
  return "even";
}

function findFastestSplit(splits) {
  return splits.reduce(
    (best, s) => (s.average_speed > best.average_speed ? s : best),
    splits[0],
  );
}

function findSlowestSplit(splits) {
  return splits.reduce(
    (worst, s) => (s.average_speed < worst.average_speed ? s : worst),
    splits[0],
  );
}

function lastNAvgPace(splits, n) {
  const last = splits.slice(-n);
  const avgSpeed = last.reduce((sum, s) => sum + s.average_speed, 0) / last.length;
  return formatPace(avgSpeed);
}

const SPLIT_BADGE_STYLE = {
  negative: "bg-green-50 text-green-700 border-green-200",
  positive: "bg-red-50 text-red-700 border-red-200",
  even: "bg-blue-50 text-blue-700 border-blue-200",
};

const SPLIT_BADGE_LABEL = {
  negative: "Negative splits",
  positive: "Positive splits",
  even: "Even splits",
};

export default function StravaDetailPanel({ stravaActivityId, participation }) {
  const { t } = useI18n();
  const { auth } = useAppData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!stravaActivityId || !auth.client) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    invokeEdgeFunctionWithSessionRetry(auth.client, "strava-activity-detail", {
      body: { activity_id: stravaActivityId },
    })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(result.error.message || "Failed to load");
        } else {
          setData(result.data);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stravaActivityId, auth.client]);

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-4 text-xs text-slate-400 italic">
        {t("races.stravaUnavailable")}
      </div>
    );
  }

  const splits = data.splits ?? [];
  const photos = data.photos ?? [];
  const splitsClassification = classifySplits(splits);
  const fastest = splits.length > 0 ? findFastestSplit(splits) : null;
  const slowest = splits.length > 0 ? findSlowestSplit(splits) : null;

  return (
    <div className="mt-4">
      <Tabs defaultValue="stats">
        <TabsList>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="route">Route</TabsTrigger>
          {splits.length > 0 && <TabsTrigger value="splits">Splits</TabsTrigger>}
          {photos.length > 0 && <TabsTrigger value="photos">Photos</TabsTrigger>}
        </TabsList>

        {/* ── STATS ─────────────────────────────────────────────────── */}
        <TabsContent value="stats" className="space-y-4 pt-3">
          {data.description && (
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed italic">
              {data.description}
            </p>
          )}

          <div className="flex gap-3 flex-wrap">
            {data.stats?.average_heartrate && (
              <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                <span className="text-red-400">Avg HR</span>{" "}
                <span className="font-semibold text-red-700">
                  {Math.round(data.stats.average_heartrate)} bpm
                </span>
              </div>
            )}
            {data.stats?.max_heartrate && (
              <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs">
                <span className="text-red-400">Max HR</span>{" "}
                <span className="font-semibold text-red-700">
                  {Math.round(data.stats.max_heartrate)} bpm
                </span>
              </div>
            )}
            {data.stats?.average_speed && (
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                <span className="text-blue-400">Avg Pace</span>{" "}
                <span className="font-semibold text-blue-700">
                  {formatPace(data.stats.average_speed)}
                </span>
              </div>
            )}
            {data.stats?.calories && (
              <div className="px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-xs">
                <span className="text-orange-400">Calories</span>{" "}
                <span className="font-semibold text-orange-700">{data.stats.calories}</span>
              </div>
            )}
            {data.stats?.suffer_score && (
              <div className="px-3 py-1.5 bg-pink-50 border border-pink-100 rounded-lg text-xs">
                <span className="text-pink-400">Suffer Score</span>{" "}
                <span className="font-semibold text-pink-700">{data.stats.suffer_score}</span>
              </div>
            )}
            {data.stats?.gear_name && (
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="text-slate-400">Gear</span>{" "}
                <span className="font-semibold text-slate-700">{data.stats.gear_name}</span>
              </div>
            )}
            {splitsClassification && (
              <Badge
                variant="outline"
                className={SPLIT_BADGE_STYLE[splitsClassification]}
              >
                {SPLIT_BADGE_LABEL[splitsClassification]}
              </Badge>
            )}
          </div>

          {(fastest || slowest) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pacing highlights
              </p>
              {fastest && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="font-medium text-slate-700">Fastest km</span>
                  <span className="text-slate-500">
                    km {fastest.split} — {formatPace(fastest.average_speed)}
                  </span>
                </div>
              )}
              {slowest && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="font-medium text-slate-700">Slowest km</span>
                  <span className="text-slate-500">
                    km {slowest.split} — {formatPace(slowest.average_speed)}
                  </span>
                </div>
              )}
              {splits.length >= 5 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="font-medium text-slate-700">Last 5 km</span>
                  <span className="text-slate-500">{lastNAvgPace(splits, 5)} avg</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap pt-1">
            {stravaActivityId && (
              <a
                href={`https://www.strava.com/activities/${stravaActivityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-orange-200 rounded-lg text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors font-medium"
              >
                <ExternalLink size={14} />
                {t("races.viewOnStrava")}
              </a>
            )}
            {participation?.photo_album_url && (
              <a
                href={participation.photo_album_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                <Camera size={14} />
                {t("races.photoAlbum")}
              </a>
            )}
          </div>
        </TabsContent>

        {/* ── ROUTE ─────────────────────────────────────────────────── */}
        <TabsContent value="route" className="pt-3">
          {data.map_polyline ? (
            <StravaRouteMap polyline={data.map_polyline} />
          ) : (
            <p className="text-sm text-slate-400 italic py-4 text-center">
              No route data available for this activity.
            </p>
          )}
        </TabsContent>

        {/* ── SPLITS ────────────────────────────────────────────────── */}
        {splits.length > 0 && (
          <TabsContent value="splits" className="space-y-4 pt-3">
            <SplitsPaceChart splits={splits} />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="py-1.5 pr-3 font-medium">KM</th>
                    <th className="py-1.5 pr-3 font-medium">Pace</th>
                    <th className="py-1.5 pr-3 font-medium">HR</th>
                    <th className="py-1.5 font-medium">Elev</th>
                  </tr>
                </thead>
                <tbody>
                  {splits.map((s) => (
                    <tr key={s.split} className="border-b border-slate-50">
                      <td className="py-1 pr-3 font-medium text-slate-700">{s.split}</td>
                      <td className="py-1 pr-3 text-slate-600">{formatPace(s.average_speed)}</td>
                      <td className="py-1 pr-3 text-slate-600">
                        {s.average_heartrate ? Math.round(s.average_heartrate) : "-"}
                      </td>
                      <td className="py-1 text-slate-600">
                        {s.elevation_difference != null
                          ? `${s.elevation_difference > 0 ? "+" : ""}${Math.round(s.elevation_difference)}m`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {/* ── PHOTOS ────────────────────────────────────────────────── */}
        {photos.length > 0 && (
          <TabsContent value="photos" className="pt-3">
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, i) => (
                <div key={i}>
                  <img
                    src={photo.url}
                    alt={photo.caption || `Race photo ${i + 1}`}
                    className="w-full h-32 rounded-lg object-cover"
                  />
                  {photo.caption && (
                    <p className="text-xs text-slate-500 mt-1">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3.4 — Run tests to verify they pass**

```bash
npx vitest run tests/unit/stravaDetailPanel.test.jsx
```

Expected: all tests PASS.

- [ ] **Step 3.5 — Commit**

```bash
git add src/components/races/StravaDetailPanel.jsx tests/unit/stravaDetailPanel.test.jsx
git commit -m "feat: redesign StravaDetailPanel with 4-tab layout, pacing analysis, suffer score"
```

---

## Task 4: Update ParticipationItem to pass `participation` prop

**Files:**
- Modify: `src/components/races/ParticipationItem.jsx`

The "View on Strava" and photo-album links have moved into the Stats tab of `StravaDetailPanel`. `ParticipationItem` must stop rendering them and instead pass the `participation` object to the panel.

- [ ] **Step 4.1 — Update ParticipationItem**

Replace the entire contents of `src/components/races/ParticipationItem.jsx`:

```jsx
import React from "react";
import { useI18n } from "../../i18n/translations";
import StravaDetailPanel from "./StravaDetailPanel";

export default function ParticipationItem({ participation, isPR }) {
  const { t } = useI18n();

  return (
    <div className="p-4">
      {participation.notes && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            {t("races.raceNotes")}
          </p>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
            {participation.notes}
          </div>
        </div>
      )}

      {participation.strava_activity_id && (
        <StravaDetailPanel
          stravaActivityId={participation.strava_activity_id}
          participation={participation}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4.2 — Run the full test suite to check for regressions**

```bash
npx vitest run tests/unit/races.test.jsx tests/unit/stravaDetailPanel.test.jsx
```

Expected: all tests PASS. (The existing `races.test.jsx` mocks `StravaDetailPanel` entirely, so the prop change doesn't affect it.)

- [ ] **Step 4.3 — Commit**

```bash
git add src/components/races/ParticipationItem.jsx
git commit -m "refactor: move Strava links from ParticipationItem into StravaDetailPanel Stats tab"
```

---

## Task 5: Run full test suite and verify

- [ ] **Step 5.1 — Run all component tests**

```bash
npx vitest run --project components
```

Expected: all tests PASS with no regressions.

- [ ] **Step 5.2 — Start dev server and manually verify the participation panel**

```bash
npm run dev
```

Open `http://localhost:5173`, navigate to Races, open a race with a participation that has a Strava activity ID linked. Verify:

1. Panel loads (skeleton visible briefly)
2. Stats tab shows: description, HR chips, suffer score chip, splits badge, pacing highlights, "View on Strava" link
3. Route tab shows: Leaflet map with the route polyline (green start dot, red finish dot)
4. Splits tab shows: pace bar chart (green = fast, red = slow, blue = normal) with HR line overlay; splits table below
5. Photos tab shows: photo grid (only visible when the activity has photos)
6. A race participation without a Strava activity ID shows no panel (unchanged)

- [ ] **Step 5.3 — Final commit if any fixes were needed during manual review**

```bash
git add -p   # stage only relevant changes
git commit -m "fix: <describe what was fixed>"
```
