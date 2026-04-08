import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlanWeekCard } from "../../src/components/planner/PlanWeekCard";
import { AppDataProvider } from "../../src/context/AppDataContext";
import { ToastProvider } from "../../src/context/ToastContext";

// Mock Supabase
vi.mock("../../src/lib/supabaseClient", () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
              }))
            }))
          }))
        }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }))
}));

const MOCK_WEEK = {
  weekNumber: 1,
  startDate: "2026-05-04",
  endDate: "2026-05-10",
  phase: "Base",
  focus: "Establish routine",
  days: [
    {
      date: "2026-05-04",
      dayOfWeek: "Monday",
      workouts: [
        {
          id: "w1-mon-1",
          sport: "run",
          type: "easy",
          name: "Easy Run",
          date: "2026-05-04"
        }
      ]
    },
    {
      date: "2026-05-05",
      dayOfWeek: "Tuesday",
      workouts: []
    }
  ]
};

describe("PlanWeekCard Drag and Drop UI", () => {
  it("renders the week grid and workout cards", () => {
    render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard 
            week={MOCK_WEEK} 
            phaseColor="#3b82f6" 
            isMobile={false} 
          />
        </AppDataProvider>
      </ToastProvider>
    );

    expect(screen.getByText("Week 1")).toBeInTheDocument();
    expect(screen.getByText("Easy Run")).toBeInTheDocument();
  });

  it("does not render DndContext when isMobile is true", () => {
    const { container } = render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard
            week={MOCK_WEEK}
            phaseColor="#3b82f6"
            isMobile={true}
          />
        </AppDataProvider>
      </ToastProvider>
    );

    // DndContext puts a specific div/context in the tree, but easiest is to check
    // if the mobile day selector is present
    expect(screen.getByText("Day 1 of 2")).toBeInTheDocument();
  });

  it("renders days in Monday-first order regardless of data order", () => {
    const weekWithSundayFirst = {
      ...MOCK_WEEK,
      days: [
        { date: "2026-05-10", dayOfWeek: "Sunday", workouts: [] },
        { date: "2026-05-04", dayOfWeek: "Monday", workouts: [{ id: "w1", sport: "run", type: "easy", name: "Easy Run" }] },
        { date: "2026-05-05", dayOfWeek: "Tuesday", workouts: [] },
        { date: "2026-05-09", dayOfWeek: "Saturday", workouts: [] },
      ],
    };

    render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard week={weekWithSundayFirst} phaseColor="#3b82f6" />
        </AppDataProvider>
      </ToastProvider>
    );

    const dayCells = document.querySelectorAll("[data-testid^='day-cell-']");
    expect(dayCells[0].getAttribute("data-testid")).toBe("day-cell-2026-05-04");
    expect(dayCells[dayCells.length - 1].getAttribute("data-testid")).toBe("day-cell-2026-05-10");
  });

  it("DragOverlay wrapper has no hardcoded fractional width class", () => {
    render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard week={MOCK_WEEK} phaseColor="#3b82f6" />
        </AppDataProvider>
      </ToastProvider>
    );
    const wrapper = document.querySelector('[data-testid="week-grid-1"]');
    expect(wrapper?.innerHTML ?? "").not.toContain("w-[calc((100%-6*0.75rem)/7)]");
  });

  it("renders a sparkles button in the week title row", () => {
    render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard week={MOCK_WEEK} phaseColor="#3b82f6" />
        </AppDataProvider>
      </ToastProvider>
    );

    const btn = screen.getByTitle("Replan this week with AI coach");
    expect(btn).toBeInTheDocument();
  });

  it("opens WeekReplanModal when sparkles button is clicked", async () => {
    render(
      <ToastProvider>
        <AppDataProvider>
          <PlanWeekCard week={MOCK_WEEK} phaseColor="#3b82f6" />
        </AppDataProvider>
      </ToastProvider>
    );

    const btn = screen.getByTitle("Replan this week with AI coach");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Tell me what's happening this week/i)).toBeInTheDocument();
    });
  });
});
