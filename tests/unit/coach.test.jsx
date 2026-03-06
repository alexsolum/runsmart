/**
 * CoachPage tests
 *
 * Covers:
 * - Branding: "Marius AI Bakken" heading + coach avatar
 * - Conversation sidebar: list, create, select, delete
 * - Initial coaching: Refresh button, loading, insight cards, edge function payload
 * - Follow-up messages: input, edge function, message persistence
 * - Plan context banner, no-plan state
 * - Daily log wellness summary
 * - Runner profile section
 * - Error state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, renderHook, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoachPage from "../../src/pages/CoachPage";
import AdminPhilosophyPage from "../../src/pages/AdminPhilosophyPage";
import { useCoachPhilosophy } from "../../src/hooks/useCoachPhilosophy";
import {
  makeAppData,
  SAMPLE_CHECKINS,
  SAMPLE_DAILY_LOGS,
  SAMPLE_BLOCKS,
  SAMPLE_PLAN,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
} from "./mockAppData";
import { setLanguage } from "../../src/i18n/translations";

// Reset language to English for consistent test output; Norwegian is default in app
beforeEach(() => { setLanguage("en"); });
afterEach(() => { setLanguage("no"); });

vi.mock("../../src/context/AppDataContext", () => ({
  useAppData: vi.fn(),
}));

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: true,
}));

import { useAppData } from "../../src/context/AppDataContext";
import { getSupabaseClient } from "../../src/lib/supabaseClient";
import { buildCoachPayload } from "../../src/lib/coachPayload";

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

const SAMPLE_PLAN_DATA = {
  coaching_feedback:
    "Your training over the last 4 weeks shows solid aerobic consistency. Keep total volume in range this week and prioritize recovery after the long run.",
  adaptation_summary:
    "Fatigue trend across 3 check-ins drove a load reduction this week. Long run remains Sunday anchor. Intensity sessions reduced from 2 to 1 given elevated fatigue.",
  structured_plan: [
    { date: "2026-03-09", workout_type: "Easy", distance_km: 8, duration_min: 50, description: "Easy aerobic run at comfortable conversational pace." },
    { date: "2026-03-10", workout_type: "Rest", distance_km: 0, duration_min: 0, description: "Full rest day. Focus on sleep and nutrition." },
    { date: "2026-03-11", workout_type: "Tempo", distance_km: 10, duration_min: 60, description: "Tempo run at threshold effort, 3x10min blocks." },
    { date: "2026-03-12", workout_type: "Easy", distance_km: 6, duration_min: 40, description: "Easy recovery run to flush out fatigue." },
    { date: "2026-03-13", workout_type: "Rest", distance_km: 0, duration_min: 0, description: "Rest or gentle stretching." },
    { date: "2026-03-14", workout_type: "Easy", distance_km: 8, duration_min: 50, description: "Easy aerobic run with strides at the end." },
    { date: "2026-03-15", workout_type: "Long Run", distance_km: 20, duration_min: 130, description: "Long run at easy effort, negative split." },
  ],
};

// ── mock builders ─────────────────────────────────────────────────────────────

function makeMockClient({
  session = { access_token: "test-token-abc" },
  insights = SAMPLE_INSIGHTS,
  followupText = "Here is my tailored coaching advice based on your training.",
  planData = SAMPLE_PLAN_DATA,
  invokeError = null,
  invokePending = false,
} = {}) {
  const invokeImpl = invokePending
    ? vi.fn().mockImplementation(() => new Promise(() => {}))
    : vi.fn().mockImplementation((_fnName, { body }) => {
        if (invokeError) {
          return Promise.resolve({ data: null, error: invokeError });
        }
        if (body?.mode === "followup") {
          return Promise.resolve({ data: { text: followupText }, error: null });
        }
        if (body?.mode === "plan" || body?.mode === "plan_revision") {
          return Promise.resolve({ data: planData, error: null });
        }
        return Promise.resolve({ data: { insights }, error: null });
      });

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
    functions: { invoke: invokeImpl },
  };
}

function makeConvData(overrides = {}) {
  return {
    conversations: [],
    activeConversation: null,
    messages: [],
    loading: false,
    error: null,
    loadConversations: vi.fn().mockResolvedValue([]),
    loadMessages: vi.fn().mockResolvedValue([]),
    createConversation: vi.fn().mockResolvedValue(SAMPLE_CONVERSATIONS[0]),
    addMessage: vi.fn().mockImplementation((convId, role, content) =>
      Promise.resolve({ id: `msg-${Date.now()}`, conversation_id: convId, role, content, created_at: new Date().toISOString() })
    ),
    updateConversationTitle: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    setActiveConversation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
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

// App data with an active conversation that has no messages (new/empty)
function makeAppDataWithNewConv(extraOverrides = {}) {
  return makeCoachAppData({
    coachConversations: makeConvData({
      conversations: [SAMPLE_CONVERSATIONS[0]],
      activeConversation: SAMPLE_CONVERSATIONS[0],
      messages: [],
    }),
    ...extraOverrides,
  });
}

// App data with an active conversation that has messages (follow-up ready)
function makeAppDataWithMessages(msgOverrides = SAMPLE_MESSAGES) {
  return makeCoachAppData({
    coachConversations: makeConvData({
      conversations: [SAMPLE_CONVERSATIONS[0]],
      activeConversation: SAMPLE_CONVERSATIONS[0],
      messages: msgOverrides,
    }),
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("coach payload builder", () => {
  it("reloads activities, daily logs, and check-ins before payload construction", async () => {
    const freshActivity = {
      started_at: new Date().toISOString(),
      distance: 10000,
      moving_time: 3200,
      perceived_effort: 3,
      name: "Fresh run",
    };
    const freshLog = {
      log_date: new Date().toISOString().split("T")[0],
      sleep_hours: 7,
      sleep_quality: 4,
      fatigue: 2,
      mood: 4,
      stress: 2,
      training_quality: 4,
      resting_hr: 50,
      notes: "good day",
    };
    const freshCheckin = {
      fatigue: 3,
      sleep_quality: 4,
      motivation: 5,
      recovery_score: 4,
      niggles: "none",
      week_of: "2026-03-02",
      created_at: "2026-03-05T09:00:00Z",
    };
    const loadActivities = vi.fn().mockResolvedValue([freshActivity]);
    const loadLogs = vi.fn().mockResolvedValue([freshLog]);
    const loadCheckins = vi.fn().mockResolvedValue([freshCheckin]);

    const payload = await buildCoachPayload({
      activities: { activities: [], loadActivities },
      dailyLogs: { logs: [], loadLogs },
      checkins: { checkins: [], loadCheckins },
      activePlan: SAMPLE_PLAN,
      trainingBlocks: { blocks: SAMPLE_BLOCKS },
      runnerProfile: { background: "" },
      lang: "en",
    });

    expect(loadActivities).toHaveBeenCalledTimes(1);
    expect(loadLogs).toHaveBeenCalledTimes(1);
    expect(loadCheckins).toHaveBeenCalledTimes(1);
    expect(payload.recentActivities[0]).toMatchObject({ name: "Fresh run" });
    expect(payload.dailyLogs[0]).toMatchObject({ sleep_quality: 4, fatigue: 2 });
    expect(payload.latestCheckin).toMatchObject({
      fatigue: 3,
      sleepQuality: 4,
      sleep_quality: 4,
      motivation: 5,
      recovery: 4,
      recovery_score: 4,
      weekOf: "2026-03-02",
      week_of: "2026-03-02",
      createdAt: "2026-03-05T09:00:00Z",
      created_at: "2026-03-05T09:00:00Z",
    });
  });
});

// ── Branding ──────────────────────────────────────────────────────────────────

describe("Coach page — branding", () => {
  it("renders the Marius AI Bakken heading", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByRole("heading", { name: /Marius AI Bakken/i })).toBeInTheDocument();
  });

  it("renders the coach avatar", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // Avatar appears in header (and potentially elsewhere); confirm at least one is rendered
    const avatars = screen.getAllByRole("img", { name: /Marius AI Bakken/i });
    expect(avatars.length).toBeGreaterThan(0);
  });

  it("renders the 'Your AI running coach' subtitle", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/Your AI running coach/i)).toBeInTheDocument();
  });
});

// ── Conversation sidebar ───────────────────────────────────────────────────────

describe("Coach page — conversation sidebar", () => {
  it("renders a New conversation button", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByRole("button", { name: /New conversation/i })).toBeInTheDocument();
  });

  it("calls loadConversations on mount", () => {
    const loadConversations = vi.fn().mockResolvedValue([]);
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({ loadConversations }),
      })
    );

    render(<CoachPage />);

    expect(loadConversations).toHaveBeenCalledTimes(1);
  });

  it("renders conversation titles when conversations exist", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({ conversations: SAMPLE_CONVERSATIONS }),
      })
    );

    render(<CoachPage />);

    expect(screen.getByText(SAMPLE_CONVERSATIONS[0].title)).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_CONVERSATIONS[1].title)).toBeInTheDocument();
  });

  it("shows delete buttons for each conversation", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({ conversations: SAMPLE_CONVERSATIONS }),
      })
    );

    render(<CoachPage />);

    const deleteBtns = screen.getAllByRole("button", { name: /Delete conversation/i });
    expect(deleteBtns).toHaveLength(SAMPLE_CONVERSATIONS.length);
  });

  it("calls createConversation when New conversation is clicked", async () => {
    const createConversation = vi.fn().mockResolvedValue(SAMPLE_CONVERSATIONS[0]);
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({ createConversation }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /New conversation/i }));

    expect(createConversation).toHaveBeenCalledWith("New conversation");
  });

  it("calls setActiveConversation when a conversation is clicked", async () => {
    const setActiveConversation = vi.fn().mockResolvedValue(undefined);
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: SAMPLE_CONVERSATIONS,
          setActiveConversation,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByText(SAMPLE_CONVERSATIONS[1].title));

    expect(setActiveConversation).toHaveBeenCalledWith(SAMPLE_CONVERSATIONS[1]);
  });

  it("shows inline confirmation when delete is clicked", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({ conversations: [SAMPLE_CONVERSATIONS[0]] }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Delete conversation: Good training/i }));

    expect(screen.getByText(/Delete this conversation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("calls deleteConversation after inline confirmation", async () => {
    const deleteConversation = vi.fn().mockResolvedValue(undefined);
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
          deleteConversation,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Delete conversation: Good training/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(deleteConversation).toHaveBeenCalledWith(SAMPLE_CONVERSATIONS[0].id);
  });

  it("cancels deletion when Cancel is clicked", async () => {
    const deleteConversation = vi.fn();
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
          deleteConversation,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Delete conversation: Good training/i }));
    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(deleteConversation).not.toHaveBeenCalled();
    expect(screen.queryByText(/Delete this conversation/i)).not.toBeInTheDocument();
  });
});

// ── Plan context banner ────────────────────────────────────────────────────────

describe("Coach page — plan context banner", () => {
  it("shows the goal race name from the active plan", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(SAMPLE_PLAN.race)).toBeInTheDocument();
  });

  it("shows the race date", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(SAMPLE_PLAN.race_date)).toBeInTheDocument();
  });

  it("shows the current phase from training blocks", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText("Build")).toBeInTheDocument();
  });

  it("shows target volume from the active block", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

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

// ── No plan state ─────────────────────────────────────────────────────────────

describe("Coach page — no plan state", () => {
  it("shows a no-plan message when plans list is empty", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
      })
    );

    render(<CoachPage />);

    expect(screen.getByText(/Create a training plan/i)).toBeInTheDocument();
  });

  it("does not render the plan banner when no plan exists", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [], loading: false, createPlan: vi.fn(), deletePlan: vi.fn() },
      })
    );

    render(<CoachPage />);

    expect(screen.queryByText(/Goal Race/i)).not.toBeInTheDocument();
  });
});

// ── Initial coaching ──────────────────────────────────────────────────────────

describe("Coach page — initial coaching", () => {
  it("shows Refresh coaching button when there is an active conversation with no messages", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    render(<CoachPage />);

    expect(screen.getByRole("button", { name: /Refresh coaching/i })).toBeInTheDocument();
  });

  it("shows loading text while waiting for Gemini response", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient({ invokePending: true }));
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByText(/Analyzing your training data/i)).toBeInTheDocument();
    });
  });

  it("disables the Refresh button while loading", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient({ invokePending: true }));
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Analyzing/i })).toBeDisabled();
    });
  });

  it("renders insight card titles after clicking Refresh", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    // InsightCard renders titles in h4 elements; the sidebar uses <p>, so target headings
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: SAMPLE_INSIGHTS[0].title })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: SAMPLE_INSIGHTS[1].title })).toBeInTheDocument();
  });

  it("renders insight card body text", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByText(SAMPLE_INSIGHTS[0].body)).toBeInTheDocument();
    });
  });

  it("renders one insight card per insight returned", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      const cards = document.querySelectorAll(".coach-insight-card");
      expect(cards.length).toBe(SAMPLE_INSIGHTS.length);
    });
  });

  it("applies correct CSS class for insight type", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(document.querySelector(".coach-insight-card.is-positive")).toBeInTheDocument();
      expect(document.querySelector(".coach-insight-card.is-warning")).toBeInTheDocument();
    });
  });

  it("calls the edge function with mode=initial", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ mode: "initial" }),
        })
      );
    });
  });

  it("saves an initial request user message and an assistant message", async () => {
    const addMessage = vi.fn().mockImplementation((convId, role, content) =>
      Promise.resolve({ id: `msg-${Date.now()}`, conversation_id: convId, role, content, created_at: new Date().toISOString() })
    );
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeAppDataWithNewConv({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
          activeConversation: SAMPLE_CONVERSATIONS[0],
          messages: [],
          addMessage,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledTimes(2);
    });

    const [userCall, assistantCall] = addMessage.mock.calls;
    expect(userCall[1]).toBe("user");
    expect(userCall[2]).toEqual({ type: "initial_request" });
    expect(assistantCall[1]).toBe("assistant");
    expect(Array.isArray(assistantCall[2])).toBe(true);
  });

  it("auto-generates a conversation title after initial response", async () => {
    const updateConversationTitle = vi.fn().mockResolvedValue(undefined);
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeAppDataWithNewConv({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
          activeConversation: SAMPLE_CONVERSATIONS[0],
          messages: [],
          updateConversationTitle,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(updateConversationTitle).toHaveBeenCalledWith(
        SAMPLE_CONVERSATIONS[0].id,
        expect.any(String)
      );
    });
  });

  it("sends dailyLogs in the initial payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ dailyLogs: expect.any(Array) }),
        })
      );
    });
  });

  it("sends planContext with race name in the initial payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            planContext: expect.objectContaining({ race: SAMPLE_PLAN.race }),
          }),
        })
      );
    });
  });

  it("forwards lang in edge function payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: expect.stringMatching(/^(en|no)$/) }),
        })
      );
    });
  });

  it("forwards lang=no to edge function when language is Norwegian", async () => {
    setLanguage("no");
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Oppdater coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: "no" }),
        })
      );
    });
  });

  it("includes recentCheckins array in initial coaching payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    const appData = makeAppDataWithNewConv({
      checkins: {
        checkins: SAMPLE_CHECKINS,
        loading: false,
        loadCheckins: vi.fn().mockResolvedValue(SAMPLE_CHECKINS),
      },
    });
    useAppData.mockReturnValue(appData);

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      const invokeCall = mockClient.functions.invoke.mock.calls.find(
        ([_fn, opts]) => !opts?.body?.mode || opts?.body?.mode === "initial"
      );
      expect(invokeCall).toBeDefined();
      const body = invokeCall[1].body;
      expect(Array.isArray(body.recentCheckins)).toBe(true);
      expect(body.recentCheckins.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ── Follow-up messages ────────────────────────────────────────────────────────

describe("Coach page — follow-up messages", () => {
  it("shows a text input when the conversation has messages", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithMessages());

    render(<CoachPage />);

    expect(screen.getByPlaceholderText(/Ask a follow-up question/i)).toBeInTheDocument();
  });

  it("shows a Send button when the conversation has messages", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithMessages());

    render(<CoachPage />);

    expect(screen.getByRole("button", { name: /Send/i })).toBeInTheDocument();
  });

  it("calls the edge function with mode=followup when a message is sent", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithMessages());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.type(screen.getByPlaceholderText(/Ask a follow-up question/i), "What pace should I run?");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ mode: "followup" }),
        })
      );
    });
  });

  it("includes conversationHistory in the follow-up payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithMessages());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.type(screen.getByPlaceholderText(/Ask a follow-up question/i), "How is my training load?");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            conversationHistory: expect.any(Array),
          }),
        })
      );
    });
  });

  it("saves user message and assistant response via addMessage", async () => {
    const addMessage = vi.fn().mockImplementation((convId, role, content) =>
      Promise.resolve({ id: `msg-${Date.now()}`, conversation_id: convId, role, content, created_at: new Date().toISOString() })
    );
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
          activeConversation: SAMPLE_CONVERSATIONS[0],
          messages: SAMPLE_MESSAGES,
          addMessage,
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.type(screen.getByPlaceholderText(/Ask a follow-up question/i), "What should I focus on?");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(addMessage).toHaveBeenCalledTimes(2);
    });

    const calls = addMessage.mock.calls;
    expect(calls[0][1]).toBe("user");
    expect(calls[0][2]).toEqual({ text: "What should I focus on?" });
    expect(calls[1][1]).toBe("assistant");
    expect(calls[1][2]).toMatchObject({ text: expect.any(String) });
  });

  it("clears input field after sending", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithMessages());

    const user = userEvent.setup();
    render(<CoachPage />);

    const input = screen.getByPlaceholderText(/Ask a follow-up question/i);
    await user.type(input, "Tell me more about recovery");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(input).toHaveValue("");
    });
  });

  it("renders existing messages from the active conversation", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithMessages());

    render(<CoachPage />);

    // SAMPLE_MESSAGES has an assistant message with content that renders as InsightCard.
    // "Good training consistency" appears both in the sidebar title and the InsightCard h4.
    const matches = screen.getAllByText("Good training consistency");
    expect(matches.length).toBeGreaterThan(0);
    // The InsightCard renders an h4 with the title
    expect(document.querySelector(".coach-insight-card")).toBeInTheDocument();
  });

  it("forwards lang in followup payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithMessages());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.type(screen.getByPlaceholderText(/Ask a follow-up question/i), "What pace should I run?");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: expect.stringMatching(/^(en|no)$/) }),
        })
      );
    });
  });

  it("forwards lang=no in followup payload when language is Norwegian", async () => {
    setLanguage("no");
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeAppDataWithMessages());

    const user = userEvent.setup();
    render(<CoachPage />);

    // Norwegian placeholder: "Still et oppfølgingsspørsmål…"
    await user.type(screen.getByPlaceholderText(/Still|Ask/i), "Hva er riktig tempo?");
    await user.click(screen.getByRole("button", { name: /Send/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: "no" }),
        })
      );
    });
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe("Coach page — error state", () => {
  it("shows an error message when the edge function returns an error", async () => {
    getSupabaseClient.mockReturnValue(
      makeMockClient({ invokeError: { message: "Edge function timeout" } })
    );
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows the error message text", async () => {
    getSupabaseClient.mockReturnValue(
      makeMockClient({ invokeError: { message: "Network error" } })
    );
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByText(/Coach request failed/i)).toBeInTheDocument();
    });
  });

  it("shows an error when Supabase is not configured", async () => {
    getSupabaseClient.mockReturnValue(null);
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Supabase is not configured/i)).toBeInTheDocument();
    });
  });
});

// ── Daily log wellness summary ────────────────────────────────────────────────

describe("Coach page — daily log wellness summary", () => {
  it("shows wellness summary when daily logs exist", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/Last 7 days/i)).toBeInTheDocument();
  });

  it("shows log count in wellness summary", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

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
      })
    );

    render(<CoachPage />);

    expect(screen.queryByText(/Last 7 days/i)).not.toBeInTheDocument();
  });
});

// ── Runner profile ────────────────────────────────────────────────────────────

describe("Coach page — runner profile", () => {
  it("renders the About you section", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/About you/i)).toBeInTheDocument();
  });

  it("renders a Running background textarea", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByLabelText(/Running background/i)).toBeInTheDocument();
  });

  it("shows a hint pointing to the Training Plan page for the plan goal", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByText(/Training Plan/i, { selector: "strong" })).toBeInTheDocument();
  });

  it("sends runnerProfile in the initial payload when background is set", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(
      makeAppDataWithNewConv({
        runnerProfile: {
          background: "Trail runner, 3 years",
          loading: false,
          error: null,
          loadProfile: vi.fn().mockResolvedValue(undefined),
          saveProfile: vi.fn().mockResolvedValue(undefined),
        },
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            runnerProfile: expect.objectContaining({ background: "Trail runner, 3 years" }),
          }),
        })
      );
    });
  });

  it("sends null runnerProfile when no background and no plan goal are set", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(
      makeAppDataWithNewConv({
        plans: {
          plans: [{ ...SAMPLE_PLAN, goal: null }],
          loading: false,
          createPlan: vi.fn(),
          updatePlan: vi.fn(),
          deletePlan: vi.fn(),
        },
        runnerProfile: {
          background: "",
          loading: false,
          error: null,
          loadProfile: vi.fn().mockResolvedValue(undefined),
          saveProfile: vi.fn().mockResolvedValue(undefined),
        },
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ runnerProfile: null }),
        })
      );
    });
  });
});

// ── Plan tab ──────────────────────────────────────────────────────────────────

describe("Coach page — plan tab", () => {
  it("renders Weekly Plan tab button", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    expect(screen.getByRole("button", { name: /Weekly Plan/i })).toBeInTheDocument();
  });

  it("shows Generate Weekly Plan button when plan tab is active", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));

    expect(screen.getAllByRole("button", { name: /Generate Weekly Plan/i }).length).toBeGreaterThan(0);
  });

  it("calls edge function with mode=plan when Generate Weekly Plan is clicked", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ mode: "plan" }),
        })
      );
    });
  });

  it("forwards lang in plan generation payload", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: expect.stringMatching(/^(en|no)$/) }),
        })
      );
    });
  });

  it("forwards lang=no in plan generation payload when language is Norwegian", async () => {
    setLanguage("no");
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "gemini-coach",
        expect.objectContaining({
          body: expect.objectContaining({ lang: "no" }),
        })
      );
    });
  });

  it("shows coaching feedback after successful plan generation", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    // Coaching feedback appears in both the plan view and the revision history sidebar
    await waitFor(() => {
      const matches = screen.getAllByText(SAMPLE_PLAN_DATA.coaching_feedback);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it("shows Accept Plan button after successful plan generation", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Accept Plan/i })).toBeInTheDocument();
    });
  });

  it("shows loading state while generating plan", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient({ invokePending: true }));
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/Analyzing your training data/i)).toBeInTheDocument();
    });
  });

  it("shows error when plan generation fails with non-2xx status", async () => {
    getSupabaseClient.mockReturnValue(
      makeMockClient({ invokeError: { message: "Edge Function returned a non-2xx status code" } })
    );
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Plan generation failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Edge Function returned a non-2xx status code/i)).toBeInTheDocument();
    });
  });

  it("displays adaptation_summary callout after plan generation", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppData());

    const user = userEvent.setup();
    render(<CoachPage />);

    await user.click(screen.getByRole("button", { name: /Weekly Plan/i }));
    await user.click(screen.getAllByRole("button", { name: /Generate Weekly Plan/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/Fatigue trend across 3 check-ins/i)).toBeInTheDocument();
    });
  });

  it("refreshes activities, daily logs, and check-ins before initial coaching payload", async () => {
    const mockClient = makeMockClient();
    const loadActivities = vi.fn().mockResolvedValue([]);
    const loadLogs = vi.fn().mockResolvedValue([]);
    const loadCheckins = vi.fn().mockResolvedValue([]);
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(
      makeAppDataWithNewConv({
        activities: {
          activities: [],
          loading: false,
          error: null,
          loadActivities,
        },
        dailyLogs: {
          logs: [],
          loading: false,
          error: null,
          loadLogs,
          saveLog: vi.fn(),
        },
        checkins: {
          checkins: [],
          loading: false,
          error: null,
          loadCheckins,
        },
      }),
    );

    const user = userEvent.setup();
    render(<CoachPage />);
    await user.click(screen.getByRole("button", { name: /Refresh coaching/i }));

    await waitFor(() => {
      expect(loadActivities).toHaveBeenCalledTimes(1);
      expect(loadLogs).toHaveBeenCalledTimes(1);
      expect(loadCheckins).toHaveBeenCalledTimes(1);
    });
  });
});

// —— Admin philosophy workflow —— 
describe("Admin philosophy page — workflow guards", () => {
  function makeCoachPhilosophy(overrides = {}) {
    return {
      isAdmin: true,
      document: {
        status: "draft",
        version: 1,
        principles: "",
        dos: "",
        donts: "",
        workout_examples: "",
        phase_notes: "",
        koop_weight: 50,
        bakken_weight: 50,
      },
      versions: [],
      loading: false,
      saving: false,
      publishing: false,
      load: vi.fn().mockResolvedValue(undefined),
      saveDraft: vi.fn().mockResolvedValue({}),
      publish: vi.fn().mockResolvedValue({}),
      rollback: vi.fn().mockResolvedValue({}),
      exportPayload: vi.fn().mockResolvedValue({ version: 1 }),
      ...overrides,
    };
  }

  it("shows not authorized message when user is not admin", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachPhilosophy: makeCoachPhilosophy({ isAdmin: false }),
      }),
    );

    render(<AdminPhilosophyPage />);
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it("keeps save draft disabled until required sections are completed", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachPhilosophy: makeCoachPhilosophy(),
      }),
    );

    render(<AdminPhilosophyPage />);
    expect(screen.getByRole("button", { name: /Save Draft/i })).toBeDisabled();
  });

  it("requires changelog note before publish button is enabled", async () => {
    const user = userEvent.setup();
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachPhilosophy: makeCoachPhilosophy(),
      }),
    );

    render(<AdminPhilosophyPage />);

    await user.type(screen.getByLabelText(/Principles \(Required\)/i), "Principles");
    await user.type(screen.getByLabelText(/Dos \(Required\)/i), "Do this");
    await user.type(screen.getByLabelText(/Donts \(Required\)/i), "Avoid this");
    await user.type(screen.getByLabelText(/Workout Examples \(Required\)/i), "Example session");
    await user.type(screen.getByLabelText(/Phase Notes \(Required\)/i), "Phase guidance");

    expect(screen.getByRole("button", { name: /Publish/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/Changelog Note \(Required\)/i), "Initial publish");
    expect(screen.getByRole("button", { name: /Publish/i })).toBeEnabled();
  });

  it("calls rollback when clicking rollback on a version item", async () => {
    const user = userEvent.setup();
    const rollback = vi.fn().mockResolvedValue({});
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachPhilosophy: makeCoachPhilosophy({
          versions: [{ id: "v1", version: 1, source: "publish", changelog_note: "First publish" }],
          rollback,
        }),
      }),
    );

    render(<AdminPhilosophyPage />);
    await user.click(screen.getByRole("button", { name: /Rollback/i }));
    expect(rollback).toHaveBeenCalledWith("v1");
  });
});

// ── useCoachPhilosophy bootstrap detection ────────────────────────────────────

describe("useCoachPhilosophy bootstrap", () => {
  /**
   * Helper to create a chainable Supabase query builder mock.
   * Supports: .from(table).select(cols, opts).eq(col, val).maybeSingle()
   *
   * fromImplementation(table) is called per table name, returns mock object.
   */
  function makePhilosophyClient({ tableCountResult, adminRowResult }) {
    const makeCountChain = () => ({
      select: vi.fn().mockReturnValue({
        // count query resolves immediately (no .eq or .maybeSingle needed)
        then: (resolve) => resolve(tableCountResult),
        // also expose as a thenable for await
        ...tableCountResult,
      }),
    });

    const makeRowChain = () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(adminRowResult),
        }),
      }),
    });

    // We need the client.from("coach_admins") to behave differently depending
    // on the second argument to .select() (presence of { count: "exact" }).
    // Easiest approach: track calls and return different chains by call order.
    let fromCallCount = 0;
    const fromMock = vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        // First call: count query (select with { head: true, count: "exact" })
        return {
          select: vi.fn().mockResolvedValue(tableCountResult),
        };
      }
      // Second call: row query (select "role" + .eq + .maybeSingle)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue(adminRowResult),
          }),
        }),
      };
    });

    return {
      from: fromMock,
      functions: {
        invoke: vi.fn().mockResolvedValue({
          data: { document: null, versions: [] },
          error: null,
        }),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets isAdmin=true when coach_admins table is empty (count=0)", async () => {
    // Empty table: count=0 → first user gets admin access automatically
    const client = makePhilosophyClient({
      tableCountResult: { count: 0, error: null },
      adminRowResult: { data: null, error: null },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useCoachPhilosophy("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });

  it("sets isAdmin=false when coach_admins has rows but none for this user", async () => {
    // Populated table but no row for user-1 → not an admin
    const client = makePhilosophyClient({
      tableCountResult: { count: 1, error: null },
      adminRowResult: { data: null, error: null },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useCoachPhilosophy("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(false);
  });

  it("sets isAdmin=true when coach_admins has a row for this user", async () => {
    // User already has an admin row → still an admin
    const client = makePhilosophyClient({
      tableCountResult: { count: 1, error: null },
      adminRowResult: { data: { role: "owner" }, error: null },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useCoachPhilosophy("user-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
  });
});
