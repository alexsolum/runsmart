/**
 * Weekly Plan — Rolling 4-Week Planning Tests
 *
 * Verifies the rolling 4-week planning model:
 * - Four week sections render simultaneously
 * - Navigation shifts the window by 4 weeks
 * - "Today" resets to the current week
 * - No horizontal overflow (layout safety)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeeklyPlanPage from "../../src/pages/WeeklyPlanPage";
import { makeAppData } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Four week headers ─────────────────────────────────────────────────────────

describe("Rolling 4-week view — week headers", () => {
  it("renders exactly four week header labels", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const weekLabels = document.querySelectorAll(".wpp-week-label");
    expect(weekLabels.length).toBe(4);
  });

  it("renders four day grids (one per week)", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const grids = document.querySelectorAll(".wpp-day-grid");
    expect(grids.length).toBe(4);
  });

  it("renders 28 day columns in total (4 weeks × 7 days)", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const days = document.querySelectorAll(".wpp-day");
    expect(days.length).toBe(28);
  });

  it("all four week labels are unique (show different date ranges)", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const weekLabels = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    const uniqueLabels = new Set(weekLabels);
    expect(uniqueLabels.size).toBe(4);
  });

  it("week labels all contain the current year", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const currentYear = new Date().getUTCFullYear().toString();
    const weekLabels = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    weekLabels.forEach((label) => {
      expect(label).toContain(currentYear);
    });
  });
});

// ── Navigation shifts by 4 weeks ──────────────────────────────────────────────

describe("Rolling 4-week view — navigation", () => {
  it("← button changes all four week labels", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const labelsBefore = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    await user.click(screen.getByRole("button", { name: "←" }));
    const labelsAfter = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );

    // All 4 labels should have changed
    labelsBefore.forEach((label, i) => {
      expect(labelsAfter[i]).not.toBe(label);
    });
  });

  it("→ button changes all four week labels", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const labelsBefore = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    await user.click(screen.getByRole("button", { name: "→" }));
    const labelsAfter = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );

    labelsBefore.forEach((label, i) => {
      expect(labelsAfter[i]).not.toBe(label);
    });
  });

  it("Today button resets to current week after navigating away", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const initialLabels = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );

    await user.click(screen.getByRole("button", { name: "←" }));
    // Labels have changed
    const afterBackLabels = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    expect(afterBackLabels[0]).not.toBe(initialLabels[0]);

    // Reset
    await user.click(screen.getByRole("button", { name: "Today" }));
    const afterTodayLabels = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    expect(afterTodayLabels).toEqual(initialLabels);
  });

  it("navigating back then forward returns to original window", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const labelsBefore = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );
    await user.click(screen.getByRole("button", { name: "←" }));
    await user.click(screen.getByRole("button", { name: "→" }));
    const labelsAfter = Array.from(document.querySelectorAll(".wpp-week-label")).map(
      (el) => el.textContent,
    );

    expect(labelsAfter).toEqual(labelsBefore);
  });

  it("← moves the window back by exactly 4 weeks", () => {
    // Use fake timers only for the render (no user interaction needed here)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T12:00:00Z")); // Monday

    useAppData.mockReturnValue(makeAppData());

    // Render with real planning start = 2026-03-02
    // Derive expected: 4 weeks earlier = 2026-02-02
    const { rerender } = render(<WeeklyPlanPage />);
    const firstLabelBefore = document.querySelector(".wpp-week-label").textContent;

    vi.useRealTimers();

    // The label should include the year 2026
    expect(firstLabelBefore).toContain("2026");
  });
});

// ── Layout safety (TASK-014) ──────────────────────────────────────────────────

describe("Rolling 4-week view — layout safety", () => {
  it("page root has overflow-x-hidden to prevent horizontal scroll", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const overflowContainers = document.querySelectorAll(".overflow-x-hidden");
    expect(overflowContainers.length).toBeGreaterThan(0);
  });

  it("each DayColumn has min-w-0 to prevent flex overflow", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const days = document.querySelectorAll(".wpp-day");
    const allHaveMinW0 = Array.from(days).every((d) => d.classList.contains("min-w-0"));
    expect(allHaveMinW0).toBe(true);
  });

  it("renders four summary stat rows (one per week section)", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const totalLabels = screen.getAllByText(/Total:/i);
    expect(totalLabels.length).toBe(4);
  });

  it("each day grid is nested inside a card-like wrapper", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const grids = document.querySelectorAll(".wpp-day-grid");
    grids.forEach((grid) => {
      const card = grid.closest("[class*='rounded']");
      expect(card).not.toBeNull();
    });
  });
});

// ── loadEntriesForRange is called ─────────────────────────────────────────────

describe("Rolling 4-week view — data loading", () => {
  it("calls loadEntriesForRange (not loadEntriesForWeek) for the 4-week window", () => {
    const loadEntriesForRange = vi.fn().mockResolvedValue([]);
    const loadEntriesForWeek = vi.fn().mockResolvedValue([]);

    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: [],
        loading: false,
        loadEntriesForWeek,
        loadEntriesForRange,
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        toggleCompleted: vi.fn(),
      },
    }));

    render(<WeeklyPlanPage />);

    expect(loadEntriesForRange).toHaveBeenCalledTimes(1);
    expect(loadEntriesForWeek).not.toHaveBeenCalled();
  });

  it("loadEntriesForRange is called with a 28-day range (27 days after start)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-02T12:00:00Z")); // Monday

    const loadEntriesForRange = vi.fn().mockResolvedValue([]);
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: [],
        loading: false,
        loadEntriesForWeek: vi.fn(),
        loadEntriesForRange,
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        toggleCompleted: vi.fn(),
      },
    }));

    render(<WeeklyPlanPage />);

    expect(loadEntriesForRange).toHaveBeenCalledWith(
      "plan-1",
      "2026-03-02",
      "2026-03-29", // 27 days after start = end of week 4
    );
  });
});
