/**
 * CoachPage tests
 *
 * Verifies:
 * - Page header and heading render
 * - Plan context banner shows goal race, phase, and target volume
 * - "No plan" message shown when no training plan exists
 * - Loading state while fetching AI insights
 * - Insight cards rendered after successful Gemini response
 * - Error message shown when the edge function fails
 * - Daily log wellness summary visible when logs exist
 * - Refresh button re-triggers the fetch
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoachPage from "../src/pages/CoachPage";
import { makeAppData, SAMPLE_DAILY_LOGS, SAMPLE_BLOCKS, SAMPLE_PLAN } from "./mockAppData";

vi.mock("../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: true,
}));

import { useAppData } from "../src/context/AppDataContext";
import { getSupabaseClient } from "../src/lib/supabaseClient";

// ── fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_INSIGHTS = [
  {
    type: "positive",
    icon: "trending",
    title: "Good training consistency",
    body: "Your running has been consistent this week. Keep building aerobic base.",
  },
  {
    type: "warning",
    icon: "fatigue",
    title: "Elevated fatigue — monitor recovery",
    body: "Your daily logs show elevated fatigue scores. Prioritize sleep and easy effort tomorrow.",
  },
];

function makeMockClient({
  session = { access_token: "test-token-abc" },
  insights = SAMPLE_INSIGHTS,
  invokeError = null,
  invokePending = false,
} = {}) {
  const invokeImpl = invokePending
    ? vi.fn().mockImplementation(() => new Promise(() => {}))
    : vi.fn().mockResolvedValue({
        data: invokeError ? null : { insights },
        error: invokeError,
      });

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
    functions: {
      invoke: invokeImpl,
    },
  };
}

function makeCoachAppData(overrides = {}) {
  return makeAppData({
    dailyLogs: {
      logs: SAMPLE_DAILY_LOGS,
      loading: false,
      error: null,
      loadLogs: vi.fn().mockResolvedValue(SAMPLE_DAILY_LOGS),
      saveLog: vi.fn(),
    },
    ...overrides,
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Coach page — structure", () => {
  it("renders the AI Coach heading", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByRole("heading", { name: /AI Coach/i })).toBeInTheDocument();
  });

  it("renders a Refresh coaching button", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // Button label changes to "Analyzing…" during auto-fetch; wait for it to return
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Refresh coaching/i })).toBeInTheDocument();
    });
  });
});

describe("Coach page — plan context banner", () => {
  it("shows the goal race name from the active plan", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(SAMPLE_PLAN.race)).toBeInTheDocument();
  });

  it("shows the race date", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(SAMPLE_PLAN.race_date)).toBeInTheDocument();
  });

  it("shows the current phase from training blocks", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // SAMPLE_BLOCKS has a Build block covering today (2026-02-24)
    expect(screen.getByText("Build")).toBeInTheDocument();
  });

  it("shows target volume from the active block", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // Build block has target_km: 65
    expect(screen.getByText(/65 km/i)).toBeInTheDocument();
  });

  it("shows 'Goal Race' label in the banner", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/Goal Race/i)).toBeInTheDocument();
  });

  it("shows 'Current Phase' label in the banner", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/Current Phase/i)).toBeInTheDocument();
  });
});

describe("Coach page — no plan state", () => {
  it("shows a no-plan message when plans list is empty", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
      }),
    );

    render(<CoachPage />);

    expect(screen.getByText(/Create a training plan/i)).toBeInTheDocument();
  });

  it("does not render the plan banner when no plan exists", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
      }),
    );

    render(<CoachPage />);

    expect(screen.queryByText(/Goal Race/i)).not.toBeInTheDocument();
  });
});

describe("Coach page — loading state", () => {
  it("shows loading text while waiting for Gemini response", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient({ invokePending: true }));
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByText(/Analyzing your training data/i)).toBeInTheDocument();
    });
  });

  it("disables the Refresh button while loading", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient({ invokePending: true }));
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Analyzing/i });
      expect(btn).toBeDisabled();
    });
  });
});

describe("Coach page — insight cards", () => {
  it("renders insight card titles after successful fetch", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_INSIGHTS[0].title)).toBeInTheDocument();
    });

    expect(screen.getByText(SAMPLE_INSIGHTS[1].title)).toBeInTheDocument();
  });

  it("renders insight card body text", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_INSIGHTS[0].body)).toBeInTheDocument();
    });
  });

  it("renders one card per insight returned", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      const cards = document.querySelectorAll(".coach-insight-card");
      expect(cards.length).toBe(SAMPLE_INSIGHTS.length);
    });
  });

  it("applies correct CSS class for insight type", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(document.querySelector(".coach-insight-card.is-positive")).toBeInTheDocument();
      expect(document.querySelector(".coach-insight-card.is-warning")).toBeInTheDocument();
    });
  });

  it("shows the 'Coaching insights' heading once insights are loaded", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Coaching insights/i })).toBeInTheDocument();
    });
  });
});

describe("Coach page — error state", () => {
  it("shows an error message when the edge function returns an error", async () => {
    getSupabaseClient.mockReturnValue(
      makeMockClient({ invokeError: { message: "Edge function timeout" } }),
    );
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows a 'Try again' button in the error state", async () => {
    getSupabaseClient.mockReturnValue(
      makeMockClient({ invokeError: { message: "Network error" } }),
    );
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
    });
  });

  it("shows an error when Supabase is not configured", async () => {
    getSupabaseClient.mockReturnValue(null);
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Supabase is not configured/i)).toBeInTheDocument();
    });
  });
});

describe("Coach page — daily log wellness summary", () => {
  it("shows wellness summary when daily logs exist", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/This week's wellness/i)).toBeInTheDocument();
  });

  it("shows log count in wellness summary", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // The count and label are split across elements; check the container text
    // SAMPLE_DAILY_LOGS has 3 logs all within the last 7 days
    const summary = document.querySelector(".coach-logs-summary");
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toMatch(/3/);
    expect(summary.textContent).toMatch(/log/i);
  });

  it("does not show wellness summary when no logs exist", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        dailyLogs: {
          logs: [],
          loading: false,
          error: null,
          loadLogs: vi.fn().mockResolvedValue([]),
          saveLog: vi.fn(),
        },
      }),
    );

    render(<CoachPage />);

    expect(screen.queryByText(/This week's wellness/i)).not.toBeInTheDocument();
  });
});

describe("Coach page — refresh button", () => {
  it("calls the edge function again when Refresh is clicked", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    // Wait for auto-fetch to complete
    await waitFor(() => {
      expect(screen.getByText(SAMPLE_INSIGHTS[0].title)).toBeInTheDocument();
    });

    // Click refresh
    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    // invoke should have been called twice (auto-fetch + manual)
    expect(mockClient.functions.invoke).toHaveBeenCalledTimes(2);
  });
});

describe("Coach page — edge function payload", () => {
  it("sends dailyLogs in the payload to the edge function", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            dailyLogs: expect.any(Array),
          }),
        }),
      );
    });
  });

  it("sends planContext with race name in the payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            planContext: expect.objectContaining({
              race: SAMPLE_PLAN.race,
            }),
          }),
        }),
      );
    });
  });

  it("sends weeklySummary array in the payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            weeklySummary: expect.any(Array),
          }),
        }),
      );
    });
  });
});
