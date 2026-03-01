/**
 * Dashboard (HeroPage) tests
 *
 * Verifies that the main dashboard correctly displays data that originates
 * from Strava activities stored in the Supabase `activities` table.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroPage from "../../src/pages/HeroPage";
import { makeAppData, SAMPLE_ACTIVITIES } from "./mockAppData";

// Mock the context so we can inject controlled data without hitting Supabase
vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

// Render shadcn Select as a native <select> so tests can use .options
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

// Stub Tabs so the Overview tab content is always visible (no click needed)
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button type="button">{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>,
}));

import { useAppData } from "../../src/context/AppDataContext";

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

describe("Dashboard — KPI metrics", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders Total Distance KPI card", () => {
    render(<HeroPage />);
    expect(screen.getByText("Total Distance")).toBeInTheDocument();
    expect(screen.getAllByText(/km/i).length).toBeGreaterThan(0);
  });

  it("shows Active Time KPI in hours or minutes", () => {
    render(<HeroPage />);
    expect(screen.getAllByText(/Active Time/i).length).toBeGreaterThan(0);
  });

  it("shows Sessions KPI counting workouts", () => {
    render(<HeroPage />);
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("shows Avg. Pace KPI", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Avg\. Pace/i)).toBeInTheDocument();
  });

  it("shows Readiness KPI as a percentage", () => {
    render(<HeroPage />);
    const readinessLabels = screen.getAllByText(/Readiness/i);
    expect(readinessLabels.length).toBeGreaterThan(0);
  });

  it("shows Elevation Gain KPI", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Elevation Gain/i)).toBeInTheDocument();
  });
});

describe("Dashboard — activity history table", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("shows Activity History section heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Activity History/i)).toBeInTheDocument();
  });

  it("lists recent activities by name in the history table", () => {
    render(<HeroPage />);
    expect(screen.getAllByText("Morning Run").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tempo Tuesday").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Long Run Sunday").length).toBeGreaterThan(0);
  });

  it("shows duration formatted as H:MM:SS in the table", () => {
    render(<HeroPage />);
    // Morning Run: 3120s → 0:52:00
    expect(screen.getByText("0:52:00")).toBeInTheDocument();
    // Tempo Tuesday: 2160s → 0:36:00
    expect(screen.getByText("0:36:00")).toBeInTheDocument();
  });

  it("shows 2:00:00 for long run with 7200s moving time", () => {
    render(<HeroPage />);
    // Long Run Sunday: moving_time 7200s → 2:00:00
    expect(screen.getByText("2:00:00")).toBeInTheDocument();
  });

  it("shows Add Activity and View All buttons", () => {
    render(<HeroPage />);
    expect(screen.getByRole("button", { name: /Add Activity/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /View All/i }).length).toBeGreaterThan(0);
  });
});

describe("Dashboard — Workout Breakdown section", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("shows Workout Breakdown heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Workout Breakdown/i)).toBeInTheDocument();
  });

  it("shows workout type breakdown for sample activities", () => {
    render(<HeroPage />);
    // SAMPLE_ACTIVITIES are all type "Run" → should show "Run" in breakdown
    expect(screen.getAllByText(/Run/i).length).toBeGreaterThan(0);
  });
});

describe("Dashboard — Weekly Progress section", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("shows Weekly Progression heading", () => {
    render(<HeroPage />);
    expect(screen.getByText(/Weekly Progression/i)).toBeInTheDocument();
  });

  it("shows completed and planned km summary pills", () => {
    render(<HeroPage />);
    // Use selector:'span' to avoid matching parent containers
    expect(screen.getByText(/completed/i, { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText(/planned/i, { selector: "span" })).toBeInTheDocument();
  });
});

describe("Dashboard — empty state (no Strava data)", () => {
  it("shows empty state message when there are no activities and no workout entries", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
      workoutEntries: { entries: [], loading: false, loadEntriesForWeek: vi.fn().mockResolvedValue([]) },
    }));

    render(<HeroPage />);
    expect(screen.getByText(/No workout data for this week/i)).toBeInTheDocument();
  });
});

describe("Dashboard — Weekly Progress empty state", () => {
  it("shows empty state when no activities and no workout entries", () => {
    useAppData.mockReturnValue(makeAppData({
      activities: { activities: [], loading: false, error: null, loadActivities: vi.fn() },
      workoutEntries: { entries: [], loading: false, loadEntriesForWeek: vi.fn().mockResolvedValue([]) },
    }));
    render(<HeroPage />);
    expect(screen.getByText(/No workout data for this week/i)).toBeInTheDocument();
  });
});

describe("Dashboard — filter controls", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("has Week and Month date filter buttons", () => {
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

    const controls = screen.getByRole("group", { name: /Dashboard filters/i });
    const monthChip = within(controls).getByRole("button", { name: "Month" });
    await user.click(monthChip);
    expect(monthChip).toHaveAttribute("aria-pressed", "true");
  });
});
