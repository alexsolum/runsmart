import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { makeAppData, SAMPLE_RACES } from "./mockAppData";

vi.mock("../../src/components/ui/accordion", () => ({
  Accordion: ({ children }) => React.createElement("div", { "data-testid": "accordion" }, children),
  AccordionItem: ({ children, value }) => React.createElement("div", { "data-testid": `accordion-item-${value}` }, children),
  AccordionTrigger: ({ children }) => React.createElement("button", { type: "button" }, children),
  AccordionContent: ({ children }) => React.createElement("div", null, children),
}));

vi.mock("../../src/components/ui/separator", () => ({
  Separator: () => React.createElement("hr"),
}));

vi.mock("../../src/components/races/StravaDetailPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "strava-panel" }),
}));

vi.mock("../../src/components/races/RaceDetailView", () => ({
  default: ({ race, onBack }) =>
    React.createElement(
      "div",
      { "data-testid": "race-detail" },
      React.createElement(
        "button",
        { type: "button", onClick: onBack },
        "nav.races",
      ),
      React.createElement("h1", null, race.name),
    ),
}));

vi.mock("../../src/components/races/RaceFormDialog", () => ({
  default: () => React.createElement("div", { "data-testid": "race-form-dialog" }),
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => React.createElement("div", { "data-testid": "map-container" }, children),
  TileLayer: () => React.createElement("div", { "data-testid": "tile-layer" }),
  Marker: ({ children }) => React.createElement("div", { "data-testid": "marker" }, children),
  Popup: ({ children }) => React.createElement("div", { "data-testid": "popup" }, children),
  useMap: () => ({ fitBounds: vi.fn() }),
}));

vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({})),
  },
}));

vi.mock("../../src/components/races/RaceMap", () => ({
  default: ({ races, onSelectRace }) =>
    React.createElement(
      "div",
      { "data-testid": "race-map" },
      races
        .filter((race) => race.latitude != null && race.longitude != null)
        .map((race) =>
          React.createElement(
            "button",
            {
              key: race.id,
              type: "button",
              onClick: () => onSelectRace(race.id),
            },
            `Map ${race.name}`,
          ),
        ),
    ),
}));

vi.mock("../../src/context/AppDataContext", () => {
  let _value;
  return {
    useAppData: vi.fn(() => _value),
    AppDataProvider: ({ children }) => children,
    __setMockValue: (v) => { _value = v; },
  };
});

vi.mock("../../src/i18n/translations", () => ({
  useI18n: () => ({ t: (key) => key }),
}));

import RacePage from "../../src/pages/RacePage";
import RaceCard from "../../src/components/races/RaceCard";
import RaceListView from "../../src/components/races/RaceListView";
import ParticipationAccordion from "../../src/components/races/ParticipationAccordion";
import ResourceList from "../../src/components/races/ResourceList";
import { __setMockValue, useAppData } from "../../src/context/AppDataContext";

