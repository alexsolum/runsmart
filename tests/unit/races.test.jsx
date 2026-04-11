import { describe, it, expect, vi, beforeEach } from "vitest";
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

vi.mock("../../src/context/AppDataContext", () => {
  let _value;
  return {
    useAppData: () => _value,
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
import { __setMockValue } from "../../src/context/AppDataContext";

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
});
