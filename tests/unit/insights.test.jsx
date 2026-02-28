/**
 * Insights page tests
 *
 * Verifies that InsightsPage presents analytics derived from Strava activity
 * data stored in the Supabase `activities` table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import InsightsPage from "../../src/pages/InsightsPage";
import { makeAppData, SAMPLE_ACTIVITIES } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Insights — page structure", () => {
  it("renders the page heading", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<InsightsPage />);
    expect(screen.getByRole("heading", { name: /Training analysis/i })).toBeInTheDocument();
  });
});

describe("Insights — empty state (no Strava data)", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
    }));
  });

  it("shows 'No training data yet' empty-state message", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/No training data yet/i)).toBeInTheDocument();
  });

  it("shows Connect Strava button when there is no data", () => {
    render(<InsightsPage />);
    expect(screen.getByRole("button", { name: /Connect Strava/i })).toBeInTheDocument();
  });
});

describe("Insights — loading state", () => {
  it("renders skeleton blocks while loading", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: true, error: null, loadActivities: vi.fn() },
    }));

    const { container } = render(<InsightsPage />);
    // Skeleton blocks are rendered as divs with the skeleton-block class
    const skeletons = container.querySelectorAll(".skeleton-block");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("Insights — with Strava data", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders the KPI strip with four cards", () => {
    render(<InsightsPage />);
    const kpiCards = document.querySelectorAll(".kpi-card");
    expect(kpiCards.length).toBe(4);
  });

  it("shows 'This week' KPI with a km value", () => {
    render(<InsightsPage />);
    expect(screen.getByText("This week")).toBeInTheDocument();
    // Should show a distance in km
    const kpiStrip = document.querySelector(".kpi-strip");
    expect(kpiStrip).toHaveTextContent(/km/i);
  });

  it("shows 'Training load' KPI (CTL)", () => {
    render(<InsightsPage />);
    expect(screen.getByText("Training load")).toBeInTheDocument();
    // "Chronic load (CTL)" appears in both the KPI note and the fitness-level section;
    // use getAllByText so the assertion is not sensitive to how many matches exist.
    expect(screen.getAllByText(/Chronic load \(CTL\)/i).length).toBeGreaterThan(0);
  });

  it("shows 'Consistency' KPI with weeks/runs indicator", () => {
    render(<InsightsPage />);
    expect(screen.getByText("Consistency")).toBeInTheDocument();
    expect(screen.getByText(/Weeks with runs/i)).toBeInTheDocument();
  });

  it("shows 'Readiness' KPI with a Fresh/Neutral/Fatigued label", () => {
    render(<InsightsPage />);
    // "Readiness" appears in both the KPI label and the insight-summary stats section
    const readinessLabels = screen.getAllByText("Readiness");
    expect(readinessLabels.length).toBeGreaterThan(0);
    const readinessValues = screen.queryAllByText(/Fresh|Neutral|Fatigued/i);
    expect(readinessValues.length).toBeGreaterThan(0);
  });

  it("renders the fitness level meter section", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/Fitness level/i)).toBeInTheDocument();
    const meter = document.querySelector(".fitness-meter");
    expect(meter).toBeInTheDocument();
  });

  it("shows the insight summary section", () => {
    render(<InsightsPage />);
    expect(screen.getByText(/Form trend/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk score/i)).toBeInTheDocument();
  });
});

describe("Insights — with enough data for charts", () => {
  it("renders the fitness meter fill width reflecting CTL score", () => {
    // Build 14 days of consistent runs so CTL is non-zero
    const richActivities = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        id: `a-${i}`,
        user_id: "user-1",
        name: `Run ${i}`,
        type: "Run",
        started_at: d.toISOString(),
        distance: 10000,
        moving_time: 3600,
        average_speed: 2.78,
        elevation_gain: 50,
      };
    });

    useAppData.mockReturnValue(makeAppData({
      activities: { activities: richActivities, loading: false, error: null, loadActivities: vi.fn() },
    }));

    render(<InsightsPage />);
    const fill = document.querySelector(".fitness-meter__fill");
    expect(fill).toBeInTheDocument();
    // width style should be set (non-zero CTL → non-zero fitness score)
    expect(fill.style.width).not.toBe("0%");
  });
});
