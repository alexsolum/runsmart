import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import LongTermPlanPage from "../../src/pages/LongTermPlanPage";
import { makeAppData } from "./mockAppData";
import { generateCoachingInsights } from "../../src/domain/compute";
import { currentMondayIso, isoDateOffset } from "../../src/lib/dateUtils";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(() => null),
}));

vi.mock("../../src/domain/compute", async () => {
  const actual = await vi.importActual("../../src/domain/compute");
  return {
    ...actual,
    generateCoachingInsights: vi.fn(),
  };
});

import { useAppData } from "../../src/context/AppDataContext";

function makeNoTrainingContextAppData() {
  const base = makeAppData();
  return makeAppData({
    activities: {
      ...base.activities,
      activities: [],
    },
    checkins: {
      ...base.checkins,
      checkins: [],
    },
    plans: {
      ...base.plans,
      plans: [],
    },
  });
}

function makeFourWeekHierarchicalAppData() {
  const startMonday = currentMondayIso();
  const weeks = Array.from({ length: 4 }, (_, weekIndex) => {
    const weekStart = isoDateOffset(startMonday, weekIndex * 7);
    const weekEnd = isoDateOffset(weekStart, 6);
    return {
      weekNumber: weekIndex + 1,
      startDate: weekStart,
      endDate: weekEnd,
      phase: weekIndex < 2 ? "Build" : "Peak",
      summary: { totalHours: 6 + weekIndex, totalKm: 60 + weekIndex * 8, sessions: 4 },
      days: Array.from({ length: 7 }, (_, dayIndex) => ({
        date: isoDateOffset(weekStart, dayIndex),
        dayOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayIndex],
        workouts: dayIndex === 1 ? [{
          id: `test-workout-${weekIndex}`,
          sport: "Run",
          type: "Intervals",
          name: `Key workout ${weekIndex + 1}`,
          description: `4 x 5 min for week ${weekIndex + 1}`,
          durationMinutes: 60,
          distanceKm: 12,
          completed: false,
        }] : [],
      })),
    };
  });

  const base = makeAppData();
  return makeAppData({
    ...base,
    workoutEntries: {
      ...base.workoutEntries,
      entries: [],
      loadEntriesForRange: vi.fn().mockResolvedValue([]),
    },
    trainingBlocks: {
      ...base.trainingBlocks,
      blocks: [],
    },
    hierarchicalPlan: {
      ...base.hierarchicalPlan,
      plan: {
        ...base.hierarchicalPlan.plan,
        plan_data: {
          ...base.hierarchicalPlan.plan.plan_data,
          weeks,
          phases: [
            { name: "Build", startWeek: 1, endWeek: 2 },
            { name: "Peak", startWeek: 3, endWeek: 4 },
          ],
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue(makeAppData());
  generateCoachingInsights.mockReturnValue([]);
});

describe("LongTermPlanPage", () => {
  it("renders the current day with an I DAG badge in the default week grid", () => {
    render(<LongTermPlanPage />);

    const currentWeek = screen.getByTestId("plan-current-week");
    expect(within(currentWeek).getByText("I DAG")).toBeInTheDocument();
  });

  it("renders exactly four upcoming week rows in the default right rail", () => {
    render(<LongTermPlanPage />);

    const nextFourWeeks = screen.getByTestId("plan-next-four-weeks");
    expect(within(nextFourWeeks).getAllByTestId("plan-next-week-row")).toHaveLength(4);
  });

  it("renders AI coach notes when non-generic insights are available", () => {
    generateCoachingInsights.mockReturnValue([
      {
        type: "warning",
        titleKey: "coach.deepFatigue",
        descKey: "coach.deepFatigueDesc",
        priority: 2,
      },
    ]);

    render(<LongTermPlanPage />);

    expect(screen.getByTestId("plan-ai-notes")).toBeInTheDocument();
    expect(screen.getByText("Deep fatigue accumulation")).toBeInTheDocument();
  });

  it("hides AI coach notes when there is no meaningful training context", () => {
    generateCoachingInsights.mockReturnValue([
      {
        type: "info",
        titleKey: "coach.getStarted",
        descKey: "coach.getStartedDesc",
        priority: 5,
      },
    ]);
    useAppData.mockReturnValue(makeNoTrainingContextAppData());

    render(<LongTermPlanPage />);

    expect(screen.getByTestId("plan-current-week")).toBeInTheDocument();
    expect(screen.queryByTestId("plan-ai-notes")).toBeNull();
  });

  it("switches to Sesong and mounts the existing season plan viewer", () => {
    render(<LongTermPlanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sesong" }));

    const seasonView = screen.getByTestId("plan-season-view");
    expect(seasonView).toBeInTheDocument();
    expect(within(seasonView).getAllByText("Base").length).toBeGreaterThan(0);
  });

  it("renders four-week workouts from the hierarchical plan even when planner entries are empty", () => {
    useAppData.mockReturnValue(makeFourWeekHierarchicalAppData());

    render(<LongTermPlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "4 uker" }));

    expect(screen.getByTestId("week-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("week-card-4")).toBeInTheDocument();
    expect(screen.getAllByTitle("Replan this week with AI coach")).toHaveLength(4);
    expect(screen.getByTestId("week-metrics-1")).toHaveTextContent("60 km");
    expect(screen.getByText("Key workout 1")).toBeInTheDocument();
    expect(screen.getByText("Key workout 2")).toBeInTheDocument();
  });

  it("shows an add-workout button on both empty and populated plan days", () => {
    useAppData.mockReturnValue(makeFourWeekHierarchicalAppData());

    render(<LongTermPlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "4 uker" }));

    expect(screen.getByTestId("add-workout-2026-04-21")).toBeInTheDocument();
    expect(screen.getByTestId("add-workout-2026-04-22")).toBeInTheDocument();
  });

  it("opens a create modal from the day add button and saves a workout on that date", async () => {
    const appData = makeFourWeekHierarchicalAppData();
    useAppData.mockReturnValue(appData);

    render(<LongTermPlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "4 uker" }));
    fireEvent.click(screen.getByTestId("add-workout-2026-04-21"));

    expect(screen.getByRole("heading", { name: "Add workout" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Workout name"), { target: { value: "Easy double" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "Easy" } });
    fireEvent.change(screen.getByLabelText("Sport"), { target: { value: "Run" } });
    fireEvent.change(screen.getByLabelText("Duration"), { target: { value: "45" } });
    fireEvent.change(screen.getByLabelText("Distance"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Add workout" }));

    expect(appData.hierarchicalPlan.addWorkout).toHaveBeenCalledWith({
      weekNumber: 1,
      dayDate: "2026-04-21",
      workout: {
        sport: "Run",
        type: "Easy",
        name: "Easy double",
        description: "",
        durationMinutes: 45,
        distanceKm: 8,
      },
    });
  });
});
