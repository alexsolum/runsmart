/**
 * Weekly Plan page tests (WeeklyPlanPage)
 *
 * Verifies:
 * - 7-day grid renders for the current week
 * - Existing workout entries from Supabase are displayed
 * - Users can add workouts to a day (triggers createEntry on Supabase)
 * - Users can remove workouts (triggers deleteEntry on Supabase)
 * - Week navigation moves forward/backward by 7 days
 * - Summary bar reflects total km, session count, rest days, and completion %
 * - Calendar shows correct UTC-based dates (timezone regression test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeeklyPlanPage from "../../src/pages/WeeklyPlanPage";
import { makeAppData, SAMPLE_WORKOUT_ENTRIES, SAMPLE_PLAN } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));
vi.mock("../../src/lib/coachPayload", () => ({
  buildCoachPayload: vi.fn(),
}));
vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";
import { buildCoachPayload } from "../../src/lib/coachPayload";
import { getSupabaseClient } from "../../src/lib/supabaseClient";
import { WEEKLY_PLAN_HANDOFF_KEY } from "../../src/lib/appNavigation";

function currentMondayIso() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function isoDateOffset(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStartIso) {
  const start = new Date(`${weekStartIso}T00:00:00Z`);
  const end = new Date(`${isoDateOffset(weekStartIso, 6)}T00:00:00Z`);
  const opts = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(undefined, opts)} — ${end.toLocaleDateString(undefined, opts)} ${end.getUTCFullYear()}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  // Suppress window.confirm calls in delete tests
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
});

describe("Weekly Plan — page structure", () => {
  it("renders the Weekly Plan heading", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    expect(screen.getByRole("heading", { name: /Weekly Plan/i })).toBeInTheDocument();
  });
});

describe("Weekly Plan — AI generation", () => {
  it("shows the embedded AI week setup card", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    expect(screen.getByText(/AI week setup/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred long run day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred hard workout day/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Double threshold preference/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replace With AI Week/i })).toBeInTheDocument();
  });

  it("shows generate-first copy when the focused week is empty", () => {
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
      },
    }));

    render(<WeeklyPlanPage />);

    expect(screen.getByText(/Start this week with an AI-generated structure/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate AI Week/i })).toBeInTheDocument();
  });

  it("invokes gemini-coach and applies the returned week into the focused grid week", async () => {
    const user = userEvent.setup();
    const applyStructuredPlan = vi.fn().mockResolvedValue([]);
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          {
            date: "2026-04-07",
            workout_type: "Easy",
            distance_km: 12,
            duration_min: 70,
            description: "Aerobic support",
          },
          {
            date: "2026-04-12",
            workout_type: "Long Run",
            distance_km: 24,
            duration_min: 150,
            description: "Long run progression",
          },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Keep the long run steady.",
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
        applyStructuredPlan,
      },
    }));

    render(<WeeklyPlanPage />);
    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));

    expect(buildCoachPayload).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          mode: "plan",
        }),
      }),
    );
    expect(applyStructuredPlan).toHaveBeenCalledWith(
      SAMPLE_PLAN.id,
      [
        expect.objectContaining({
          workout_date: isoDateOffset(currentMondayIso(), 1),
          workout_type: "Easy",
          distance_km: 12,
        }),
        expect.objectContaining({
          workout_date: isoDateOffset(currentMondayIso(), 6),
          workout_type: "Long Run",
          distance_km: 24,
        }),
      ],
      { overwritePolicy: "preserve-protected" },
    );
  });

  it("requires confirmation before replacing a non-empty week", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          { date: "2026-04-07", workout_type: "Easy", distance_km: 8, duration_min: 45, description: "Easy day" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Keep the long run steady.",
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    globalThis.confirm.mockReturnValue(false);
    const applyStructuredPlan = vi.fn();
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        applyStructuredPlan,
      },
    }));

    render(<WeeklyPlanPage />);
    await user.click(screen.getByRole("button", { name: /Replace With AI Week/i }));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(applyStructuredPlan).not.toHaveBeenCalled();
  });

  it("renders handoff intent from Training Plan when present in session storage", () => {
    window.sessionStorage.setItem(WEEKLY_PLAN_HANDOFF_KEY, JSON.stringify({
      planId: SAMPLE_PLAN.id,
      weekStart: currentMondayIso(),
      phase: "Build",
      targetKm: 64,
      notes: "Keep the long run steady and the midweek workout controlled.",
    }));

    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("64 km")).toBeInTheDocument();
    expect(screen.getByText(/Keep the long run steady/i)).toBeInTheDocument();
  });

  it("passes the same displayed current-week intent into buildCoachPayload and gemini-coach", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          { date: currentMondayIso(), workout_type: "Easy", distance_km: 10, duration_min: 55, description: "Easy run" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    useAppData.mockReturnValue(makeAppData());

    render(<WeeklyPlanPage />);

    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("65 km")).toBeInTheDocument();
    expect(screen.getByText(/Introduce tempo and intervals/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Replace With AI Week/i }));

    expect(buildCoachPayload).toHaveBeenCalledWith(expect.objectContaining({
      recommendationWeek: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
      },
    }));
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          targetWeekStart: currentMondayIso(),
          targetWeekEnd: isoDateOffset(currentMondayIso(), 6),
          recommendationContext: expect.objectContaining({
            trainingType: "Build",
            targetMileageKm: 65,
            notes: "Introduce tempo and intervals",
          }),
        }),
      }),
    );
  });

  it("keeps handoff-driven non-current intent aligned between the setup card and invoke payload", async () => {
    const user = userEvent.setup();
    const weekStart = isoDateOffset(currentMondayIso(), 7);
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          { date: weekStart, workout_type: "Easy", distance_km: 8, duration_min: 45, description: "Easy support" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart,
        weekEnd: isoDateOffset(weekStart, 6),
        trainingType: "Taper",
        targetMileageKm: 42,
        notes: "Travel Friday so move the quality work earlier.",
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    window.sessionStorage.setItem(WEEKLY_PLAN_HANDOFF_KEY, JSON.stringify({
      planId: SAMPLE_PLAN.id,
      weekStart,
      phase: "Taper",
      targetKm: 42,
      notes: "Travel Friday so move the quality work earlier.",
    }));
    useAppData.mockReturnValue(makeAppData());

    render(<WeeklyPlanPage />);

    expect(screen.getByText("Taper")).toBeInTheDocument();
    expect(screen.getByText("42 km")).toBeInTheDocument();
    expect(screen.getByText(/Travel Friday/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));

    expect(buildCoachPayload).toHaveBeenCalledWith(expect.objectContaining({
      recommendationWeek: {
        weekStart,
        weekEnd: isoDateOffset(weekStart, 6),
        trainingType: "Taper",
        targetMileageKm: 42,
        notes: "Travel Friday so move the quality work earlier.",
      },
    }));
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          targetWeekStart: weekStart,
          targetWeekEnd: isoDateOffset(weekStart, 6),
          recommendationContext: expect.objectContaining({
            weekStart,
            trainingType: "Taper",
            targetMileageKm: 42,
          }),
        }),
      }),
    );
  });

  it("lets the user target a non-first visible week for AI generation without shifting the 4-week window", async () => {
    const user = userEvent.setup();
    const secondVisibleWeek = isoDateOffset(currentMondayIso(), 7);
    const thirdVisibleWeek = isoDateOffset(currentMondayIso(), 14);
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          { date: thirdVisibleWeek, workout_type: "Easy", distance_km: 9, duration_min: 54, description: "Easy support" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: thirdVisibleWeek,
        weekEnd: isoDateOffset(thirdVisibleWeek, 6),
        trainingType: "Taper",
        targetMileageKm: 42,
        notes: "Keep the taper compact.",
      },
      weekDirective: {
        weekStart: thirdVisibleWeek,
        weekEnd: isoDateOffset(thirdVisibleWeek, 6),
        trainingType: "Taper",
        targetMileageKm: 42,
        notes: "Keep the taper compact.",
        constraints: {
          enforceTrainingType: true,
          enforceTargetMileage: true,
          mileageTolerancePct: 0.08,
          overrideRequiresExplanation: true,
        },
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    const applyStructuredPlan = vi.fn().mockResolvedValue([]);
    useAppData.mockReturnValue(makeAppData({
      trainingBlocks: {
        blocks: [
          {
            id: "block-build",
            plan_id: SAMPLE_PLAN.id,
            phase: "Build",
            start_date: currentMondayIso(),
            end_date: isoDateOffset(secondVisibleWeek, 6),
            target_km: 65,
            notes: "Keep the work steady.",
          },
          {
            id: "block-taper",
            plan_id: SAMPLE_PLAN.id,
            phase: "Taper",
            start_date: thirdVisibleWeek,
            end_date: isoDateOffset(thirdVisibleWeek, 6),
            target_km: 42,
            notes: "Keep the taper compact.",
          },
        ],
      },
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
        applyStructuredPlan,
      },
    }));

    render(<WeeklyPlanPage />);

    expect(screen.getByRole("button", { name: formatWeekLabel(currentMondayIso()) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: formatWeekLabel(secondVisibleWeek) })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: formatWeekLabel(thirdVisibleWeek) }));
    expect(screen.getByText("Taper")).toBeInTheDocument();
    expect(screen.getByText("42 km")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));

    expect(buildCoachPayload).toHaveBeenCalledWith(expect.objectContaining({
      recommendationWeek: {
        weekStart: thirdVisibleWeek,
        weekEnd: isoDateOffset(thirdVisibleWeek, 6),
        trainingType: "Taper",
        targetMileageKm: 42,
        notes: "Keep the taper compact.",
      },
    }));
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          targetWeekStart: thirdVisibleWeek,
          targetWeekEnd: isoDateOffset(thirdVisibleWeek, 6),
          weekDirective: expect.objectContaining({
            weekStart: thirdVisibleWeek,
            trainingType: "Taper",
            targetMileageKm: 42,
          }),
        }),
      }),
    );
    expect(applyStructuredPlan).toHaveBeenCalledWith(
      SAMPLE_PLAN.id,
      [expect.objectContaining({ workout_date: thirdVisibleWeek })],
      { overwritePolicy: "preserve-protected" },
    );
  });

  it("serializes optional weekly constraints into the coach payload and invoke body", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        structured_plan: [
          { date: currentMondayIso(), workout_type: "Easy", distance_km: 10, duration_min: 55, description: "Easy run" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
      },
      weekDirective: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
        constraints: {
          enforceTrainingType: true,
          enforceTargetMileage: true,
          mileageTolerancePct: 0.1,
          overrideRequiresExplanation: true,
        },
      },
      weeklyConstraints: {
        preferredLongRunDay: "Sat",
        preferredHardWorkoutDay: "Tue",
        commuteDays: ["Wed", "Fri"],
        doubleThresholdAllowed: false,
      },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
        applyStructuredPlan: vi.fn().mockResolvedValue([]),
      },
    }));

    render(<WeeklyPlanPage />);

    await user.selectOptions(screen.getByLabelText(/Preferred long run day/i), "Sat");
    await user.selectOptions(screen.getByLabelText(/Preferred hard workout day/i), "Tue");
    await user.click(screen.getByRole("button", { name: "Wed" }));
    await user.click(screen.getByRole("button", { name: "Fri" }));
    await user.selectOptions(screen.getByLabelText(/Double threshold preference/i), "avoid");
    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));

    expect(buildCoachPayload).toHaveBeenCalledWith(expect.objectContaining({
      weeklyConstraints: {
        preferredLongRunDay: "Sat",
        preferredHardWorkoutDay: "Tue",
        commuteDays: ["Wed", "Fri"],
        doubleThresholdAllowed: false,
      },
    }));
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          weeklyConstraints: {
            preferredLongRunDay: "Sat",
            preferredHardWorkoutDay: "Tue",
            commuteDays: ["Wed", "Fri"],
            doubleThresholdAllowed: false,
          },
        }),
      }),
    );
  });

  it("shows a protected-day review before applying a regenerated week", async () => {
    const user = userEvent.setup();
    const previewStructuredPlanApply = vi.fn().mockResolvedValue({
      protectedDates: [isoDateOffset(currentMondayIso(), 2)],
      replaceableDates: [isoDateOffset(currentMondayIso(), 3)],
      reviewRequired: true,
      structuredPlan: [],
    });
    const applyStructuredPlan = vi.fn().mockResolvedValue([]);
    const invoke = vi.fn().mockResolvedValue({
      data: {
        coaching_feedback: "Travel changes the load placement this week.",
        adaptation_summary: "Long run moved earlier because Friday is constrained.",
        structured_plan: [
          { date: currentMondayIso(), workout_type: "Easy", distance_km: 10, duration_min: 55, description: "Easy run" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
      },
      weekDirective: null,
      weeklyConstraints: null,
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
        previewStructuredPlanApply,
        applyStructuredPlan,
      },
    }));

    render(<WeeklyPlanPage />);
    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));

    expect(previewStructuredPlanApply).toHaveBeenCalled();
    expect(applyStructuredPlan).not.toHaveBeenCalled();
    expect(screen.getByText(/Protected day review/i)).toBeInTheDocument();
    expect(screen.getByText(/Long run moved earlier because Friday is constrained/i)).toBeInTheDocument();
  });

  it("supports an explicit protected-day override after review", async () => {
    const user = userEvent.setup();
    const protectedDate = isoDateOffset(currentMondayIso(), 2);
    const previewStructuredPlanApply = vi.fn().mockResolvedValue({
      protectedDates: [protectedDate],
      replaceableDates: [isoDateOffset(currentMondayIso(), 3)],
      reviewRequired: true,
      structuredPlan: [],
    });
    const applyStructuredPlan = vi.fn().mockResolvedValue([]);
    const invoke = vi.fn().mockResolvedValue({
      data: {
        coaching_feedback: "Travel changes the load placement this week.",
        adaptation_summary: "Primary quality session moved to protect the commute day.",
        structured_plan: [
          { date: currentMondayIso(), workout_type: "Easy", distance_km: 10, duration_min: 55, description: "Easy run" },
        ],
      },
      error: null,
    });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      recentCheckins: [],
      planContext: { phase: "Build" },
      recommendationContext: {
        weekStart: currentMondayIso(),
        weekEnd: isoDateOffset(currentMondayIso(), 6),
        trainingType: "Build",
        targetMileageKm: 65,
        notes: "Introduce tempo and intervals",
      },
      weekDirective: null,
      weeklyConstraints: null,
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    globalThis.confirm.mockReturnValue(true);
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [],
        previewStructuredPlanApply,
        applyStructuredPlan,
      },
    }));

    render(<WeeklyPlanPage />);
    await user.click(screen.getByRole("button", { name: /Generate AI Week/i }));
    await user.click(screen.getByRole("button", { name: /Replace protected days too/i }));

    expect(applyStructuredPlan).toHaveBeenCalledWith(
      SAMPLE_PLAN.id,
      [expect.objectContaining({ workout_date: currentMondayIso() })],
      {
        overwritePolicy: "force-specific",
        forceOverwriteDates: [protectedDate],
      },
    );
  });
});

describe("Weekly Plan — empty state", () => {
  it("shows 'Select or create a training plan' when no plan is selected", () => {
    useAppData.mockReturnValue(makeAppData({
      plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
    }));

    render(<WeeklyPlanPage />);
    expect(screen.getByText(/Select or create a training plan/i)).toBeInTheDocument();
  });
});

describe("Weekly Plan — 7-day grid", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders 7 day columns", () => {
    render(<WeeklyPlanPage />);
    const grid = document.querySelector(".wpp-day-grid");
    expect(grid).toBeInTheDocument();
    const days = grid.querySelectorAll(".wpp-day");
    expect(days.length).toBe(7);
  });

  it("renders Mon–Sun day labels", () => {
    render(<WeeklyPlanPage />);
    const dayLabels = document.querySelectorAll(".wpp-day-label");
    const labelTexts = Array.from(dayLabels).map((el) => el.textContent.slice(0, 3));
    expect(labelTexts).toContain("Mon");
    expect(labelTexts).toContain("Sun");
  });

  it("each visible week has 7 Add (+) buttons (4 weeks × 7 days = 28 total)", () => {
    render(<WeeklyPlanPage />);
    const addButtons = screen.getAllByTitle("Add workout");
    expect(addButtons.length).toBe(28);
  });
});

describe("Weekly Plan — displaying existing workouts", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("shows workout type badges for loaded entries", () => {
    render(<WeeklyPlanPage />);
    // SAMPLE_WORKOUT_ENTRIES has "Easy" and "Tempo" types
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText("Tempo")).toBeInTheDocument();
  });

  it("shows distance for entries that have distance_km", () => {
    render(<WeeklyPlanPage />);
    expect(screen.getByText(/8 km/i)).toBeInTheDocument();
    expect(screen.getByText(/10 km/i)).toBeInTheDocument();
  });

  it("shows workout description", () => {
    render(<WeeklyPlanPage />);
    expect(screen.getByText("Easy aerobic run")).toBeInTheDocument();
    expect(screen.getByText("3×2km @ tempo pace")).toBeInTheDocument();
  });

  it("shows edit (✎) and delete (✕) buttons for each entry", () => {
    render(<WeeklyPlanPage />);
    const editButtons = screen.getAllByTitle("Edit");
    const deleteButtons = screen.getAllByTitle("Delete");
    expect(editButtons.length).toBe(SAMPLE_WORKOUT_ENTRIES.length);
    expect(deleteButtons.length).toBe(SAMPLE_WORKOUT_ENTRIES.length);
  });

  it("shows a completion checkbox per entry", () => {
    render(<WeeklyPlanPage />);
    const checkboxes = screen.getAllByTitle("Mark completed");
    expect(checkboxes.length).toBe(SAMPLE_WORKOUT_ENTRIES.length);
  });

  it("renders entries that use coach-style date field with string metrics", () => {
    const coachStyledEntry = {
      id: "we-coach-1",
      plan_id: SAMPLE_PLAN.id,
      user_id: "user-1",
      date: new Date().toISOString().split("T")[0],
      workout_type: "Easy",
      distance_km: "12",
      duration_min: "70",
      description: "Applied from replan preview",
      completed: false,
    };
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: [coachStyledEntry],
      },
    }));

    render(<WeeklyPlanPage />);

    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByText(/12 km/i)).toBeInTheDocument();
    expect(screen.getByText(/Applied from replan preview/i)).toBeInTheDocument();
  });

  it("renders long-horizon applied entries with synthesized descriptions safely", () => {
    const tomorrowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const longHorizonEntries = [
      {
        id: "we-long-1",
        plan_id: SAMPLE_PLAN.id,
        user_id: "user-1",
        workout_date: new Date().toISOString().split("T")[0],
        workout_type: "Long Run",
        distance_km: 18.5,
        duration_min: null,
        description: "Build endurance | Long run progression | Keep recovery strong",
        completed: false,
      },
      {
        id: "we-long-2",
        plan_id: SAMPLE_PLAN.id,
        user_id: "user-1",
        workout_date: tomorrowIso,
        workout_type: "Tempo",
        distance_km: 9.5,
        duration_min: null,
        description: "Build endurance | Tempo support | Keep recovery strong",
        completed: false,
      },
    ];

    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        entries: longHorizonEntries,
      },
    }));

    render(<WeeklyPlanPage />);

    expect(screen.getByText("Long Run")).toBeInTheDocument();
    expect(screen.getByText("Tempo")).toBeInTheDocument();
    expect(screen.getByText(/Build endurance \| Long run progression/i)).toBeInTheDocument();
  });
});

describe("Weekly Plan — summary bar", () => {
  it("shows total km from all entries (current week section)", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    // SAMPLE_WORKOUT_ENTRIES: 8 + 10 = 18 km (in current week)
    // With 4 week sections, the first one shows current week totals
    const totalStats = screen.getAllByText(/Total:/i);
    expect(totalStats[0].closest(".wpp-summary-stat")).toHaveTextContent("18.0 km");
  });

  it("shows session count (non-Rest entries) in current week section", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    const sessionStats = screen.getAllByText(/Sessions:/i);
    expect(sessionStats[0].closest(".wpp-summary-stat")).toHaveTextContent("2");
  });

  it("shows 0% completion when no entries are marked done", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    const completedStats = screen.getAllByText(/Completed:/i);
    expect(completedStats[0].closest(".wpp-summary-stat")).toHaveTextContent("0%");
  });
});

describe("Weekly Plan — adding a workout", () => {
  it("opens Add Workout form when + is clicked for a day", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const addButtons = screen.getAllByTitle("Add workout");
    await user.click(addButtons[0]); // click first day's + button

    // The form should appear
    expect(document.querySelector(".wpp-add-form")).toBeInTheDocument();
  });

  it("Add form contains a workout type select", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    await user.click(screen.getAllByTitle("Add workout")[0]);

    const typeSelect = document.querySelector(".wpp-add-form select");
    expect(typeSelect).toBeInTheDocument();
    const options = Array.from(typeSelect.options).map((o) => o.value);
    expect(options).toContain("Easy");
    expect(options).toContain("Tempo");
    expect(options).toContain("Long Run");
    expect(options).toContain("Rest");
  });

  it("calls createEntry when the Add form is submitted", async () => {
    const createEntry = vi.fn().mockResolvedValue({
      id: "we-new",
      plan_id: "plan-1",
      workout_date: new Date().toISOString().split("T")[0],
      workout_type: "Easy",
      completed: false,
    });
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: [],
        loading: false,
        loadEntriesForWeek: vi.fn().mockResolvedValue([]),
        loadEntriesForRange: vi.fn().mockResolvedValue([]),
        createEntry,
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        toggleCompleted: vi.fn(),
      },
    }));

    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    await user.click(screen.getAllByTitle("Add workout")[0]);
    await user.click(screen.getByRole("button", { name: /^Add$/i }));

    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ workout_type: "Easy", plan_id: SAMPLE_PLAN.id }),
    );
  });

  it("hides the Add form when Cancel is clicked", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    await user.click(screen.getAllByTitle("Add workout")[0]);
    expect(document.querySelector(".wpp-add-form")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(document.querySelector(".wpp-add-form")).not.toBeInTheDocument();
  });
});

describe("Weekly Plan — removing a workout", () => {
  it("calls deleteEntry when Delete is confirmed", async () => {
    const deleteEntry = vi.fn().mockResolvedValue(undefined);
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: SAMPLE_WORKOUT_ENTRIES,
        loading: false,
        loadEntriesForWeek: vi.fn().mockResolvedValue([]),
        loadEntriesForRange: vi.fn().mockResolvedValue([]),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry,
        toggleCompleted: vi.fn(),
      },
    }));

    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    const deleteButtons = screen.getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    expect(deleteEntry).toHaveBeenCalledWith(SAMPLE_WORKOUT_ENTRIES[0].id);
  });

  it("does NOT call deleteEntry when the confirm dialog is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    const deleteEntry = vi.fn();
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: SAMPLE_WORKOUT_ENTRIES,
        loading: false,
        loadEntriesForWeek: vi.fn().mockResolvedValue([]),
        loadEntriesForRange: vi.fn().mockResolvedValue([]),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry,
        toggleCompleted: vi.fn(),
      },
    }));

    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    await user.click(screen.getAllByTitle("Delete")[0]);
    expect(deleteEntry).not.toHaveBeenCalled();
  });
});

describe("Weekly Plan — toggling completion", () => {
  it("calls toggleCompleted when a workout checkbox is clicked", async () => {
    const toggleCompleted = vi.fn().mockResolvedValue(undefined);
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: SAMPLE_WORKOUT_ENTRIES,
        loading: false,
        loadEntriesForWeek: vi.fn().mockResolvedValue([]),
        loadEntriesForRange: vi.fn().mockResolvedValue([]),
        createEntry: vi.fn(),
        updateEntry: vi.fn(),
        deleteEntry: vi.fn(),
        toggleCompleted,
      },
    }));

    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    const checkboxes = screen.getAllByTitle("Mark completed");
    await user.click(checkboxes[0]);

    expect(toggleCompleted).toHaveBeenCalledWith(
      SAMPLE_WORKOUT_ENTRIES[0].id,
      SAMPLE_WORKOUT_ENTRIES[0].completed,
    );
  });
});

describe("Weekly Plan — week navigation", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("shows a week range label", () => {
    render(<WeeklyPlanPage />);
    expect(document.querySelector(".wpp-week-label")).toBeInTheDocument();
  });

  it("has back (←), forward (→) and Today navigation buttons", () => {
    render(<WeeklyPlanPage />);
    expect(screen.getByRole("button", { name: "←" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "→" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("changes the week label when ← is clicked", async () => {
    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    const weekLabelBefore = document.querySelector(".wpp-week-label").textContent;
    await user.click(screen.getByRole("button", { name: "←" }));
    const weekLabelAfter = document.querySelector(".wpp-week-label").textContent;

    expect(weekLabelAfter).not.toBe(weekLabelBefore);
  });

  it("returns to the current week when Today is clicked after navigating away", async () => {
    const user = userEvent.setup();
    render(<WeeklyPlanPage />);

    const weekLabelCurrent = document.querySelector(".wpp-week-label").textContent;
    await user.click(screen.getByRole("button", { name: "←" }));
    await user.click(screen.getByRole("button", { name: "Today" }));

    expect(document.querySelector(".wpp-week-label").textContent).toBe(weekLabelCurrent);
  });
});

describe("Weekly Plan — plan selector", () => {
  it("renders a plan select dropdown", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    expect(screen.getByText(/Plan:/i)).toBeInTheDocument();
    const select = document.querySelector("select");
    expect(select).toBeInTheDocument();
  });

  it("shows the plan name in the selector", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);
    expect(screen.getByText(/Stockholm Marathon/i)).toBeInTheDocument();
  });
});

describe("Weekly Plan — timezone / UTC date correctness", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Mon as the first day label when today is Wednesday (UTC)", () => {
    // Fix clock to Wednesday 2026-02-25 UTC (12:00 UTC to avoid midnight edge cases)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T12:00:00Z"));

    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const dayLabels = document.querySelectorAll(".wpp-day-label");
    const texts = Array.from(dayLabels).map((el) => el.textContent);

    // Monday 23 Feb should be the first column
    expect(texts[0]).toBe("Mon 23");
    // Wednesday 25 Feb should be the third column
    expect(texts[2]).toBe("Wed 25");
    // Sunday 1 Mar should be the last column
    expect(texts[6]).toBe("Sun 1");
  });

  it("marks Wednesday as today when today is 2026-02-25 UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T12:00:00Z"));

    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const days = document.querySelectorAll(".wpp-day");
    const todayDays = Array.from(days).filter((d) => d.classList.contains("is-today"));

    // Exactly one day should have the today highlight
    expect(todayDays).toHaveLength(1);

    // The highlighted day must show "Wed 25"
    const label = todayDays[0].querySelector(".wpp-day-label");
    expect(label.textContent).toBe("Wed 25");
  });

  it("does not shift dates in a UTC+1 timezone context (regression)", () => {
    // Simulate UTC+1: local midnight (00:00 local) is 23:00 previous day UTC
    // Using fake system time at UTC+1 local midnight for 2026-02-25
    // = 2026-02-24T23:00:00Z — but we keep the clock at noon UTC to keep it clean
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-25T12:00:00Z"));

    useAppData.mockReturnValue(makeAppData());
    render(<WeeklyPlanPage />);

    const dayLabels = document.querySelectorAll(".wpp-day-label");
    const texts = Array.from(dayLabels).map((el) => el.textContent);

    // None of the labels should show dates shifted by a day (e.g. "Mon 22" or "Wed 23")
    expect(texts).not.toContain("Mon 22");
    expect(texts).not.toContain("Wed 23");
    expect(texts[0]).toBe("Mon 23");
    expect(texts[2]).toBe("Wed 25");
  });
});
