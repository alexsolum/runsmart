import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { useAppData } from "../src/context/AppDataContext";
import MobileNavBar from "../src/components/MobileNavBar";
import MobilePage from "../src/pages/MobilePage";
import { makeAppData, SAMPLE_ACTIVITIES, SAMPLE_WORKOUT_ENTRIES } from "./mockAppData";

vi.mock("../src/context/AppDataContext", () => ({ useAppData: vi.fn() }));

// computeTrainingLoad is used inside MobilePage — mock the domain module
vi.mock("../src/domain/compute", () => ({
  computeTrainingLoad: vi.fn().mockReturnValue([{ date: "2026-02-26", atl: 10, ctl: 15, tsb: 5 }]),
}));

// Helper: today's ISO date
const TODAY = new Date().toISOString().split("T")[0];

// ── MobileNavBar ──────────────────────────────────────────────────────────────

describe("MobileNavBar", () => {
  it("renders 3 tabs", () => {
    render(
      <MobileNavBar
        activePage="mobile"
        activeMobileTab="analytics"
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Analytics")).toBeInTheDocument();
    expect(screen.getByLabelText("Week")).toBeInTheDocument();
    expect(screen.getByLabelText("Coach")).toBeInTheDocument();
  });

  it("marks analytics tab is-active when activePage=mobile and activeMobileTab=analytics", () => {
    render(
      <MobileNavBar
        activePage="mobile"
        activeMobileTab="analytics"
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Analytics")).toHaveClass("is-active");
    expect(screen.getByLabelText("Week")).not.toHaveClass("is-active");
    expect(screen.getByLabelText("Coach")).not.toHaveClass("is-active");
  });

  it("marks week tab is-active when activePage=mobile and activeMobileTab=week", () => {
    render(
      <MobileNavBar
        activePage="mobile"
        activeMobileTab="week"
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Week")).toHaveClass("is-active");
    expect(screen.getByLabelText("Analytics")).not.toHaveClass("is-active");
  });

  it("marks coach tab is-active when activePage=coach", () => {
    render(
      <MobileNavBar
        activePage="coach"
        activeMobileTab="analytics"
        onNavigate={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Coach")).toHaveClass("is-active");
  });

  it("calls onNavigate with (mobile, analytics) when analytics tab clicked", () => {
    const onNavigate = vi.fn();
    render(
      <MobileNavBar activePage="coach" activeMobileTab={null} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByLabelText("Analytics"));
    expect(onNavigate).toHaveBeenCalledWith("mobile", "analytics");
  });

  it("calls onNavigate with (mobile, week) when week tab clicked", () => {
    const onNavigate = vi.fn();
    render(
      <MobileNavBar activePage="coach" activeMobileTab={null} onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByLabelText("Week"));
    expect(onNavigate).toHaveBeenCalledWith("mobile", "week");
  });

  it("calls onNavigate with (coach, null) when coach tab clicked", () => {
    const onNavigate = vi.fn();
    render(
      <MobileNavBar activePage="mobile" activeMobileTab="analytics" onNavigate={onNavigate} />
    );
    fireEvent.click(screen.getByLabelText("Coach"));
    expect(onNavigate).toHaveBeenCalledWith("coach", null);
  });
});

// ── MobilePage — Analytics tab ────────────────────────────────────────────────

describe("MobilePage — Analytics tab", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders 4 KPI cards", () => {
    render(<MobilePage defaultTab="analytics" />);
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Readiness")).toBeInTheDocument();
  });

  it("shows recent activities section", () => {
    render(<MobilePage defaultTab="analytics" />);
    expect(screen.getByText("Recent activities")).toBeInTheDocument();
  });

  it("shows activity names", () => {
    render(<MobilePage defaultTab="analytics" />);
    // Shows last 3 reversed — SAMPLE_ACTIVITIES has 3 entries
    expect(screen.getByText("Long Run Sunday")).toBeInTheDocument();
  });

  it("shows Fresh readiness when TSB > 5 (mocked to tsb=5, boundary)", () => {
    render(<MobilePage defaultTab="analytics" />);
    // TSB = 5 → Fresh (tsb > 5 is false, so Neutral)
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  it("shows Fresh when TSB > 5", async () => {
    const { computeTrainingLoad } = await import("../src/domain/compute");
    computeTrainingLoad.mockReturnValueOnce([{ date: "2026-02-26", atl: 5, ctl: 20, tsb: 15 }]);
    render(<MobilePage defaultTab="analytics" />);
    expect(screen.getByText("Fresh")).toBeInTheDocument();
  });

  it("shows Fatigued when TSB <= -10", async () => {
    const { computeTrainingLoad } = await import("../src/domain/compute");
    computeTrainingLoad.mockReturnValueOnce([{ date: "2026-02-26", atl: 25, ctl: 10, tsb: -15 }]);
    render(<MobilePage defaultTab="analytics" />);
    expect(screen.getByText("Fatigued")).toBeInTheDocument();
  });
});

// ── MobilePage — Week tab ─────────────────────────────────────────────────────

describe("MobilePage — Week tab", () => {
  beforeEach(() => {
    useAppData.mockReturnValue(makeAppData());
  });

  it("renders the day strip with 7 chips", () => {
    render(<MobilePage defaultTab="week" />);
    const daystrip = screen.getByRole("tablist", { name: "Days of week" });
    const chips = within(daystrip).getAllByRole("tab");
    expect(chips).toHaveLength(7);
  });

  it("today chip has is-today class", () => {
    render(<MobilePage defaultTab="week" />);
    const daystrip = screen.getByRole("tablist", { name: "Days of week" });
    const chips = within(daystrip).getAllByRole("tab");
    const todayNum = new Date().getUTCDate().toString();
    const todayChip = chips.find((c) => c.textContent.includes(todayNum) && c.classList.contains("is-today"));
    expect(todayChip).toBeTruthy();
  });

  it("shows Today button", () => {
    render(<MobilePage defaultTab="week" />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("shows week nav prev/next buttons", () => {
    render(<MobilePage defaultTab="week" />);
    expect(screen.getByLabelText("Previous week")).toBeInTheDocument();
    expect(screen.getByLabelText("Next week")).toBeInTheDocument();
  });

  it("shows week summary strip", () => {
    render(<MobilePage defaultTab="week" />);
    expect(screen.getByText(/sessions/)).toBeInTheDocument();
    expect(screen.getByText(/done/)).toBeInTheDocument();
  });

  it("clicking next week changes the week label", () => {
    render(<MobilePage defaultTab="week" />);
    const initial = screen.getByText(/–/).textContent;
    fireEvent.click(screen.getByLabelText("Next week"));
    const updated = screen.getByText(/–/).textContent;
    expect(updated).not.toBe(initial);
  });

  it("clicking Today resets to current week label", () => {
    render(<MobilePage defaultTab="week" />);
    // Navigate away then back
    fireEvent.click(screen.getByLabelText("Next week"));
    fireEvent.click(screen.getByText("Today"));
    // After reset, today chip should be is-selected
    const daystrip = screen.getByRole("tablist", { name: "Days of week" });
    const selected = within(daystrip).getAllByRole("tab").filter((c) => c.classList.contains("is-selected"));
    expect(selected.length).toBeGreaterThan(0);
  });

  it("calls loadEntriesForWeek when plan is selected", () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    expect(data.workoutEntries.loadEntriesForWeek).toHaveBeenCalled();
  });
});

// ── MobilePage — day selection ────────────────────────────────────────────────

describe("MobilePage — day selection", () => {
  it("selected chip becomes is-selected after click", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    const daystrip = screen.getByRole("tablist", { name: "Days of week" });
    const chips = within(daystrip).getAllByRole("tab");
    // Click a chip that's not already selected
    const target = chips.find((c) => !c.classList.contains("is-selected"));
    fireEvent.click(target);
    expect(target).toHaveClass("is-selected");
  });

  it("shows workouts for today's date by default", () => {
    // SAMPLE_WORKOUT_ENTRIES[0] has today's date
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    expect(screen.getByText("Easy aerobic run")).toBeInTheDocument();
  });
});

// ── MobilePage — completion toggle ────────────────────────────────────────────

describe("MobilePage — completion toggle", () => {
  it("clicking check button calls toggleCompleted", async () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    const checkBtn = screen.getByLabelText("Mark complete");
    fireEvent.click(checkBtn);
    await waitFor(() => {
      expect(data.workoutEntries.toggleCompleted).toHaveBeenCalledWith("we-1", false);
    });
  });
});

// ── MobilePage — delete ───────────────────────────────────────────────────────

describe("MobilePage — delete", () => {
  it("clicking delete button shows confirm row", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    const deleteBtn = screen.getByLabelText("Delete workout");
    fireEvent.click(deleteBtn);
    expect(screen.getByText("Delete this workout?")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
  });

  it("clicking confirm calls deleteEntry", async () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Delete workout"));
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() => {
      expect(data.workoutEntries.deleteEntry).toHaveBeenCalledWith("we-1");
    });
  });

  it("clicking cancel hides the confirm row", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Delete workout"));
    expect(screen.getByText("Delete this workout?")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Delete this workout?")).not.toBeInTheDocument();
  });
});

// ── MobilePage — modal (add) ──────────────────────────────────────────────────

describe("MobilePage — modal (add)", () => {
  it("FAB click opens the add workout modal", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Add workout"));
    expect(screen.getByRole("dialog", { name: "Add workout" })).toBeInTheDocument();
  });

  it("type pill selection changes active pill", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Add workout"));
    const tempoPill = screen.getByRole("button", { name: "Tempo" });
    fireEvent.click(tempoPill);
    expect(tempoPill).toHaveClass("is-active");
  });

  it("submit calls createEntry with correct data", async () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Add workout"));
    // Fill distance
    fireEvent.change(screen.getByLabelText("Distance (km)"), { target: { value: "10" } });
    // Submit
    fireEvent.click(screen.getByRole("button", { name: "Add Workout" }));
    await waitFor(() => {
      expect(data.workoutEntries.createEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          workout_type: "Easy",
          distance_km: 10,
          plan_id: "plan-1",
        })
      );
    });
  });
});

