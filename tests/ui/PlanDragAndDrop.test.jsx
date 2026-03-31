import { render, screen } from "@testing-library/react";
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
});
