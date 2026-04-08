import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WeekReplanModal } from "../../src/components/planner/WeekReplanModal";

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { useAppData } from "../../src/context/AppDataContext";
import { getSupabaseClient } from "../../src/lib/supabaseClient";

const MOCK_WEEK = {
  weekNumber: 3,
  startDate: "2026-04-14",
  endDate: "2026-04-20",
  phase: "Build",
  focus: "Progressive aerobic load",
  days: [
    {
      date: "2026-04-14",
      dayOfWeek: "Monday",
      workouts: [{ id: "w1", type: "Easy", name: "Easy Run", distanceKm: 8, durationMinutes: null }],
    },
    {
      date: "2026-04-20",
      dayOfWeek: "Sunday",
      workouts: [],
    },
  ],
};

const mockHierarchicalPlan = {
  applyPatch: vi.fn().mockResolvedValue({}),
  loadPlan: vi.fn().mockResolvedValue({}),
};

beforeEach(() => {
  vi.clearAllMocks();
  useAppData.mockReturnValue({
    hierarchicalPlan: mockHierarchicalPlan,
    activities: { activities: [] },
    trainingBlocks: { blocks: [] },
    checkins: { checkins: [] },
  });
  getSupabaseClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          type: "conversation",
          content: "Got it! I'll adjust Thursday and Friday to rest days.",
          patches: null,
        },
        error: null,
      }),
    },
  });
});

describe("WeekReplanModal", () => {
  it("does not render when open=false", () => {
    render(<WeekReplanModal open={false} onOpenChange={vi.fn()} week={MOCK_WEEK} />);
    expect(screen.queryByText(/Replan Week 3/i)).not.toBeInTheDocument();
  });

  it("renders week number and phase in the left panel when open", () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);
    expect(screen.getAllByText(/Week 3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Build/).length).toBeGreaterThan(0);
  });

  it("shows the static opening message from the coach", () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);
    expect(screen.getByText(/Tell me what's happening this week/i)).toBeInTheDocument();
  });

  it("shows the day schedule in the left panel", () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);
    expect(screen.getByText(/Monday/i)).toBeInTheDocument();
    expect(screen.getByText(/Easy Run/i)).toBeInTheDocument();
  });

  it("has an enabled text input", () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);
    const input = screen.getByPlaceholderText(/Tell the coach/i);
    expect(input).toBeEnabled();
  });

  it("sends a message when the user types and submits", async () => {
    const supabaseMock = getSupabaseClient();
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);

    const input = screen.getByPlaceholderText(/Tell the coach/i);
    fireEvent.change(input, { target: { value: "Conference on Thursday" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith(
        "claude-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            newMessage: "Conference on Thursday",
            skipPersist: true,
          }),
        })
      );
    });
  });

  it("displays the assistant reply in the chat", async () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);

    const input = screen.getByPlaceholderText(/Tell the coach/i);
    fireEvent.change(input, { target: { value: "Move my run" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Got it! I'll adjust Thursday and Friday/i)).toBeInTheDocument();
    });
  });

  it("input stays enabled after receiving a reply (allows iterative chat)", async () => {
    render(<WeekReplanModal open={true} onOpenChange={vi.fn()} week={MOCK_WEEK} />);

    const input = screen.getByPlaceholderText(/Tell the coach/i);
    fireEvent.change(input, { target: { value: "First message" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/Got it!/i)).toBeInTheDocument();
    });

    expect(input).toBeEnabled();
  });
});
