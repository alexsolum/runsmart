/**
 * Dashboard layout smoke tests (TASK-009)
 *
 * Verifies that the structural layout components render correctly:
 * KPI cards, Weekly Progression chart, and Activities table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroPage from "../../src/pages/HeroPage";
import { makeAppData } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, "aria-label": ariaLabel }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
  useAppData.mockReturnValue(makeAppData());
});

describe("Dashboard layout — KPI cards", () => {
  it("renders six KPI metric cards in the overview section", () => {
    render(<HeroPage />);
    const kpiSection = screen.getByRole("region", { name: /weekly metrics/i });
    const cards = kpiSection.querySelectorAll(".dashboard-kpi");
    expect(cards.length).toBe(6);
  });

  it("all KPI cards are inside the PageContainer", () => {
    const { container } = render(<HeroPage />);
    // PageContainer renders a max-w-7xl wrapper
    const wrapper = container.querySelector(".max-w-7xl");
    expect(wrapper).toBeInTheDocument();
    const kpis = wrapper.querySelectorAll(".dashboard-kpi");
    expect(kpis.length).toBe(6);
  });
});

describe("Dashboard layout — Weekly Progression section", () => {
  it("renders the Weekly Progression section heading", () => {
    render(<HeroPage />);
    expect(screen.getByRole("heading", { name: /weekly progression/i })).toBeInTheDocument();
  });

  it("renders the Weekly Progression section heading", () => {
    render(<HeroPage />);
    // Section renders an <h2>; use heading role to avoid matching CardTitle div
    const headings = screen.getAllByRole("heading", { name: /weekly progression/i });
    expect(headings.length).toBeGreaterThan(0);
  });
});

describe("Dashboard layout — Activities table", () => {
  it("renders the Latest Activities section heading", () => {
    render(<HeroPage />);
    expect(screen.getByRole("heading", { name: /latest activities/i })).toBeInTheDocument();
  });

  it("renders the activities table with row data", () => {
    render(<HeroPage />);
    const table = screen.getByRole("table", { name: /strava activity history/i });
    expect(table).toBeInTheDocument();
    // Sample activities contain these names
    expect(screen.getByText("Morning Run")).toBeInTheDocument();
    expect(screen.getByText("Tempo Tuesday")).toBeInTheDocument();
  });

  it("shows Effort badges from heart_rate_zones data", () => {
    render(<HeroPage />);
    // Both Morning Run and Tempo Tuesday have heavy z4/z5 → Hard badges
    const hardBadges = screen.getAllByText("Hard");
    expect(hardBadges.length).toBeGreaterThan(0);
  });
});

describe("Dashboard layout — empty state", () => {
  it("shows empty activities message when no activities", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
      workoutEntries: { entries: [], loading: false, loadEntriesForWeek: vi.fn().mockResolvedValue([]) },
    }));
    render(<HeroPage />);
    expect(screen.getByText(/no activities for this period/i)).toBeInTheDocument();
  });
});
