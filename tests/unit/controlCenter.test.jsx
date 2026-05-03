import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { makeAppData, SAMPLE_DAILY_LOGS, SAMPLE_HIERARCHICAL_PLAN, SAMPLE_RACES } from "./mockAppData";

const mockShowToast = vi.fn();
const state = vi.hoisted(() => ({ appData: null }));
const edgeInvoke = vi.hoisted(() => vi.fn());
vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: () => state.appData,
}));
vi.mock("../../src/lib/edgeFunctionAuth", () => ({
  invokeEdgeFunctionWithSessionRetry: (...args) => edgeInvoke(...args),
}));
vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth:      { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: {}, error: null }) },
  }),
}));
vi.mock("leaflet", () => ({
  default: {
    divIcon: vi.fn((options) => options),
    latLngBounds: vi.fn((positions) => positions),
  },
}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="race-leaflet-map">{children}</div>,
  TileLayer: () => <div data-testid="race-tile-layer" />,
  Marker: ({ children, eventHandlers }) => (
    <button type="button" data-testid="race-map-marker" onClick={() => eventHandlers?.click?.()}>
      {children}
    </button>
  ),
  Popup: ({ children }) => <div>{children}</div>,
  Tooltip: ({ children }) => <span>{children}</span>,
  Polyline: () => <div data-testid="strava-polyline" />,
  CircleMarker: () => <div data-testid="strava-route-point" />,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

import ControlCenterPage from "../../src/pages/ControlCenterPage";

function mockMatchMedia(matches = false) {
  const listeners = new Set();
  const media = {
    matches,
    media: "(max-width: 899px)",
    addEventListener: vi.fn((event, listener) => {
      if (event === "change") listeners.add(listener);
    }),
    removeEventListener: vi.fn((event, listener) => {
      if (event === "change") listeners.delete(listener);
    }),
  };
  window.matchMedia = vi.fn().mockReturnValue(media);
  return media;
}

function currentWeekIso(targetDay) {
  const date = new Date();
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + targetDay);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function addDaysIso(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeWeek(startIso, weekNumber, focus = `Testuke ${weekNumber}`) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    weekNumber,
    startDate: startIso,
    endDate: addDaysIso(startIso, 6),
    phase: "Build",
    focus,
    summary: { totalKm: 42, sessions: 5 },
    days: labels.map((dayOfWeek, index) => ({
      date: addDaysIso(startIso, index),
      dayOfWeek,
      workouts: [
        {
          id: `wk-${weekNumber}-${index}`,
          sport: "Run",
          type: index === 6 ? "Long Run" : "Easy",
          name: index === 0 ? `Planlagt økt uke ${weekNumber}` : `${focus} dag ${index + 1}`,
          description: "Planlagt treningsbeskrivelse",
          durationMinutes: 50 + index,
          distanceKm: 8 + index,
          primaryZone: "Z2",
          humanReadable: "Rolig planlagt økt.",
          completed: false,
        },
      ],
    })),
  };
}

function makeDashboardPlan() {
  const currentStart = currentWeekIso(1);
  return {
    ...SAMPLE_HIERARCHICAL_PLAN,
    plan_data: {
      ...SAMPLE_HIERARCHICAL_PLAN.plan_data,
      phases: [{ name: "Build", startWeek: 1, endWeek: 4, focus: "Build test" }],
      weeks: [
        makeWeek(currentStart, 1, "Nåværende uke"),
        makeWeek(addDaysIso(currentStart, 7), 2, "Rullerende uke to"),
        makeWeek(addDaysIso(currentStart, 14), 3, "Rullerende uke tre"),
        makeWeek(addDaysIso(currentStart, 21), 4, "Rullerende uke fire"),
      ],
    },
  };
}

describe("ControlCenterPage smoke", () => {
  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView; CoachPage calls it.
    Element.prototype.scrollIntoView = vi.fn();
    mockMatchMedia(false);
    mockShowToast.mockClear();
    edgeInvoke.mockReset();
    edgeInvoke.mockResolvedValue({ data: {}, error: null });
    window.localStorage.clear();
    state.appData = {
      ...makeAppData(),
      showToast: mockShowToast,
      dismissToast: vi.fn(),
    };
  });

  it("renders the mobile shell below 900px", () => {
    mockMatchMedia(true);

    render(<ControlCenterPage />);

    expect(screen.queryByText(/optimalisert for skjermer bredere enn 900 px/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("rs-mobile-shell")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /Mobilnavigasjon/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Oversikt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Plan$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI-trener/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Dagens plan/i })).toBeInTheDocument();
  });

  it("switches between mobile dashboard, plan, and coach tabs", () => {
    mockMatchMedia(true);

    render(<ControlCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /^Plan$/i }));
    expect(screen.getByRole("heading", { name: /Sesongoversikt/i })).toBeInTheDocument();
    expect(screen.getByText(/Uke 1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /AI-trener/i }));
    expect(screen.getByRole("heading", { name: /AI-trener/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Spør om trening, tempo, restitusjon/i)).toBeInTheDocument();
  });

  it("renders the app bar and module tabs", () => {
    render(<ControlCenterPage />);
    expect(screen.getAllByText(/FLYT/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Oversikt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Treningsplan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /↗Coaching/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Løpssenter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dagslogg/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /AI-trener/i })).toBeInTheDocument();
  });

  it("renders executed training for previous days and keeps the planned workout visible", () => {
    const pastDate = currentWeekIso(1);
    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: makeDashboardPlan(),
      },
      activities: {
        ...state.appData.activities,
        activities: [
          {
            id: "actual-past",
            name: "Faktisk rolig løpetur",
            type: "Run",
            started_at: `${pastDate}T10:00:00Z`,
            distance: 7200,
            moving_time: 2460,
          },
        ],
      },
    };

    render(<ControlCenterPage />);

    expect(screen.getByText(/Faktisk rolig løpetur/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan: Planlagt økt uke 1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Utført/i).length).toBeGreaterThan(0);
  });

  it("renders every executed workout when a previous day has multiple activities", () => {
    const multiActivityDate = currentWeekIso(3);
    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: makeDashboardPlan(),
      },
      activities: {
        ...state.appData.activities,
        activities: [
          {
            id: "actual-1",
            name: "Morgenintervaller 22. april",
            type: "Run",
            started_at: `${multiActivityDate}T07:15:00Z`,
            distance: 6400,
            moving_time: 2100,
          },
          {
            id: "actual-2",
            name: "Styrkeøkt 22. april",
            type: "Strength",
            started_at: `${multiActivityDate}T12:00:00Z`,
            distance: 0,
            moving_time: 2700,
          },
          {
            id: "actual-3",
            name: "Kveldsjogg 22. april",
            type: "Run",
            started_at: `${multiActivityDate}T18:30:00Z`,
            distance: 5200,
            moving_time: 1800,
          },
        ],
      },
    };

    render(<ControlCenterPage />);

    expect(screen.getByText(/Morgenintervaller 22\. april/i)).toBeInTheDocument();
    expect(screen.getByText(/Styrkeøkt 22\. april/i)).toBeInTheDocument();
    expect(screen.getByText(/Kveldsjogg 22\. april/i)).toBeInTheDocument();
    expect(screen.getByText(/3 utførte økter/i)).toBeInTheDocument();
  });

  it("switches dashboard views between today, week, and rolling month", () => {
    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: makeDashboardPlan(),
      },
    };

    render(<ControlCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /^I dag$/i }));
    expect(screen.getByText(/Dagsplan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Måned$/i }));
    expect(screen.getByText(/Rullerende 4 uker/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rullerende uke to/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /^Uke$/i }));
    expect(screen.getByText(/Ukesplan/i)).toBeInTheDocument();
  });

  it("uses the existing Strava sync hook from the dashboard toolbar", async () => {
    const sync = vi.fn().mockResolvedValue({ synced: 2, total: 2 });
    state.appData = {
      ...state.appData,
      strava: {
        connected: true,
        loading: false,
        isSyncingHistory: false,
        lastSyncAt: "2026-04-25T12:34:00Z",
        statusMessage: "Synced 2 activities.",
        error: null,
        sync,
        startConnect: vi.fn(),
      },
    };

    render(<ControlCenterPage />);

    expect(screen.getByText(/Sist synket:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Synk Strava/i }));

    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Synced 2 activities/i)).toBeInTheDocument();
  });

  it("starts Strava connection when sync is requested while disconnected", async () => {
    const startConnect = vi.fn();
    state.appData = {
      ...state.appData,
      strava: {
        connected: false,
        loading: false,
        isSyncingHistory: false,
        lastSyncAt: null,
        statusMessage: "",
        error: null,
        sync: vi.fn(),
        startConnect,
      },
    };

    render(<ControlCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /Koble til Strava/i }));

    expect(startConnect).toHaveBeenCalledTimes(1);
  });

  it("shows actual hierarchical plan workouts on the Training Plan week grid", () => {
    render(<ControlCenterPage />);

    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    expect(screen.getByText(/Hill reps/i)).toBeInTheDocument();
    expect(screen.getByText(/Easy aerobic/i)).toBeInTheDocument();
  });

  it("edits, adds, and deletes workouts from the Training Plan week grid", async () => {
    const applyPatch = vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN.plan_data);
    const addWorkout = vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN.plan_data);
    const deleteWorkout = vi.fn().mockResolvedValue(SAMPLE_HIERARCHICAL_PLAN.plan_data);
    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: {
          ...SAMPLE_HIERARCHICAL_PLAN,
          plan_data: {
            ...SAMPLE_HIERARCHICAL_PLAN.plan_data,
            weeks: SAMPLE_HIERARCHICAL_PLAN.plan_data.weeks.slice(0, 1),
          },
        },
        applyPatch,
        addWorkout,
        deleteWorkout,
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    fireEvent.click(screen.getByRole("button", { name: /Hill reps/i }));
    expect(screen.getByRole("heading", { name: /Rediger økt/i })).toBeInTheDocument();
    const typeSelect = screen.getByLabelText(/Type/i);
    expect(typeSelect.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: /Intervals/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Workout$/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Navn/i), { target: { value: "Oppdatert bakkeøkt" } });
    fireEvent.change(typeSelect, { target: { value: "Tempo" } });
    fireEvent.click(screen.getByRole("button", { name: /Lagre endringer/i }));

    await waitFor(() => expect(applyPatch).toHaveBeenCalledWith([
      expect.objectContaining({
        week: 1,
        dayDate: "2026-03-04",
        workoutId: "w-2",
        fields: expect.objectContaining({ name: "Oppdatert bakkeøkt", type: "Tempo" }),
      }),
    ]));

    fireEvent.click(screen.getByRole("button", { name: /Opprett økt onsdag 4\. mar/i }));
    expect(screen.getByRole("heading", { name: /Legg til økt/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Navn/i), { target: { value: "Ny kontrollert økt" } });
    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: "Long Run" } });
    fireEvent.change(screen.getByLabelText(/Distanse/i), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /Legg til økt/i }));

    await waitFor(() => expect(addWorkout).toHaveBeenCalledWith(expect.objectContaining({
      weekNumber: 1,
      dayDate: "2026-03-04",
      workout: expect.objectContaining({ name: "Ny kontrollert økt", type: "Long Run", distanceKm: 12 }),
    })));

    fireEvent.click(screen.getByRole("button", { name: /Hill reps/i }));
    fireEvent.click(screen.getByRole("button", { name: /Slett økt/i }));

    await waitFor(() => expect(deleteWorkout).toHaveBeenCalledWith("w-2", 1, "2026-03-04"));
  }, 15000);

  it("filters the Training Plan grid with the top view controls", () => {
    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: makeDashboardPlan(),
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    expect(screen.getByText(/4 uker/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Neste 8 uker/i }));
    expect(screen.getByText(/4 uker/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Nåværende blokk/i }));
    expect(screen.getByText(/4 uker/i)).toBeInTheDocument();
  });

  it("shows the complete Training Plan through the final planned workout in full-plan mode", () => {
    const fillerWeeks = [
      ["2026-04-27", "2026-05-03"],
      ["2026-05-04", "2026-05-10"],
      ["2026-05-11", "2026-05-17"],
      ["2026-05-18", "2026-05-24"],
    ].map(([startDate, endDate], index) => ({
      weekNumber: 9 + index,
      startDate,
      endDate,
      phase: "Build",
      focus: "Continued plan coverage.",
      summary: { totalKm: 0 },
      days: [],
    }));
    const extendedWeeks = [
      ...SAMPLE_HIERARCHICAL_PLAN.plan_data.weeks,
      ...fillerWeeks,
      {
        weekNumber: 13,
        startDate: "2026-05-25",
        endDate: "2026-05-31",
        phase: "Build",
        focus: "Final visible user-planned week.",
        summary: { totalKm: 42 },
        days: [
          { date: "2026-05-25", dayOfWeek: "Mon", workouts: [] },
          { date: "2026-05-26", dayOfWeek: "Tue", workouts: [] },
          { date: "2026-05-27", dayOfWeek: "Wed", workouts: [] },
          { date: "2026-05-28", dayOfWeek: "Thu", workouts: [] },
          { date: "2026-05-29", dayOfWeek: "Fri", workouts: [] },
          {
            date: "2026-05-30",
            dayOfWeek: "Sat",
            workouts: [{
              id: "w-final-may-30",
              sport: "Run",
              type: "Long Run",
              name: "May 30 long run",
              durationMinutes: 120,
              distanceKm: 24,
              primaryZone: "Z2",
              completed: false,
            }],
          },
          { date: "2026-05-31", dayOfWeek: "Sun", workouts: [] },
        ],
      },
    ];

    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: {
          ...SAMPLE_HIERARCHICAL_PLAN,
          plan_data: {
            ...SAMPLE_HIERARCHICAL_PLAN.plan_data,
            weeks: extendedWeeks,
          },
        },
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    expect(screen.getByText(/May 30 long run/i)).toBeInTheDocument();
    expect(screen.getByText(/30\. mai/i)).toBeInTheDocument();
    expect(screen.getByText(/13 uker/i)).toBeInTheDocument();
    expect(document.querySelector(".plan-grid-scroll.full-plan")).toBeInTheDocument();
  });

  it("expands the Training Plan week grid into a focused full-height view", () => {
    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    expect(screen.getByText(/Fasestruktur/i)).toBeInTheDocument();
    expect(screen.getByText(/Løpsplan/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Utvid ukeplan/i }));

    expect(document.querySelector(".plan-workspace.week-plan-expanded")).toBeInTheDocument();
    expect(document.querySelector(".plan-grid-scroll.expanded")).toBeInTheDocument();
    expect(screen.queryByText(/Fasestruktur/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Løpsplan/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Hill reps/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Neste 8 uker/i }));
    expect(document.querySelector(".plan-workspace.week-plan-expanded")).toBeInTheDocument();
    expect(document.querySelector(".plan-grid-scroll.expanded")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lukk utvidet visning/i }));

    expect(document.querySelector(".plan-workspace.week-plan-expanded")).not.toBeInTheDocument();
    expect(screen.getByText(/Fasestruktur/i)).toBeInTheDocument();
    expect(screen.getByText(/Løpsplan/i)).toBeInTheDocument();
  });

  it("keeps the race strategy panel collapsed by default and expands it on demand", () => {
    const longRaceStrategy = {
      event: {
        name: "Soria Moria til Verdens Ende 50 miles",
        distance: "50 miles",
        type: "Trail ultra",
        date: "2026-05-30",
      },
      keyTactics: [
        "Start controlled through the opening climbs and avoid chasing early groups.",
        "Keep effort capped on technical descents so the quads are usable after halfway.",
        "Use every aid station as a short checklist for bottles, calories, salt, and clothing.",
        "Commit to power-hike steep grades before effort drifts above sustainable ultra intensity.",
        "Reassess stomach and feet before the final third rather than waiting for problems.",
      ],
      pacing: "Run the opening 20 km at conversational effort, settle into durable climbing rhythm, and only increase effort after the last major aid station if fueling and legs are stable.",
      fueling: "Aim for 70-85 grams carbohydrate per hour, alternate drink mix and solid food, and carry an emergency gel reserve for the exposed late section.",
      terrain: "Prioritize traction, hiking efficiency, and downhill control. Expect rolling forest trails, exposed coastline, and fatigue-sensitive technical footing late in the race.",
    };

    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: {
          ...SAMPLE_HIERARCHICAL_PLAN,
          plan_data: {
            ...SAMPLE_HIERARCHICAL_PLAN.plan_data,
            raceStrategy: longRaceStrategy,
          },
        },
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    expect(screen.getByText(/Løpsplan · Soria Moria til Verdens Ende 50 miles/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-30/i)).toBeInTheDocument();
    expect(screen.queryByText(/Use every aid station/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prioritize traction/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Vis løpsplan/i }));

    expect(document.querySelector(".race-strategy-panel.expanded")).toBeInTheDocument();
    expect(document.querySelector(".race-strategy-body.expanded")).toBeInTheDocument();
    expect(screen.getByText(/Use every aid station/i)).toBeInTheDocument();
    expect(screen.getByText(/Prioritize traction/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Skjul løpsplan/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Skjul løpsplan/i }));

    expect(document.querySelector(".race-strategy-panel.expanded")).not.toBeInTheDocument();
    expect(screen.queryByText(/Use every aid station/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vis løpsplan/i })).toBeInTheDocument();
  });

  it("calculates Training Plan weekly totals from current workouts instead of stale week summaries", () => {
    const staleWeek = {
      ...SAMPLE_HIERARCHICAL_PLAN.plan_data.weeks[0],
      summary: { totalHours: 99, totalKm: 999, sessions: 99 },
    };

    state.appData = {
      ...state.appData,
      hierarchicalPlan: {
        ...state.appData.hierarchicalPlan,
        plan: {
          ...SAMPLE_HIERARCHICAL_PLAN,
          plan_data: {
            ...SAMPLE_HIERARCHICAL_PLAN.plan_data,
            weeks: [staleWeek],
          },
        },
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Treningsplan/i }));

    const weekRow = screen.getByText("W1").closest("tr");
    expect(within(weekRow).getByText("48")).toBeInTheDocument();
    expect(within(weekRow).queryByText("999")).not.toBeInTheDocument();
  });

  it("shows the race map above the completed-races table and keeps career analysis visible", () => {
    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Løpssenter/i }));

    const raceMap = screen.getByRole("region", { name: /Løpskart/i });
    const resultsTitle = screen.getByText(/Løpsresultater — alle målganger/i);
    const raceCenterScroll = document.querySelector(".race-center-scroll");

    expect(raceMap).toBeInTheDocument();
    expect(resultsTitle).toBeInTheDocument();
    expect(raceCenterScroll).toContainElement(raceMap);
    expect(raceCenterScroll).toContainElement(resultsTitle);
    expect(raceCenterScroll).toContainElement(screen.getByText(/Karriereanalyse/i));
    expect(raceMap.compareDocumentPosition(resultsTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Karriereanalyse/i)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^2025.*målgang/i })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^2024.*målgang/i })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /^2023.*målgang/i })).toBeInTheDocument();
    const doneTable = resultsTitle.closest(".e-panel").querySelector("table");
    expect(within(doneTable).getAllByText(/Boston Marathon/i).length).toBeGreaterThan(0);
    expect(within(doneTable).getByText(/Berlin Marathon/i)).toBeInTheDocument();
  });

  it("switches dream-race map and table content from the toolbar without map filter buttons", () => {
    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Løpssenter/i }));

    expect(screen.getByTestId("race-leaflet-map")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Alle$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Gjennomført$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Bucket list$/i })).not.toBeInTheDocument();

    const initialMarkers = screen.getAllByTestId("race-map-marker");
    expect(initialMarkers).toHaveLength(2);
    expect(initialMarkers.map((marker) => marker.textContent).join(" ")).toMatch(/Boston Marathon/i);
    expect(initialMarkers.map((marker) => marker.textContent).join(" ")).toMatch(/Berlin Marathon/i);
    expect(initialMarkers.map((marker) => marker.textContent).join(" ")).not.toMatch(/Western States 100/i);

    fireEvent.click(screen.getByRole("button", { name: /Drømmeløp/i }));

    expect(screen.getByText(/Karriereanalyse/i)).toBeInTheDocument();
    expect(screen.getByText(/Kart · Drømmeløp/i)).toBeInTheDocument();
    const dreamTable = screen.getByText(/Mål- og drømmeløp/i).closest(".e-panel").querySelector("table");
    expect(within(dreamTable).getByText(/Western States 100/i)).toBeInTheDocument();
    expect(within(dreamTable).queryByText(/Boston Marathon/i)).not.toBeInTheDocument();
    expect(within(dreamTable).queryByText(/Berlin Marathon/i)).not.toBeInTheDocument();

    const dreamMarkers = screen.getAllByTestId("race-map-marker");
    expect(dreamMarkers).toHaveLength(1);
    expect(dreamMarkers[0].textContent).toMatch(/Western States 100/i);
    expect(dreamMarkers[0].textContent).not.toMatch(/Berlin Marathon/i);
  });

  it("opens Strava details when selecting a completed race from the map", async () => {
    const client = { functions: { invoke: vi.fn() }, auth: { refreshSession: vi.fn() } };
    edgeInvoke.mockResolvedValue({
      data: {
        description: "Race activity from Strava",
        stats: {
          average_speed: 3.5,
          average_heartrate: 151,
          max_heartrate: 174,
          calories: 2400,
        },
        splits: [
          { split: 1, average_speed: 3.4, average_heartrate: 148, elevation_difference: 2 },
          { split: 2, average_speed: 3.6, average_heartrate: 153, elevation_difference: -1 },
          { split: 3, average_speed: 3.55, average_heartrate: 155, elevation_difference: 0 },
          { split: 4, average_speed: 3.7, average_heartrate: 158, elevation_difference: 4 },
        ],
      },
      error: null,
    });
    state.appData = {
      ...state.appData,
      auth: {
        ...state.appData.auth,
        client,
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Løpssenter/i }));
    fireEvent.click(screen.getAllByTestId("race-map-marker")[0]);

    const raceCenterBody = document.querySelector(".race-center-body");
    const raceCenterScroll = document.querySelector(".race-center-scroll");
    const raceDetailPanel = document.querySelector(".race-detail-panel");
    expect(raceCenterBody).toContainElement(raceCenterScroll);
    expect(raceCenterBody).toContainElement(raceDetailPanel);
    expect(raceCenterScroll).not.toContainElement(raceDetailPanel);

    expect(await screen.findByText(/Race activity from Strava/i)).toBeInTheDocument();
    expect(edgeInvoke).toHaveBeenCalledWith(client, "strava-activity-detail", {
      body: { activity_id: "12345678" },
    });
    expect(screen.getByRole("link", { name: /Åpne i Strava/i })).toHaveAttribute(
      "href",
      "https://www.strava.com/activities/12345678",
    );
  });

  it("scopes race-map sizing so legacy global map styles cannot hide the results table", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/styles/controlCenter.css"), "utf8");

    expect(css).toMatch(/\.rs-cc \.race-center-scroll > \*\s*{[^}]*flex-shrink:\s*0;/s);
    expect(css).toMatch(/\.rs-cc \.race-map\s*{[^}]*display:\s*block;/s);
    expect(css).toMatch(/\.rs-cc \.race-map\s*{[^}]*padding:\s*0;/s);
    expect(css).toMatch(/\.rs-cc \.race-map__frame\s*{[^}]*min-height:\s*0;/s);
    expect(css).toMatch(/\.rs-cc \.race-map__container,[\s\S]*?\.leaflet-container\s*{[^}]*min-height:\s*0;/s);
  });

  it("switches between modules without throwing", () => {
    render(<ControlCenterPage />);
    for (const label of ["Treningsplan", "Coaching", "Løpssenter", "Dagslogg", "AI-trener", "Oversikt"]) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(label, "i") }));
    }
  });

  it("loads and renders daily log entries", async () => {
    const loadLogs = vi.fn().mockResolvedValue(SAMPLE_DAILY_LOGS);
    state.appData = {
      ...state.appData,
      dailyLogs: {
        logs: SAMPLE_DAILY_LOGS,
        loading: false,
        error: null,
        loadLogs,
        saveLog: vi.fn(),
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Dagslogg/i }));

    expect(await screen.findByText(/Siste oppføringer/i)).toBeInTheDocument();
    expect(screen.getByText(/12km easy run/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Hviledag/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/3 oppføringer loggført/i)).toBeInTheDocument();
    expect(loadLogs).not.toHaveBeenCalled();
  });

  it("saves a rest-day daily log with training fields cleared", async () => {
    const loadLogs = vi.fn().mockResolvedValue([]);
    const saveLog = vi.fn().mockResolvedValue({ id: "new-log", log_date: "2026-04-24" });
    state.appData = {
      ...state.appData,
      dailyLogs: {
        logs: [],
        loading: false,
        error: null,
        loadLogs,
        saveLog,
      },
    };

    render(<ControlCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /Dagslogg/i }));
    const formPanel = screen.getByText("Treningskvalitet").closest(".left-panel");

    await waitFor(() => expect(loadLogs).toHaveBeenCalledTimes(1));
    fireEvent.click(within(formPanel).getByRole("button", { name: /Hviledag/i }));

    expect(screen.getByLabelText(/Treningskvalitet/i)).toBeDisabled();
    expect(screen.getByLabelText(/Øktnotater/i)).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Søvntimer/i), { target: { value: "7.5" } });
    fireEvent.click(within(formPanel).getAllByRole("button", { name: "4", exact: true })[1]);
    fireEvent.click(screen.getByRole("button", { name: /Lagre logg/i }));

    await waitFor(() => expect(saveLog).toHaveBeenCalledTimes(1));
    expect(saveLog).toHaveBeenCalledWith(expect.objectContaining({
      training_quality: null,
      workout_notes: "",
      sleep_hours: 7.5,
    }));
    expect(await screen.findByRole("button", { name: /Lagret/i })).toBeInTheDocument();
  });
});
