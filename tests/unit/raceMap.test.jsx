import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RaceMap from "../../src/components/races/RaceMap";

const fitBoundsMock = vi.fn();

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => React.createElement("div", { "data-testid": "map-container" }, children),
  TileLayer: () => React.createElement("div", { "data-testid": "tile-layer" }),
  Marker: ({ children, eventHandlers }) =>
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => eventHandlers?.click?.(),
      },
      children,
    ),
  Popup: ({ children }) => React.createElement("div", { "data-testid": "popup" }, children),
  Tooltip: ({ children }) => React.createElement("span", { "data-testid": "tooltip" }, children),
  useMap: () => ({ fitBounds: fitBoundsMock }),
}));

vi.mock("leaflet", () => ({
  default: {
    icon: vi.fn(),
    divIcon: vi.fn(),
    latLngBounds: vi.fn((points) => points),
    latLng: vi.fn((lat, lng) => [lat, lng]),
  },
}));

describe("RaceMap", () => {
  const races = [
    {
      id: "race-1",
      name: "Boston Marathon",
      latitude: 42.3601,
      longitude: -71.0589,
      race_participations: [{ id: "rp-1" }],
    },
    {
      id: "race-2",
      name: "Western States 100",
      latitude: 39.1968,
      longitude: -120.2354,
      race_participations: [],
    },
    {
      id: "race-3",
      name: "No Coordinates Race",
      race_participations: [],
    },
  ];

  beforeEach(() => {
    fitBoundsMock.mockClear();
  });

  it("renders only races with coordinates", () => {
    render(<RaceMap races={races} onSelectRace={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Boston Marathon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Western States 100/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /No Coordinates Race/ })).toBeNull();
  });

  it("filters markers between All, Done, and Bucket list", () => {
    render(<RaceMap races={races} onSelectRace={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Boston Marathon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Western States 100/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("button", { name: /Boston Marathon/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Western States 100/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Bucket list" }));
    expect(screen.queryByRole("button", { name: /Boston Marathon/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Western States 100/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("button", { name: /Boston Marathon/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Western States 100/ })).toBeTruthy();
  });

  it("calls onSelectRace with the race id when a marker is clicked", () => {
    const onSelectRace = vi.fn();
    render(<RaceMap races={races} onSelectRace={onSelectRace} />);

    fireEvent.click(screen.getByRole("button", { name: /Boston Marathon/ }));

    expect(onSelectRace).toHaveBeenCalledWith("race-1");
  });

  it("shows the race name in a hover tooltip", () => {
    render(<RaceMap races={races} onSelectRace={vi.fn()} />);

    expect(screen.getAllByTestId("tooltip")[0]).toHaveTextContent("Boston Marathon");
    expect(screen.getAllByTestId("tooltip")[1]).toHaveTextContent("Western States 100");
  });
});
