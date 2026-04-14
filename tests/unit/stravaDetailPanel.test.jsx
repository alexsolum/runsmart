import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";

const { invokeEdgeFunctionWithSessionRetryMock } = vi.hoisted(() => ({
  invokeEdgeFunctionWithSessionRetryMock: vi.fn(),
}));

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
  invokeEdgeFunctionWithSessionRetry: invokeEdgeFunctionWithSessionRetryMock,
}));

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: () => ({ auth: { client: {} } }),
}));

vi.mock("../../src/i18n/translations", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

vi.mock("../../src/components/ui/tabs", () => ({
  Tabs: ({ children }) => React.createElement("div", null, children),
  TabsList: ({ children }) =>
    React.createElement("div", { "data-testid": "tabs-list" }, children),
  TabsTrigger: ({ children, value }) =>
    React.createElement("button", { "data-testid": `tab-${value}` }, children),
  TabsContent: ({ children, value }) =>
    React.createElement("div", { "data-testid": `tab-content-${value}` }, children),
}));

import SplitsPaceChart from "../../src/components/races/SplitsPaceChart";
import StravaRouteMap from "../../src/components/races/StravaRouteMap";
import StravaDetailPanel from "../../src/components/races/StravaDetailPanel";

beforeEach(() => {
  invokeEdgeFunctionWithSessionRetryMock.mockReset();
});

afterEach(() => {
  cleanup();
});

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
    photos: [{ url: "https://example.com/photo1.jpg", caption: "Finish line" }],
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
  it("shows Strava activity link in Stats tab", async () => {
    invokeEdgeFunctionWithSessionRetryMock.mockResolvedValue({ data: makeStravaData() });
    render(<StravaDetailPanel stravaActivityId="99999" />);
    await waitFor(() => {
      const link = screen.getByText("races.viewOnStrava").closest("a");
      expect(link).toHaveAttribute("href", "https://www.strava.com/activities/99999");
    });
  });

  it("shows loading skeleton before data arrives", () => {
    invokeEdgeFunctionWithSessionRetryMock.mockImplementationOnce(() => new Promise(() => {}));
    const { container } = render(<StravaDetailPanel stravaActivityId="12345" />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

});
