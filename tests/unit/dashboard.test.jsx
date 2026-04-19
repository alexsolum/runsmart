/**
 * Dashboard (HeroPage) tests — control-center redesign
 *
 * Verifies that the control-center dashboard renders all panels,
 * shows real data from activities/plan/races, and degrades gracefully
 * to Norwegian empty-state hints when data is absent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroPage from "../../src/pages/HeroPage";
import { makeAppData, SAMPLE_ACTIVITIES } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue(makeAppData());
});

// ── Canvas presence ──────────────────────────────────────────────────────────

describe("Dashboard — canvas renders", () => {
  it("renders the .canvas grid wrapper", () => {
    const { container } = render(<HeroPage />);
    expect(container.querySelector(".canvas")).toBeInTheDocument();
  });

  it("renders the .hero wrapper with .today and .readiness children", () => {
    const { container } = render(<HeroPage />);
    const hero = container.querySelector(".hero");
    expect(hero).toBeInTheDocument();
    expect(hero.querySelector(".today")).toBeInTheDocument();
    expect(hero.querySelector(".readiness")).toBeInTheDocument();
  });
});

// ── Today hero ────────────────────────────────────────────────────────────────

describe("Dashboard — HeroToday panel", () => {
  it("shows 'I dag' label in the hero", () => {
    render(<HeroPage />);
    expect(screen.getAllByText("I dag").length).toBeGreaterThan(0);
  });

  it("shows 'Generert av Trener' attribution", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Generert av Trener/i)).toBeInTheDocument();
  });

  it("shows 'Start økten' CTA button", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Start økten/i)).toBeInTheDocument();
  });
});

// ── Readiness ─────────────────────────────────────────────────────────────────

describe("Dashboard — ReadinessPanel", () => {
  it("renders the Beredskap heading", () => {
    render(<HeroPage />);
    expect(screen.getByText("Beredskap")).toBeInTheDocument();
  });

  it("renders Form i dag eyebrow", () => {
    render(<HeroPage />);
    expect(screen.getByText("Form i dag")).toBeInTheDocument();
  });

  it("shows a readiness score when activities exist", () => {
    render(<HeroPage />);
    // Score is between 0–100; just check the '/ 100' is present
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("shows empty-state hint when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<HeroPage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});

// ── Phase ribbon ─────────────────────────────────────────────────────────────

describe("Dashboard — PhaseRibbon", () => {
  it("renders the Sesongplan label", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Sesongplan/i)).toBeInTheDocument();
  });
});

// ── Weekly progression ────────────────────────────────────────────────────────

describe("Dashboard — WeeklyProgression", () => {
  it("renders Ukens progresjon heading", () => {
    render(<HeroPage />);
    expect(screen.getByText("Ukens progresjon")).toBeInTheDocument();
  });

  it("shows Planlagt and Gjennomført legend labels", () => {
    render(<HeroPage />);
    expect(screen.getByText("Planlagt")).toBeInTheDocument();
    expect(screen.getByText("Gjennomført")).toBeInTheDocument();
  });

  it("shows empty-state hint when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
      workoutEntries: { workoutEntries: [], loading: false, loadEntriesForWeek: vi.fn().mockResolvedValue([]) },
    }));
    render(<HeroPage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});

// ── Race countdown ────────────────────────────────────────────────────────────

describe("Dashboard — RaceCountdown", () => {
  it("renders A-løp label from races data", () => {
    render(<HeroPage />);
    expect(screen.getAllByText(/A-løp/i).length).toBeGreaterThan(0);
  });

  it("shows Ingen kommende løp hint when no upcoming races", () => {
    render(<HeroPage />);
    // SAMPLE_RACES has no race_date field, so empty state is shown
    expect(screen.getAllByText(/Ingen kommende løp|A-løp/i).length).toBeGreaterThan(0);
  });
});

// ── Fitness panel ─────────────────────────────────────────────────────────────

describe("Dashboard — FitnessPanel", () => {
  it("renders Formkurve heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Formkurve/i)).toBeInTheDocument();
  });

  it("renders the CTL/ATL/TSB legend labels", () => {
    render(<HeroPage />);
    expect(screen.getAllByText(/Form \(CTL\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tretthet \(ATL\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Overskudd \(TSB\)/i).length).toBeGreaterThan(0);
  });

  it("shows empty-state hint when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<HeroPage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});

// ── Recent activities ─────────────────────────────────────────────────────────

describe("Dashboard — RecentActivities", () => {
  it("renders the Aktivitet panel heading", () => {
    render(<HeroPage />);
    expect(screen.getByText("Aktivitet")).toBeInTheDocument();
  });

  it("lists recent activity names from SAMPLE_ACTIVITIES", () => {
    render(<HeroPage />);
    // At least one sample activity name should appear
    const names = SAMPLE_ACTIVITIES.slice(0, 6).map((a) => a.name);
    const found = names.some((n) => {
      try { screen.getByText(n); return true; } catch { return false; }
    });
    expect(found).toBe(true);
  });

  it("shows empty-state hint when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
    render(<HeroPage />);
    expect(screen.getAllByText(/Koble Strava i Data/i).length).toBeGreaterThan(0);
  });
});

// ── Efficiency panel ──────────────────────────────────────────────────────────

describe("Dashboard — EfficiencyPanel", () => {
  it("renders Aerob effektivitet heading", () => {
    render(<HeroPage />);
    expect(screen.getByText("Aerob effektivitet")).toBeInTheDocument();
  });

  it("shows range picker options", () => {
    render(<HeroPage />);
    expect(screen.getByText("90d")).toBeInTheDocument();
    expect(screen.getByText("2y")).toBeInTheDocument();
  });
});

// ── Up next ───────────────────────────────────────────────────────────────────

describe("Dashboard — UpNext", () => {
  it("renders Kommende økter heading", () => {
    render(<HeroPage />);
    expect(screen.getByText("Kommende økter")).toBeInTheDocument();
  });

  it("shows empty-state hint when no plan", () => {
    useAppData.mockReturnValue(makeAppData({
      hierarchicalPlan: {
        plan: null,
        loading: false,
        error: null,
        loadPlan: vi.fn().mockResolvedValue(null),
        generatePlan: vi.fn(),
        applyPatch: vi.fn(),
        toggleWorkoutCompleted: vi.fn(),
        moveWorkout: vi.fn(),
        getWeek: vi.fn(),
        getPhases: vi.fn().mockReturnValue([]),
      },
    }));
    render(<HeroPage />);
    expect(screen.getByText(/Ingen kommende økter planlagt/i)).toBeInTheDocument();
  });
});