describe("RaceCard", () => {
  it("renders history race with participation count and PR", () => {
    const race = SAMPLE_RACES[0]; // Boston Marathon with 2 participations
    const onClick = vi.fn();
    render(<RaceCard race={race} onClick={onClick} />);

    expect(screen.getByText("Boston Marathon")).toBeTruthy();
    expect(screen.getByText(/2×/)).toBeTruthy();
    expect(screen.getByText(/3:12:45/)).toBeTruthy();
  });

  it("renders bucket list race with description", () => {
    const race = SAMPLE_RACES[1]; // Western States with 0 participations
    render(<RaceCard race={race} onClick={vi.fn()} />);

    expect(screen.getByText("Western States 100")).toBeTruthy();
    expect(screen.getByText(/grandfather of 100-milers/)).toBeTruthy();
    expect(screen.getByText("Lottery + qualifier")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<RaceCard race={SAMPLE_RACES[0]} onClick={onClick} />);

    fireEvent.click(screen.getByText("Boston Marathon"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

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
    expect(container.querySelector(".bg-gradient-to-br")).toBeTruthy();
  });
});

describe("RaceListView", () => {
  it("separates races into history and bucket list tabs", () => {
    render(
      <RaceListView
        races={SAMPLE_RACES}
        activeTab="history"
        onTabChange={vi.fn()}
        onSelectRace={vi.fn()}
        onAddRace={vi.fn()}
      />
    );

    expect(screen.getByText(/races.history/)).toBeTruthy();
    expect(screen.getByText(/races.bucketList/)).toBeTruthy();
    expect(screen.getByText("Boston Marathon")).toBeTruthy();
  });

  it("shows bucket list when tab is active", () => {
    render(
      <RaceListView
        races={SAMPLE_RACES}
        activeTab="bucket-list"
        onTabChange={vi.fn()}
        onSelectRace={vi.fn()}
        onAddRace={vi.fn()}
      />
    );

    expect(screen.getByText("Western States 100")).toBeTruthy();
  });
});

describe("ParticipationAccordion", () => {
  it("renders participations sorted newest first", () => {
    const participations = SAMPLE_RACES[0].race_participations;
    render(<ParticipationAccordion participations={participations} />);

    const items = screen.getAllByText(/April/);
    expect(items.length).toBe(2);
    // Newest (2025) should appear first
    expect(items[0].textContent).toContain("2025");
  });

  it("marks PR participation", () => {
    const participations = SAMPLE_RACES[0].race_participations;
    render(<ParticipationAccordion participations={participations} />);

    expect(screen.getByText(/PR/)).toBeTruthy();
  });
});

describe("ResourceList", () => {
  it("renders resources grouped by type", () => {
    const resources = SAMPLE_RACES[0].race_resources;
    render(<ResourceList resources={resources} onAdd={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("Official Race Website")).toBeTruthy();
    expect(screen.getByText("Course Map & Elevation")).toBeTruthy();
  });

  it("shows add resource button", () => {
    render(<ResourceList resources={[]} onAdd={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("races.addResource")).toBeTruthy();
  });
});

describe("RacePage", () => {
  beforeEach(() => {
    __setMockValue(makeAppData());
  });

  it("renders list view by default", () => {
    render(<RacePage />);

    expect(screen.getByText("Boston Marathon")).toBeTruthy();
    expect(screen.getByText("races.addRace")).toBeTruthy();
  });

  it("navigates to detail view when clicking a race", () => {
    render(<RacePage />);

    fireEvent.click(screen.getByText("Boston Marathon"));
    // Should show breadcrumb with race name
    expect(screen.getByText("nav.races")).toBeTruthy();
  });

  it("navigates to detail view when clicking a map marker", () => {
    render(<RacePage />);

    fireEvent.click(screen.getByRole("button", { name: "Map Boston Marathon" }));

    expect(screen.getByText("nav.races")).toBeTruthy();
    expect(screen.getByText("Boston Marathon")).toBeTruthy();
  });
});

describe("RaceDetailView (real)", () => {
  let RaceDetailViewReal;

  beforeAll(async () => {
    const mod = await vi.importActual("../../src/components/races/RaceDetailView");
    RaceDetailViewReal = mod.default;
  });

  function makeRace(overrides = {}) {
    return {
      id: "race-detail-test",
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
      ...overrides,
    };
  }

  function renderDetail(raceOverrides = {}) {
    const race = makeRace(raceOverrides);
    const appData = makeAppData({
      races: {
        races: [race],
        loading: false,
        error: null,
        loadRaces: vi.fn().mockResolvedValue([race]),
        createRace: vi.fn().mockResolvedValue(race),
        updateRace: vi.fn().mockResolvedValue(race),
        deleteRace: vi.fn().mockResolvedValue(undefined),
        addParticipation: vi.fn().mockResolvedValue({}),
        updateParticipation: vi.fn().mockResolvedValue({}),
        deleteParticipation: vi.fn().mockResolvedValue(undefined),
        addResource: vi.fn().mockResolvedValue({}),
        deleteResource: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(useAppData).mockReturnValue(appData);
    return render(<RaceDetailViewReal race={race} onBack={vi.fn()} />);
  }

  it("renders cover photo hero when cover_image_url is set", () => {
    const { container } = renderDetail({
      cover_image_url: "https://example.com/utmb.jpg",
    });
    const imgs = container.querySelectorAll("img");
    const heroImg = Array.from(imgs).find(
      (img) => img.getAttribute("src") === "https://example.com/utmb.jpg"
    );
    expect(heroImg).toBeTruthy();
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
    const sketchImg = container.querySelector(
      `img[src="https://example.com/sketch.png"]`
    );
    expect(sketchImg).toBeTruthy();
  });

  it("hides AI sketch section when image_url is null", () => {
    renderDetail({ image_url: null });
    expect(screen.queryByText(/Route sketch/i)).toBeNull();
  });
});
