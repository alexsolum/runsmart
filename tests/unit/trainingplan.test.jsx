/**
 * Training Plan page tests (LongTermPlanPage)
 *
 * Verifies that the long-term plan is presented as phase blocks stretching
 * across weeks, with create/edit/delete functionality backed by Supabase.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LongTermPlanPage from "../../src/pages/LongTermPlanPage";
import { makeAppData, SAMPLE_BLOCKS, SAMPLE_PLAN } from "./mockAppData";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";

beforeEach(() => {
  vi.clearAllMocks();
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

  it("renders phase summary bar when blocks exist", () => {
    render(<LongTermPlanPage />);
    expect(document.querySelector(".ltp-phase-bar")).toBeInTheDocument();
  });

  it("displays each block phase name", () => {
    render(<LongTermPlanPage />);
    // SAMPLE_BLOCKS has Base and Build phases
    const timeline = document.querySelector(".ltp-timeline");
    expect(within(timeline).getByText("Base")).toBeInTheDocument();
    expect(within(timeline).getByText("Build")).toBeInTheDocument();
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

// ─── Goal field ───────────────────────────────────────────────────────────────

describe("Training Plan — goal field", () => {
  it("renders the 'Goal for this plan' textarea", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    expect(screen.getByPlaceholderText(/Finish my first 100K/i)).toBeInTheDocument();
  });

  it("pre-fills the textarea with the plan's saved goal", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<LongTermPlanPage />);
    const textarea = screen.getByPlaceholderText(/Finish my first 100K/i);
    // SAMPLE_PLAN.goal = "Finish under 3:30 and stay injury-free"
    expect(textarea.value).toBe("Finish under 3:30 and stay injury-free");
  });

  it("calls updatePlan with { goal } on blur", async () => {
    const updatePlan = vi.fn().mockResolvedValue({ ...SAMPLE_PLAN, goal: "Sub-3h marathon" });
    useAppData.mockReturnValue(makeAppData({
      plans: {
        plans: [SAMPLE_PLAN],
        loading: false,
        createPlan: vi.fn(),
        updatePlan,
        deletePlan: vi.fn(),
      },
    }));

    const user = userEvent.setup();
    render(<LongTermPlanPage />);

    const textarea = screen.getByPlaceholderText(/Finish my first 100K/i);
    await user.clear(textarea);
    await user.type(textarea, "Sub-3h marathon");
    await user.tab(); // trigger onBlur → handleSaveGoal

    expect(updatePlan).toHaveBeenCalledWith(SAMPLE_PLAN.id, { goal: "Sub-3h marathon" });
  });

  it("saves null when the goal textarea is cleared", async () => {
    const updatePlan = vi.fn().mockResolvedValue({ ...SAMPLE_PLAN, goal: null });
    useAppData.mockReturnValue(makeAppData({
      plans: {
        plans: [SAMPLE_PLAN],
        loading: false,
        createPlan: vi.fn(),
        updatePlan,
        deletePlan: vi.fn(),
      },
    }));

    const user = userEvent.setup();
    render(<LongTermPlanPage />);

    const textarea = screen.getByPlaceholderText(/Finish my first 100K/i);
    await user.clear(textarea);
    await user.tab();

    expect(updatePlan).toHaveBeenCalledWith(SAMPLE_PLAN.id, { goal: null });
  });
});
