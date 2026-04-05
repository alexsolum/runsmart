/**
 * CoachPage tests
 *
 * Covers:
 * - Branding: "Marius AI Bakken" heading + coach avatar
 * - Conversation sidebar: list, create, select, delete
 * - ChatPanel component rendering
 * - ChangeCard component for patch review and application
 * - Error states
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoachPage from "../../src/pages/CoachPage";
import { ChangeCard } from "../../src/components/chat/ChangeCard";
import { ChatPanel } from "../../src/components/chat/ChatPanel";
import {
  makeAppData,
  SAMPLE_CHECKINS,
  SAMPLE_DAILY_LOGS,
  SAMPLE_BLOCKS,
  SAMPLE_PLAN,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_HIERARCHICAL_PLAN,
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

// ── fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_PATCH = [
  {
    week: 3,
    dayDate: "2026-04-14",
    workoutId: "w3-mon-easy",
    fields: { durationMinutes: 45 }
  }
];

// ── mock builders ─────────────────────────────────────────────────────────────

function makeMockClient({
  session = { access_token: "test-token-abc" },
  invokeError = null,
  invokePending = false,
  chatResponse = { text: "Here is my coaching advice.", patch: null, patchSummary: null },
} = {}) {
  const invokeImpl = invokePending
    ? vi.fn().mockImplementation(() => new Promise(() => {}))
    : vi.fn().mockImplementation((_fnName, { body }) => {
        if (invokeError) {
          return Promise.resolve({ data: null, error: invokeError });
        }
        if (body?.mode === "chat") {
          return Promise.resolve({ data: chatResponse, error: null });
        }
        return Promise.resolve({ data: { text: "response" }, error: null });
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

    // Avatar appears in header
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
    useAppData.mockReturnValue(makeAppDataWithMessages());

    render(<CoachPage />);

    expect(screen.getByText("Good training consistency")).toBeInTheDocument();
  });

  it("selects a conversation when clicked", async () => {
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
    await user.click(screen.getByText("Good training consistency"));

    expect(setActiveConversation).toHaveBeenCalledWith(SAMPLE_CONVERSATIONS[0]);
  });

  it("creates a new conversation when button clicked", async () => {
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

    expect(createConversation).toHaveBeenCalled();
  });

  it("renders delete confirmation when delete button clicked", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: [SAMPLE_CONVERSATIONS[0]],
        }),
      })
    );

    const user = userEvent.setup();
    render(<CoachPage />);

    // Find and click the delete button (X icon) for the conversation
    const deleteButtons = screen.getAllByLabelText(/Delete conversation/i);
    if (deleteButtons.length > 0) {
      await user.click(deleteButtons[0]);
      expect(screen.getByText(/Delete this conversation/i)).toBeInTheDocument();
    }
  });
});

// ── Plan context banner ────────────────────────────────────────────────────────

describe("Coach page — plan context banner", () => {
  it("renders PlanBanner when a plan exists", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [SAMPLE_PLAN] },
        trainingBlocks: { blocks: SAMPLE_BLOCKS },
      })
    );

    render(<CoachPage />);

    expect(screen.getByText(/Stockholm Marathon/i)).toBeInTheDocument();
  });

  it("renders a warning banner when no plan exists", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        plans: { plans: [] },
      })
    );

    render(<CoachPage />);

    expect(screen.getByText(/No training plan found/i)).toBeInTheDocument();
  });
});

// ── Daily log summary ──────────────────────────────────────────────────────────

describe("Coach page — daily log summary", () => {
  it("shows wellness summary from recent daily logs", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        dailyLogs: {
          logs: SAMPLE_DAILY_LOGS,
          loading: false,
          error: null,
          loadLogs: vi.fn(),
          saveLog: vi.fn(),
        },
      })
    );

    render(<CoachPage />);

    // Check that wellness summary is rendered with log count
    expect(screen.getByText(/log/i)).toBeInTheDocument();
  });
});

// ── Runner profile section ─────────────────────────────────────────────────────

describe("Coach page — runner profile section", () => {
  it("renders runner profile textarea in sidebar", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    const saveProfile = vi.fn().mockResolvedValue(undefined);
    useAppData.mockReturnValue(
      makeCoachAppData({
        runnerProfile: {
          background: "I'm a competitive 5K runner",
          loading: false,
          error: null,
          loadProfile: vi.fn(),
          saveProfile,
        },
      })
    );

    render(<CoachPage />);

    const textarea = screen.getByPlaceholderText(/e.g. Running for 3 years/i);
    expect(textarea.value).toContain("I'm a competitive 5K runner");
  });
});

// ── ChatPanel component ────────────────────────────────────────────────────────

describe("Coach page — ChatPanel integration", () => {
  it("renders ChatPanel when conversation is active", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeAppDataWithNewConv());

    render(<CoachPage />);

    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("does not have an active conversation selected by default", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(
      makeCoachAppData({
        coachConversations: makeConvData({
          conversations: [],
          activeConversation: null,
          messages: [],
        }),
      })
    );

    render(<CoachPage />);

    // Sidebar should show "No conversations yet" message
    expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument();
  });

  it("shows a non-apply warning instead of patch controls when plan patching is unavailable", () => {
    render(
      <ChatPanel
        coachConversations={makeConvData()}
        activeConversation={SAMPLE_CONVERSATIONS[0]}
        messages={[
          {
            id: "assistant-patch",
            conversation_id: "conv-1",
            role: "assistant",
            content: {
              text: "I would normally move Thursday to rest.",
              patch: SAMPLE_PATCH,
              patchSummary: "Shift Thursday to rest day",
            },
            created_at: new Date().toISOString(),
          },
        ]}
        hierarchicalPlan={{ plan: null, applyPatch: undefined }}
        activities={[]}
        dailyLogs={[]}
        checkins={[]}
        runnerProfile=""
        trainingBlocks={[]}
        activePlan={null}
        lang="en"
        canApplyPatch={false}
        patchUnavailableReason="Generate a plan first, then you can apply coach-proposed schedule changes from here."
      />
    );

    expect(screen.getByTestId("patch-unavailable-note")).toBeInTheDocument();
    expect(screen.getByText(/Generate a plan first/i)).toBeInTheDocument();
    expect(screen.queryByTestId("change-card-apply")).not.toBeInTheDocument();
  });
});

// ── No retired runtime references ──────────────────────────────────

describe("Coach page — legacy code removal", () => {
  it("does not contain the retired coach function slug", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    const { container } = render(<CoachPage />);

    const innerHTML = container.innerHTML;
    expect(innerHTML).not.toContain(["gemini", "coach"].join("-"));
  });

  it("does not have the retired Weekly Plan tab", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // Should not find "Weekly Plan" tab button
    const weeklyPlanButtons = screen.queryAllByRole("button", { name: /Weekly Plan/i });
    expect(weeklyPlanButtons.length).toBe(0);
  });

  it("does not render tab switcher", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    const { container } = render(<CoachPage />);

    // Should not have the tab switcher div with "Coaching Chat" and "Weekly Plan" buttons
    const tabButtons = container.querySelectorAll('[class*="p-1 bg-slate-100 rounded-xl"]');
    expect(tabButtons.length).toBe(0);
  });
});

// ── ChangeCard component tests ─────────────────────────────────────────────────

describe("ChangeCard component", () => {
  it("renders patch summary and entries", () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText(/Suggested Plan Change/i)).toBeInTheDocument();
    expect(screen.getByText(/Mon Apr 14: Easy Run reduced from 60 min to 45 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Week 3, 2026-04-14/i)).toBeInTheDocument();
  });

  it("calls onAccept with patch array when Apply Changes clicked", async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("change-card-apply"));

    expect(onAccept).toHaveBeenCalledWith(SAMPLE_PATCH);
  });

  it("shows applied confirmation after successful apply", async () => {
    const onAccept = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("change-card-apply"));

    await waitFor(() => {
      expect(screen.getByTestId("change-card-applied")).toBeInTheDocument();
      expect(screen.getByText(/Changes applied/i)).toBeInTheDocument();
    });
  });

  it("calls onDismiss when Dismiss clicked", async () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("change-card-dismiss"));

    expect(onDismiss).toHaveBeenCalled();
  });

  it("disables buttons while applying", async () => {
    const onAccept = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    const user = userEvent.setup();
    const applyButton = screen.getByTestId("change-card-apply");
    const dismissButton = screen.getByTestId("change-card-dismiss");

    await user.click(applyButton);

    expect(applyButton).toBeDisabled();
    expect(dismissButton).toBeDisabled();
  });

  it("displays error message if apply fails", async () => {
    const onAccept = vi.fn().mockRejectedValue(new Error("Failed to apply patch"));
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("change-card-apply"));

    await waitFor(() => {
      expect(screen.getByText(/Failed to apply patch/i)).toBeInTheDocument();
    });
  });

  it("renders with data-testid attributes for testing", () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ChangeCard
        patch={SAMPLE_PATCH}
        patchSummary="Mon Apr 14: Easy Run reduced from 60 min to 45 min"
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId("change-card")).toBeInTheDocument();
    expect(screen.getByTestId("change-card-apply")).toBeInTheDocument();
    expect(screen.getByTestId("change-card-dismiss")).toBeInTheDocument();
  });
});
