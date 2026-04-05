/**
 * Training Plan page tests (LongTermPlanPage)
 *
 * Verifies that the long-term plan is presented as phase blocks stretching
 * across weeks, with create/edit/delete functionality backed by Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import LongTermPlanPage from "../../src/pages/LongTermPlanPage";
import KoopTimeline from "../../src/components/KoopTimeline";
import { CoachFAB } from "../../src/components/CoachFAB";
import { ChatPanel } from "../../src/components/chat/ChatPanel";
import { makeAppData, SAMPLE_BLOCKS, SAMPLE_HIERARCHICAL_PLAN, SAMPLE_PLAN } from "./mockAppData";
import { PlanViewer } from "../../src/components/planner/PlanViewer";
import { WorkoutDetailModal } from "../../src/components/planner/WorkoutDetailModal";
import { getSupabaseClient } from "../../src/lib/supabaseClient";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  useAppData.mockReturnValue(makeAppData());
  getSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "test-token" } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          text: "General guidance",
          patch: [{ week: 1, dayDate: "2026-03-02", workoutId: "w-1", fields: { durationMinutes: 40 } }],
          patchSummary: "Ease off Monday.",
        },
        error: null,
      }),
    },
  });
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("min-width: 768px"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

function PlanViewerHarness({ todayIso = "2026-03-30" }) {
  const [selection, setSelection] = useState(null);

  return (
    <>
      <PlanViewer
        planData={SAMPLE_HIERARCHICAL_PLAN.plan_data}
        todayIso={todayIso}
        onWorkoutSelect={setSelection}
      />
      <WorkoutDetailModal
        open={Boolean(selection)}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
        selection={selection}
        onToggleCompleted={vi.fn()}
        onSave={vi.fn()}
      />
    </>
  );
}

function createInteractiveHierarchicalPlanAppData() {
  const planState = structuredClone(SAMPLE_HIERARCHICAL_PLAN);

  const applyPatch = vi.fn().mockImplementation(async (patches) => {
    const patch = patches[0];
    const week = planState.plan_data.weeks.find((item) => item.weekNumber === patch.week);
    const day = week?.days.find((item) => item.date === patch.dayDate);
    const workout = day?.workouts.find((item) => item.id === patch.workoutId);

    if (workout) {
      Object.assign(workout, patch.fields);
    }

    return planState.plan_data;
  });

  const toggleWorkoutCompleted = vi.fn().mockImplementation(async (workoutId, weekNumber, dayDate) => {
    const week = planState.plan_data.weeks.find((item) => item.weekNumber === weekNumber);
    const day = week?.days.find((item) => item.date === dayDate);
    const workout = day?.workouts.find((item) => item.id === workoutId);

    if (workout) {
      workout.completed = !workout.completed;
    }

    return planState.plan_data;
  });

  return makeAppData({
    hierarchicalPlan: {
      plan: planState,
      loading: false,
      generating: false,
      error: null,
      loadPlan: vi.fn().mockResolvedValue(planState),
      generatePlan: vi.fn().mockResolvedValue(planState),
      applyPatch,
      toggleWorkoutCompleted,
      moveWorkout: vi.fn().mockResolvedValue(planState),
      getWeek: vi.fn().mockImplementation((weekNumber) =>
        planState.plan_data.weeks.find((week) => week.weekNumber === weekNumber) ?? null
      ),
      getPhases: vi.fn().mockReturnValue(planState.plan_data.phases),
    },
  });
}

describe("PlanViewer", () => {
  it("renders phase timeline labels and clickable targets", () => {
    render(<PlanViewer planData={SAMPLE_HIERARCHICAL_PLAN.plan_data} todayIso="2026-03-02" />);

    expect(screen.getByRole("button", { name: /^Base$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Build$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Peak$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Taper$/i })).toBeInTheDocument();
    expect(document.getElementById("phase-base-1-2")).toBeInTheDocument();
    expect(document.getElementById("phase-build-3-4")).toBeInTheDocument();
  });

  it("renders the week summary band with km before hours", () => {
    render(<PlanViewer planData={SAMPLE_HIERARCHICAL_PLAN.plan_data} todayIso="2026-03-02" />);

    const weekCard = screen.getByTestId("week-card-3");
    expect(within(weekCard).getByText("Week 3")).toBeInTheDocument();
    expect(within(weekCard).getByText("Build")).toBeInTheDocument();
    expect(within(weekCard).getByText(/Extend marathon-specific strength and long-run purpose/i)).toBeInTheDocument();

    const metrics = within(weekCard).getByTestId("week-metrics-3");
    expect(metrics.textContent.indexOf("58 km")).toBeLessThan(metrics.textContent.indexOf("7.5 hr"));
  });

  it("renders exactly seven day cells and derives empty copy from recovery state only", () => {
    render(<PlanViewer planData={SAMPLE_HIERARCHICAL_PLAN.plan_data} todayIso="2026-03-02" />);

    const weekOne = screen.getByTestId("week-grid-1");
    const weekTwo = screen.getByTestId("week-grid-2");
    expect(within(weekOne).getAllByTestId(/day-cell-/)).toHaveLength(7);
    expect(within(weekOne).getAllByText("No session planned").length).toBeGreaterThan(0);
    expect(within(weekTwo).getAllByText("Rest day").length).toBeGreaterThan(0);
  });

  it("collapses past phases by default while current and future phases stay expanded", async () => {
    const user = userEvent.setup();
    render(<PlanViewer planData={SAMPLE_HIERARCHICAL_PLAN.plan_data} todayIso="2026-03-30" />);

    const baseSection = screen.getByTestId("phase-section-base-1-2");
    expect(within(baseSection).queryByTestId("week-card-1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Expand Base/i }));
    expect(within(baseSection).getByTestId("week-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("phase-section-peak-5-6")).toBeInTheDocument();
    expect(screen.getByTestId("week-card-5")).toBeInTheDocument();
  });

  it("renders a sticky horizontal timeline rail and mobile single-day pager", async () => {
    const user = userEvent.setup();
    render(<PlanViewer planData={SAMPLE_HIERARCHICAL_PLAN.plan_data} todayIso="2026-03-16" initialMobile />);

    expect(screen.getByTestId("phase-timeline")).toHaveAttribute("data-mobile", "true");
    expect(screen.getByTestId("phase-timeline")).toHaveAttribute("data-overflow-x", "true");
    const weekCard = screen.getByTestId("week-card-3");
    expect(within(weekCard).getByTestId("mobile-day-indicator-3")).toHaveTextContent("Day 1 of 7");

    await user.click(within(weekCard).getByRole("button", { name: /Next day/i }));
    expect(within(weekCard).getByTestId("mobile-day-indicator-3")).toHaveTextContent("Day 2 of 7");
  });
});

describe("Training Plan - surviving plan viewer surface", () => {
  it("does not render the retired weekly planner handoff trigger", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.queryByRole("button", { name: /Open in Weekly Plan/i })).not.toBeInTheDocument();
  });

  it("keeps the selected plan summary focused on race metadata and goal editing", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);

    expect(screen.getByText(/Goal for this plan/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(SAMPLE_PLAN.goal)).toBeInTheDocument();
    expect(screen.queryByText(/Weekly intent handoff/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/owns AI week generation and day-by-day edits/i)).not.toBeInTheDocument();
  });
});

describe("Training Plan — page structure", () => {
  it("renders the Training Plan heading", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByRole("heading", { name: /Training Plan/i })).toBeInTheDocument();
  });

  it("renders the hierarchical plan viewer when a plan exists", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);

    expect(screen.getByTestId("phase-timeline")).toBeInTheDocument();
    expect(screen.getByTestId("week-card-5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate Plan/i })).toBeInTheDocument();
  });

  it("keeps loading and empty plan states intact", () => {
    useAppData.mockReturnValue(makeAppData({
      hierarchicalPlan: {
        ...makeAppData().hierarchicalPlan,
        loading: true,
      },
    }));
    render(<LongTermPlanPage />);
    expect(screen.getByText("Loading plan...")).toBeInTheDocument();
  });

  it("keeps CoachFAB visible in the empty-plan state", async () => {
    const user = userEvent.setup();
    useAppData.mockReturnValue(makeAppData({
      hierarchicalPlan: {
        ...makeAppData().hierarchicalPlan,
        plan: null,
        loading: false,
      },
    }));

    render(<LongTermPlanPage />);

    expect(screen.getByText(/No training plan yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("coach-fab-button")).toBeInTheDocument();

    await user.click(screen.getByTestId("coach-fab-button"));

    expect(screen.getByTestId("coach-fab-panel")).toBeInTheDocument();
    expect(screen.getByText(/Ask questions while you set up your first plan/i)).toBeInTheDocument();
  });

  it("shows patch-unavailable guidance instead of apply controls when plan context is unavailable", async () => {
    const baseAppData = makeAppData();
    const assistantMessage = {
      id: "msg-assistant",
      conversation_id: "conv-1",
      role: "assistant",
      content: {
        text: "General guidance",
        patch: [{ week: 1, dayDate: "2026-03-02", workoutId: "w-1", fields: { durationMinutes: 40 } }],
        patchSummary: "Ease off Monday.",
      },
      created_at: new Date().toISOString(),
    };

    render(
      <ChatPanel
        coachConversations={baseAppData.coachConversations}
        activeConversation={{ id: "conv-1", title: "Existing conversation" }}
        messages={[assistantMessage]}
        hierarchicalPlan={{ ...baseAppData.hierarchicalPlan, plan: null }}
        activities={baseAppData.activities}
        dailyLogs={baseAppData.dailyLogs}
        checkins={baseAppData.checkins}
        runnerProfile={baseAppData.runnerProfile}
        trainingBlocks={baseAppData.trainingBlocks}
        activePlan={null}
        lang="en"
        canApplyPatch={false}
        patchUnavailableReason="Generate a plan first, then you can apply coach-proposed schedule changes from here."
      />
    );

    expect(screen.getByTestId("patch-unavailable-note")).toBeInTheDocument();
    expect(screen.queryByTestId("change-card-apply")).not.toBeInTheDocument();
    expect(screen.getByText(/Generate a plan first/i)).toBeInTheDocument();
  });

  it("opens a workout detail modal in summary mode with completion actions kept off the grid", async () => {
    const user = userEvent.setup();
    render(<PlanViewerHarness />);

    expect(screen.queryByRole("button", { name: /Mark complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark incomplete/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Peak marathon session/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: /Peak marathon session/i })).toBeInTheDocument();
    expect(within(dialog).getByText("Run")).toBeInTheDocument();
    expect(within(dialog).getByText("Workout")).toBeInTheDocument();
    expect(within(dialog).getByText("Z3")).toBeInTheDocument();
    expect(within(dialog).getByText("75 min")).toBeInTheDocument();
    expect(within(dialog).getByText("14 km")).toBeInTheDocument();
    expect(within(dialog).getByText("2 x 5 km at marathon effort with easy float.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Edit workout/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Mark complete/i })).toBeInTheDocument();
  });

  it("switches the selected workout from summary mode into an edit form with hierarchical field names", async () => {
    const user = userEvent.setup();
    render(<PlanViewerHarness />);

    await user.click(screen.getByRole("button", { name: /Peak marathon session/i }));
    await user.click(screen.getByRole("button", { name: /Edit workout/i }));

    expect(screen.getByLabelText("Sport")).toHaveAttribute("name", "sport");
    expect(screen.getByLabelText("Type")).toHaveAttribute("name", "type");
    expect(screen.getByLabelText("Workout name")).toHaveAttribute("name", "name");
    expect(screen.getByLabelText("Description")).toHaveAttribute("name", "description");
    expect(screen.getByLabelText("Duration")).toHaveAttribute("name", "durationMinutes");
    expect(screen.getByLabelText("Distance")).toHaveAttribute("name", "distanceKm");
    expect(screen.getByDisplayValue("Peak marathon session")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Specific marathon prep.")).toBeInTheDocument();
  });

  it("toggles workout completion from the modal and updates the visible action after save", async () => {
    const user = userEvent.setup();
    const appData = createInteractiveHierarchicalPlanAppData();
    useAppData.mockReturnValue(appData);
    render(<LongTermPlanPage />);

    await user.click(screen.getByRole("button", { name: /Peak marathon session/i }));
    await user.click(screen.getByRole("button", { name: /Mark complete/i }));

    await waitFor(() =>
      expect(appData.hierarchicalPlan.toggleWorkoutCompleted).toHaveBeenCalledWith(
        "w-14",
        5,
        "2026-04-02",
      )
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Mark incomplete/i })).toBeInTheDocument()
    );
  });

  it("saves modal edits through applyPatch with the viewer payload shape and redraws the grid", async () => {
    const user = userEvent.setup();
    const appData = createInteractiveHierarchicalPlanAppData();
    useAppData.mockReturnValue(appData);
    render(<LongTermPlanPage />);

    await user.click(screen.getByRole("button", { name: /Peak marathon session/i }));
    await user.click(screen.getByRole("button", { name: /Edit workout/i }));

    await user.clear(screen.getByLabelText("Workout name"));
    await user.type(screen.getByLabelText("Workout name"), "Peak marathon session updated");
    await user.clear(screen.getByLabelText("Duration"));
    await user.type(screen.getByLabelText("Duration"), "82");
    await user.clear(screen.getByLabelText("Distance"));
    await user.type(screen.getByLabelText("Distance"), "16");
    await user.click(screen.getByRole("button", { name: /Save workout/i }));

    await waitFor(() =>
      expect(appData.hierarchicalPlan.applyPatch).toHaveBeenCalledWith([
        {
          week: 5,
          dayDate: "2026-04-02",
          workoutId: "w-14",
          fields: {
            sport: "Run",
            type: "Workout",
            name: "Peak marathon session updated",
            description: "Specific marathon prep.",
            durationMinutes: 82,
            distanceKm: 16,
          },
        },
      ])
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Peak marathon session updated/i })).toBeInTheDocument()
    );
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
    expect(screen.getAllByText(/Introduce tempo and intervals/i).length).toBeGreaterThan(0);
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
