/**
 * Dashboard (HeroPage) tests
 *
 * Verifies that the main dashboard correctly displays data that originates
 * from Strava activities stored in the Supabase `activities` table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroPage from "../src/pages/HeroPage";
import { makeAppData, SAMPLE_ACTIVITIES } from "./mockAppData";

// Mock the context so we can inject controlled data without hitting Supabase
vi.mock("../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  // Stub localStorage to avoid state bleed between tests
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

describe("Dashboard — loading state", () => {
  it("shows skeleton UI while activities are loading", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: true, error: null, loadActivities: vi.fn() },
    }));

    const { container } = render(<HeroPage />);
    expect(container.querySelector(".is-loading")).toBeInTheDocument();
  });
});

describe("Dashboard — error state", () => {
  it("shows error message when activity data cannot be loaded", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: { message: "Network error" }, loadActivities: vi.fn() },
    }));

    render(<HeroPage />);
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });
});

describe("Dashboard — Strava data display", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders four KPI metric cards", () => {
    render(<HeroPage />);
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    // Each KPI is an <article> inside the kpis section
    const cards = kpiSection.querySelectorAll(".dashboard-kpi");
    expect(cards.length).toBe(4);
  });

  it("shows Weekly Distance KPI populated from Strava activities", () => {
    render(<HeroPage />);
    // At least one KPI should show a km value derived from the sample activities
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    expect(kpiSection).toHaveTextContent(/km/i);
  });

  it("shows Training Load KPI in minutes", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Training Load/i)).toBeInTheDocument();
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    expect(kpiSection).toHaveTextContent(/min/i);
  });

  it("shows Consistency KPI counting sessions", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Consistency/i)).toBeInTheDocument();
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    expect(kpiSection).toHaveTextContent(/sessions/i);
  });

  it("shows Readiness KPI as a percentage", () => {
    render(<HeroPage />);
    // "Readiness" label appears in the KPI cards; use getAllByText to avoid "multiple elements" error
    const readinessLabels = screen.getAllByText(/Readiness/i);
    expect(readinessLabels.length).toBeGreaterThan(0);
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    expect(kpiSection).toHaveTextContent(/%/i);
  });

  it("renders activity feed in the sidebar", () => {
    render(<HeroPage />);
    const rail = screen.getByRole("complementary", { name: /recent activity stream/i });
    expect(rail).toBeInTheDocument();
  });

  it("lists recent activities by name from Strava", () => {
    render(<HeroPage />);
    // SAMPLE_ACTIVITIES — "Morning Run" and "Tempo Tuesday" are timestamped today;
    // "Long Run Sunday" is 4 days ago. All three fall within the "Week" timeline filter.
    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.getByText("Tempo Tuesday")).toBeInTheDocument();
    expect(screen.getByText("Long Run Sunday")).toBeInTheDocument();
  });

  it("displays Workout Mix section", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Workout Mix/i)).toBeInTheDocument();
  });

  it("displays Fatigue & Form section", () => {
    render(<HeroPage />);
    // Use heading role to target the h3, not the "Fatigue-adjusted" KPI helper text
    expect(screen.getByRole("heading", { name: /Fatigue/i })).toBeInTheDocument();
  });

  it("shows Training Trend chart with overlay controls", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Training Trend/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Distance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Load/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pace/i })).toBeInTheDocument();
  });

  it("greets the authenticated athlete by username", () => {
    render(<HeroPage />);
    // Username is derived from email "athlete@example.com" → "athlete"
    expect(screen.getByText(/Welcome back, athlete/i)).toBeInTheDocument();
  });
});

describe("Dashboard — empty state (no Strava data)", () => {
  it("shows empty state message when there are no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<HeroPage />);
    expect(screen.getByText(/No trend data for this period/i)).toBeInTheDocument();
  });
});

describe("Dashboard — filter controls", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("has Week and Month date filter chips", () => {
    render(<HeroPage />);
    const controls = screen.getByRole("group", { name: /Dashboard filters/i });
    expect(controls).toHaveTextContent("Week");
    expect(controls).toHaveTextContent("Month");
  });

  it("has workout type filter select with All/Run/Ride/Workout options", () => {
    render(<HeroPage />);
    const typeSelect = screen.getByRole("combobox", { name: /Workout type filter/i });
    expect(typeSelect).toBeInTheDocument();
    const options = Array.from(typeSelect.options).map((o) => o.value);
    expect(options).toContain("All");
    expect(options).toContain("Run");
    expect(options).toContain("Ride");
    expect(options).toContain("Workout");
  });

  it("changes active date filter when chip is clicked", async () => {
    const user = userEvent.setup();
    render(<HeroPage />);

    // Scope to the dashboard controls group to avoid matching the "Month" timeline button
    const controls = screen.getByRole("group", { name: /Dashboard filters/i });
    const monthChip = within(controls).getByRole("button", { name: "Month" });
    await user.click(monthChip);
    expect(monthChip).toHaveAttribute("aria-pressed", "true");
  });

  it("has timeline filter chips (Today / Week / Month) in the activity feed", () => {
    render(<HeroPage />);
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    // "Week" appears in multiple places; the activity sidebar also uses it
    const weekButtons = screen.getAllByRole("button", { name: "Week" });
    expect(weekButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("filters activity feed by search term", async () => {
    const user = userEvent.setup();
    render(<HeroPage />);

    const searchInput = screen.getByRole("searchbox", { name: /search recent activity/i });
    await user.type(searchInput, "Tempo");

    expect(screen.getByText("Tempo Tuesday")).toBeInTheDocument();
    expect(screen.queryByText("Morning Run")).not.toBeInTheDocument();
  });
});
