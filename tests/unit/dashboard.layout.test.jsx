/**
 * Dashboard layout smoke tests
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

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button type="button">{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>,
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
  it("renders Total Distance KPI card", () => {
    render(<HeroPage />);
    expect(screen.getByText("Total Distance")).toBeInTheDocument();
  });

  it("renders Active Time KPI card", () => {
    render(<HeroPage />);
    expect(screen.getAllByText(/Active Time/i).length).toBeGreaterThan(0);
  });

  it("renders Sessions KPI card", () => {
    render(<HeroPage />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders Avg. Pace KPI card", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Avg\. Pace/i)).toBeInTheDocument();
  });

  it("all KPI cards are inside the PageContainer", () => {
    const { container } = render(<HeroPage />);
    const wrapper = container.querySelector(".max-w-7xl");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveTextContent("Total Distance");
    expect(wrapper).toHaveTextContent("Active Time");
  });
});

describe("Dashboard layout — Weekly Progression section", () => {
  it("renders the Weekly Progression section heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Weekly Progression/i)).toBeInTheDocument();
  });
});

describe("Dashboard layout — Activities table", () => {
  it("renders the Activity History section heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Activity History/i)).toBeInTheDocument();
  });

  it("renders the activities table with row data", () => {
    render(<HeroPage />);
    const table = screen.getByRole("table", { name: /strava activity history/i });
    expect(table).toBeInTheDocument();
    // Activities appear in multiple places; use getAllByText
    expect(screen.getAllByText("Morning Run").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tempo Tuesday").length).toBeGreaterThan(0);
  });

  it("shows Effort badges from heart_rate_zones data", () => {
    render(<HeroPage />);
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
    expect(screen.getAllByText(/no activities for this period/i).length).toBeGreaterThan(0);
  });
});