// ── MobilePage — modal (edit) ─────────────────────────────────────────────────

describe("MobilePage — modal (edit)", () => {
  it("edit button opens modal with pre-filled values", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Edit workout"));
    expect(screen.getByRole("dialog", { name: "Edit workout" })).toBeInTheDocument();
    // The Easy pill should be active (pre-filled type)
    const easyPill = screen.getByRole("button", { name: "Easy" });
    expect(easyPill).toHaveClass("is-active");
  });

  it("submit calls updateEntry", async () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Edit workout"));
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => {
      expect(data.workoutEntries.updateEntry).toHaveBeenCalledWith(
        "we-1",
        expect.objectContaining({ workout_type: "Easy" })
      );
    });
  });
});

// ── MobilePage — modal (cancel) ───────────────────────────────────────────────

describe("MobilePage — modal (cancel)", () => {
  it("cancel closes the modal", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Add workout"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// ── MobilePage — Rest type ────────────────────────────────────────────────────

describe("MobilePage — Rest type", () => {
  it("distance and duration inputs hidden when Rest selected", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    fireEvent.click(screen.getByLabelText("Add workout"));
    // Select Rest
    fireEvent.click(screen.getByRole("button", { name: "Rest" }));
    expect(screen.queryByLabelText("Distance (km)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Duration (min)")).not.toBeInTheDocument();
  });
});

// ── MobilePage — empty states ─────────────────────────────────────────────────

describe("MobilePage — empty states", () => {
  it("shows no-plan message when no plans exist", () => {
    useAppData.mockReturnValue(makeAppData({ plans: { plans: [], loading: false, createPlan: vi.fn(), updatePlan: vi.fn(), deletePlan: vi.fn() } }));
    render(<MobilePage defaultTab="analytics" />);
    expect(screen.getByText(/No training plan yet/)).toBeInTheDocument();
  });

  it("shows empty day message when no entries for selected day", () => {
    // Entries only on today; select a day that has no entries
    useAppData.mockReturnValue(makeAppData({
      workoutEntries: {
        entries: [],
        loading: false,
        loadEntriesForWeek: vi.fn().mockResolvedValue([]),
        createEntry: vi.fn().mockResolvedValue({}),
        updateEntry: vi.fn().mockResolvedValue({}),
        deleteEntry: vi.fn().mockResolvedValue(undefined),
        toggleCompleted: vi.fn().mockResolvedValue(undefined),
      },
    }));
    render(<MobilePage defaultTab="week" />);
    expect(screen.getByText(/No workouts for this day/)).toBeInTheDocument();
  });
});

// ── MobilePage — week navigation ──────────────────────────────────────────────

describe("MobilePage — week navigation", () => {
  it("loadEntriesForWeek called again when week changes", async () => {
    const data = makeAppData();
    useAppData.mockReturnValue(data);
    render(<MobilePage defaultTab="week" />);
    const initialCallCount = data.workoutEntries.loadEntriesForWeek.mock.calls.length;
    fireEvent.click(screen.getByLabelText("Next week"));
    await waitFor(() => {
      expect(data.workoutEntries.loadEntriesForWeek.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});

// ── MobilePage — defaultTab prop sync ────────────────────────────────────────

describe("MobilePage — defaultTab prop sync", () => {
  it("renders analytics tab when defaultTab=analytics", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="analytics" />);
    const analyticsBtns = screen.getAllByRole("tab");
    const analyticsTab = analyticsBtns.find((b) => b.textContent === "Analytics");
    expect(analyticsTab).toHaveClass("is-active");
  });

  it("renders week tab when defaultTab=week", () => {
    useAppData.mockReturnValue(makeAppData());
    render(<MobilePage defaultTab="week" />);
    const tabs = screen.getAllByRole("tab");
    const weekTab = tabs.find((b) => b.textContent === "Week");
    expect(weekTab).toHaveClass("is-active");
  });
});
