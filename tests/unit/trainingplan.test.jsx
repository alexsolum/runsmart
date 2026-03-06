/**
 * Training Plan page tests (LongTermPlanPage)
 *
 * Verifies that the long-term plan is presented as phase blocks stretching
 * across weeks, with create/edit/delete functionality backed by Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LongTermPlanPage from "../../src/pages/LongTermPlanPage";
import KoopTimeline from "../../src/components/KoopTimeline";
import { makeAppData, SAMPLE_BLOCKS, SAMPLE_PLAN } from "./mockAppData";

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Training Plan - manual replan", () => {
  it("shows the manual replan trigger when a plan is selected", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByRole("button", { name: /Replan with AI Coach/i })).toBeInTheDocument();
  });

  it("invokes gemini-coach long_term_replan using shared payload builder", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        coaching_feedback: "Adjusted for your current fatigue.",
        weekly_structure: [
          {
            week_start: "2026-04-06",
            week_end: "2026-04-12",
            phase_focus: "Aerobic support",
            target_km: 58,
            key_workouts: ["Long run progression", "Tempo support"],
            notes: "Keep fatigue manageable",
          },
        ],
        horizon_start: "2026-04-06",
        horizon_end: "2026-06-28",
        goal_race_date: "2026-06-29",
      },
      error: null,
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      planContext: { phase: "Build" },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });

    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);

    await user.click(screen.getByRole("button", { name: /Replan with AI Coach/i }));

    expect(buildCoachPayload).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith(
      "gemini-coach",
      expect.objectContaining({
        body: expect.objectContaining({
          mode: "long_term_replan",
          conversationHistory: expect.any(Array),
          planContext: expect.any(Object),
        }),
      }),
    );
    expect(screen.getByText(/Manual Replan Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/1 week horizon/i)).toBeInTheDocument();
    expect(screen.getByText(/Horizon: 2026-04-06 to 2026-06-28/i)).toBeInTheDocument();
  });

  it("displays adaptation_summary callout after long-term replan", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        coaching_feedback: "Adjusted for your current fatigue.",
        adaptation_summary: "Fatigue trend across 3 check-ins drove a load reduction this week. Long run remains Sunday anchor. Intensity sessions reduced from 2 to 1 given elevated fatigue.",
        weekly_structure: [
          {
            week_start: "2026-04-06",
            week_end: "2026-04-12",
            phase_focus: "Aerobic support",
            target_km: 58,
            key_workouts: ["Long run progression"],
            notes: "Keep fatigue manageable",
          },
        ],
        horizon_start: "2026-04-06",
        horizon_end: "2026-04-12",
        goal_race_date: "2026-06-29",
      },
      error: null,
    });
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      planContext: { phase: "Build" },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });

    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);

    await user.click(screen.getByRole("button", { name: /Replan with AI Coach/i }));

    await waitFor(() => {
      expect(screen.getByText(/Fatigue trend across 3 check-ins/i)).toBeInTheDocument();
    });
  });

  it("applies only selected horizon weeks after explicit confirmation", async () => {
    const user = userEvent.setup();
    const invoke = vi.fn().mockResolvedValue({
      data: {
        coaching_feedback: "Replanned around your constraints.",
        weekly_structure: [
          {
            week_start: "2026-04-06",
            week_end: "2026-04-12",
            phase_focus: "Aerobic support",
            target_km: 56,
            key_workouts: ["Long run progression"],
            notes: "Absorb load",
          },
          {
            week_start: "2026-04-13",
            week_end: "2026-04-19",
            phase_focus: "Build support",
            target_km: 60,
            key_workouts: ["Tempo support"],
            notes: "Controlled intensity",
          },
        ],
        horizon_start: "2026-04-06",
        horizon_end: "2026-04-19",
        goal_race_date: "2026-06-29",
      },
      error: null,
    });
    const applyLongTermWeeklyStructure = vi.fn().mockResolvedValue([]);
    getSupabaseClient.mockReturnValue({ functions: { invoke } });
    buildCoachPayload.mockResolvedValue({
      weeklySummary: [],
      recentActivities: [],
      latestCheckin: null,
      planContext: { phase: "Build" },
      dailyLogs: [],
      runnerProfile: null,
      lang: "en",
    });
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));

    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        ...makeAppData().workoutEntries,
        applyLongTermWeeklyStructure,
      },
    }));

    render(<LongTermPlanPage />);
    await user.click(screen.getByRole("button", { name: /Replan with AI Coach/i }));
    const applyToggles = screen.getAllByRole("checkbox", { name: /Apply/i });
    await user.click(applyToggles[1]);
    await user.click(screen.getByRole("button", { name: /Apply 1 Selected Week/i }));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(applyLongTermWeeklyStructure).toHaveBeenCalledWith(
      SAMPLE_PLAN.id,
      [
        expect.objectContaining({
          week_start: "2026-04-06",
          week_end: "2026-04-12",
        }),
      ],
    );
    expect(screen.getByText(/Selected long-term weeks applied/i)).toBeInTheDocument();
  });
});

describe("Training Plan — page structure", () => {
  it("renders the Training Plan heading", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByRole("heading", { name: /Training Plan/i })).toBeInTheDocument();
  });
});

describe("Training Plan — plan selector", () => {
  it("shows the plan name in a dropdown when a plan exists", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    // Plan name appears in both the select option and the meta section; just ensure at least one exists
    expect(screen.getAllByText(/Stockholm Marathon/i).length).toBeGreaterThan(0);
  });

  it("shows 'No plans yet' when there are no plans", () => {
    useAppData.mockReturnValue(makeAppData({
      plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
      trainingBlocks: {
        blocks: [],
        loading: false,
        loadBlocks: vi.fn().mockResolvedValue([]),
        createBlock: vi.fn(),
        updateBlock: vi.fn(),
        deleteBlock: vi.fn(),
      },
    }));

    render(<LongTermPlanPage />);
    expect(screen.getByText(/No plans yet/i)).toBeInTheDocument();
  });

  it("shows a '+ New plan' button", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByRole("button", { name: /New plan/i })).toBeInTheDocument();
  });

  it("opens the Create Plan form when '+ New plan' is clicked", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);

    await user.click(screen.getByRole("button", { name: /New plan/i }));
    expect(screen.getByRole("heading", { name: /New training plan/i })).toBeInTheDocument();
  });
});

describe("Training Plan — Create Plan form schema", () => {
  beforeEach(async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    await user.click(screen.getByRole("button", { name: /New plan/i }));
  });

  it("has a Goal race text input", () => {
    expect(document.querySelector('input[placeholder*="Stockholm"]')).toBeInTheDocument();
  });

  it("has a Race date input", () => {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it("has a Days/week available select", () => {
    expect(screen.getByText(/Days\/week available/i)).toBeInTheDocument();
  });

  it("has a Current weekly km input", () => {
    expect(screen.getByText(/Current weekly km/i)).toBeInTheDocument();
  });

  it("has a Create plan button that is disabled without required fields", () => {
    const createBtn = screen.getByRole("button", { name: /Create plan/i });
    expect(createBtn).toBeDisabled();
  });

  it("enables Create plan button when race name and date are filled", async () => {
    const user = userEvent.setup();
    const raceInput = document.querySelector('input[placeholder*="Stockholm"]');
    const dateInput = document.querySelector('input[type="date"]');

    await user.type(raceInput, "Oslo Marathon");
    await user.type(dateInput, "2026-09-13");

    expect(screen.getByRole("button", { name: /Create plan/i })).toBeEnabled();
  });
});

describe("Training Plan — training blocks timeline", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders the KoopTimeline when blocks exist", () => {
    render(<LongTermPlanPage />);
    expect(document.querySelector(".koop-timeline")).toBeInTheDocument();
  });

  it("displays each block phase name", () => {
    render(<LongTermPlanPage />);
    // SAMPLE_BLOCKS has Base and Build phases; names appear in both bands and legend
    expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Build").length).toBeGreaterThan(0);
  });

  it("displays each block label", () => {
    render(<LongTermPlanPage />);
    // Labels appear in both the phase bar and the block cards; use getAllByText
    expect(screen.getAllByText("Base 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Build 1").length).toBeGreaterThan(0);
  });

  it("shows the target km for each block", () => {
    render(<LongTermPlanPage />);
    // "Target: 50 km/week" may appear multiple times (phase bar tooltip + block card)
    expect(screen.getAllByText(/50 km\/week/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/65 km\/week/i).length).toBeGreaterThan(0);
  });

  it("shows block notes", () => {
    render(<LongTermPlanPage />);
    expect(screen.getByText(/Focus on aerobic base/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduce tempo and intervals/i)).toBeInTheDocument();
  });

  it("renders Edit and Delete buttons for each block", () => {
    render(<LongTermPlanPage />);
    const editButtons = screen.getAllByRole("button", { name: /Edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    expect(editButtons.length).toBe(SAMPLE_BLOCKS.length);
    expect(deleteButtons.length).toBe(SAMPLE_BLOCKS.length);
  });

  it("renders '+ Add training block' button", () => {
    render(<LongTermPlanPage />);
    expect(screen.getByRole("button", { name: /Add training block/i })).toBeInTheDocument();
  });

  it("shows empty-state when no blocks are present", () => {
    useAppData.mockReturnValue(makeAppData({
      trainingBlocks: {
        blocks: [],
        loading: false,
        loadBlocks: vi.fn().mockResolvedValue([]),
        createBlock: vi.fn(),
        updateBlock: vi.fn(),
        deleteBlock: vi.fn(),
      },
    }));

    render(<LongTermPlanPage />);
    expect(screen.getByText(/No training phases yet/i)).toBeInTheDocument();
  });
});

describe("Training Plan — Add block form", () => {
  // Each test renders independently to avoid double-render with beforeEach

  it("opens the block form with phase/date/target km fields", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    await user.click(screen.getByRole("button", { name: /Add training block/i }));

    expect(screen.getByRole("heading", { name: /Add training block/i })).toBeInTheDocument();
    expect(document.querySelector('select[required]')).toBeInTheDocument();
  });

  it("phase select contains all five phases", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    await user.click(screen.getByRole("button", { name: /Add training block/i }));

    const phaseSelect = document.querySelector('select[required]');
    const options = Array.from(phaseSelect.options).map((o) => o.value);
    expect(options).toContain("Base");
    expect(options).toContain("Build");
    expect(options).toContain("Peak");
    expect(options).toContain("Taper");
    expect(options).toContain("Recovery");
  });

  it("calls createBlock when the form is submitted with valid data", async () => {
    const createBlock = vi.fn().mockResolvedValue({});
    useAppData.mockReturnValue(makeAppData({
      trainingBlocks: {
        blocks: SAMPLE_BLOCKS,
        loading: false,
        loadBlocks: vi.fn().mockResolvedValue([]),
        createBlock,
        updateBlock: vi.fn().mockResolvedValue({}),
        deleteBlock: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const user = userEvent.setup();
    render(<LongTermPlanPage />);
    await user.click(screen.getByRole("button", { name: /Add training block/i }));

    // start_date defaults to today — just set end_date via fireEvent.change
    // (date inputs don't accept keyboard input reliably in jsdom)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: "2026-05-31" } });

    const form = document.querySelector(".ltp-block-form");
    const submitBtn = form.querySelector('button[type="submit"]');
    await user.click(submitBtn);
    expect(createBlock).toHaveBeenCalled();
  });
});

describe("Training Plan — plan meta display", () => {
  it("shows days until race", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    // "days away" should be shown for the selected plan
    expect(screen.getByText(/days away/i)).toBeInTheDocument();
  });

  it("shows base volume when current_mileage is set", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByText(/Base volume: 50 km\/week/i)).toBeInTheDocument();
  });
});

// ── KoopTimeline component (Task 3) ───────────────────────────────────────────

const KOOP_BLOCKS = [
  { id: "1", phase: "Base", label: "Base 1", start_date: "2025-01-06", end_date: "2025-02-09", target_km_week: 50 },
  { id: "2", phase: "Build", label: "Build 1", start_date: "2025-02-10", end_date: "2025-03-09", target_km_week: 65 },
];

describe("KoopTimeline", () => {
  it("renders a column for each week in the plan", () => {
    render(
      <KoopTimeline
        blocks={KOOP_BLOCKS}
        planStartDate="2025-01-06"
        planEndDate="2025-03-09"
        today={new Date("2025-01-13T00:00:00Z")}
      />
    );
    // Weeks from Jan 6 to Mar 9: ~9 weeks
    const weekCells = document.querySelectorAll("[data-week]");
    expect(weekCells.length).toBeGreaterThanOrEqual(9);
  });

  it("shows phase label text inside each block band", () => {
    render(
      <KoopTimeline
        blocks={KOOP_BLOCKS}
        planStartDate="2025-01-06"
        planEndDate="2025-03-09"
        today={new Date("2025-01-13T00:00:00Z")}
      />
    );
    expect(screen.getByText(/Base 1/)).toBeInTheDocument();
    expect(screen.getByText(/Build 1/)).toBeInTheDocument();
  });

  it("highlights the current week column", () => {
    render(
      <KoopTimeline
        blocks={KOOP_BLOCKS}
        planStartDate="2025-01-06"
        planEndDate="2025-03-09"
        today={new Date("2025-01-13T00:00:00Z")}
      />
    );
    const todayCell = document.querySelector("[data-today]");
    expect(todayCell).toBeInTheDocument();
  });

  it("shows target km/week inside block when set", () => {
    render(
      <KoopTimeline
        blocks={KOOP_BLOCKS}
        planStartDate="2025-01-06"
        planEndDate="2025-03-09"
        today={new Date("2025-01-13T00:00:00Z")}
      />
    );
    expect(screen.getByText(/50 km\/w/)).toBeInTheDocument();
  });

  it("renders gracefully with empty blocks array", () => {
    render(
      <KoopTimeline
        blocks={[]}
        planStartDate="2025-01-06"
        planEndDate="2025-03-09"
      />
    );
    expect(screen.getByText(/No training blocks yet/)).toBeInTheDocument();
  });
});
