/**
 * CoachPage tests
 *
 * Covers:
 * - Branding: "Marius AI Bakken" heading
 * - New Session button renders
 * - Chat input and send button render
 * - Sending a message calls edge function with sessionId and newMessage
 * - Session sidebar toggles
 * - ChangeCard component for patch review and application
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoachPage from "../../src/pages/CoachPage";
import { ChangeCard } from "../../src/components/chat/ChangeCard";
import {
  makeAppData,
  SAMPLE_CHECKINS,
  SAMPLE_DAILY_LOGS,
  SAMPLE_BLOCKS,
  SAMPLE_PLAN,
  SAMPLE_SESSIONS,
  SAMPLE_CHAT_MESSAGES,
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
  invokeData = { type: "conversation", content: "Looking good this week.", planUpdated: false },
} = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
    functions: {
      invoke: invokeError
        ? vi.fn().mockResolvedValue({ data: null, error: invokeError })
        : vi.fn().mockResolvedValue({ data: invokeData, error: null }),
    },
  };
}

function makeCoachAppData(overrides = {}) {
  return makeAppData({
    coachConversations: {
      sessions: [],
      messages: [],
      activeSessionId: null,
      loading: false,
      error: null,
      setActiveSessionId: vi.fn(),
      startNewSession: vi.fn().mockReturnValue("new-session-id"),
      reload: vi.fn().mockResolvedValue(undefined),
      loadSessions: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  });
}

function makeCoachAppDataWithSession(overrides = {}) {
  return makeAppData({
    coachConversations: {
      sessions: SAMPLE_SESSIONS,
      messages: SAMPLE_CHAT_MESSAGES,
      activeSessionId: "session-1",
      loading: false,
      error: null,
      setActiveSessionId: vi.fn(),
      startNewSession: vi.fn().mockReturnValue("new-session-id"),
      reload: vi.fn().mockResolvedValue(undefined),
      loadSessions: vi.fn().mockResolvedValue(SAMPLE_SESSIONS),
    },
    ...overrides,
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

    expect(screen.getByText("Marius AI Bakken")).toBeInTheDocument();
  });

  it("renders coach heading and chat input", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    render(<CoachPage />);

    expect(screen.getByText("Marius AI Bakken")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask your coach/i)).toBeInTheDocument();
  });
});

// ── New Session button ────────────────────────────────────────────────────────

describe("Coach page — new session button", () => {
  it("renders a New Session button in the header", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData());

    render(<CoachPage />);

    // The button text includes the i18n key or fallback; match by aria-label or partial text
    expect(screen.getByRole("button", { name: /toggle sessions/i })).toBeInTheDocument();
    // The new session button is always rendered in the header
    const allButtons = screen.getAllByRole("button");
    // At minimum we expect the toggle-sessions button and the new-session button
    expect(allButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("calls startNewSession when New Session header button clicked", async () => {
    const startNewSession = vi.fn().mockReturnValue("new-session-id");
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppData({ coachConversations: {
      sessions: [],
      messages: [],
      activeSessionId: null,
      loading: false,
      error: null,
      setActiveSessionId: vi.fn(),
      startNewSession,
      reload: vi.fn().mockResolvedValue(undefined),
      loadSessions: vi.fn().mockResolvedValue([]),
    }}));

    const user = userEvent.setup();
    render(<CoachPage />);

    // Find new-session button (last button in header area, not toggle-sessions)
    // The header contains: toggle-sessions btn, then new-session btn
    const buttons = screen.getAllByRole("button");
    // Click the non-toggle button (skip the toggle button)
    const newSessionBtn = buttons.find(btn => btn.getAttribute("aria-label") !== "Toggle sessions");
    await user.click(newSessionBtn);

    expect(startNewSession).toHaveBeenCalled();
  });
});

// ── Chat input and send ───────────────────────────────────────────────────────

describe("Coach page — chat input", () => {
  it("renders chat input with correct placeholder", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    render(<CoachPage />);

    expect(screen.getByPlaceholderText(/ask your coach/i)).toBeInTheDocument();
  });

  it("renders Send button", () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    render(<CoachPage />);

    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("calls functions.invoke with sessionId and newMessage when send clicked", async () => {
    const mockClient = makeMockClient();
    getSupabaseClient.mockReturnValue(mockClient);
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    const user = userEvent.setup();
    render(<CoachPage />);

    const textarea = screen.getByPlaceholderText(/ask your coach/i);
    await user.type(textarea, "How is my training looking?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(mockClient.functions.invoke).toHaveBeenCalledWith(
        "claude-coach",
        expect.objectContaining({
          body: expect.objectContaining({
            sessionId: "session-1",
            newMessage: "How is my training looking?",
          }),
        })
      );
    });
  });
});

// ── Session sidebar toggle ────────────────────────────────────────────────────

describe("Coach page — session sidebar", () => {
  it("shows sidebar after toggle button click", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    const user = userEvent.setup();
    render(<CoachPage />);

    // Sidebar is hidden by default — sessions list not visible
    expect(screen.queryByText("Sessions")).not.toBeInTheDocument();

    // Click the ☰ toggle button
    const toggleBtn = screen.getByRole("button", { name: /toggle sessions/i });
    await user.click(toggleBtn);

    // After toggle, sessions sidebar is visible
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders session titles in sidebar when sidebar is open", async () => {
    getSupabaseClient.mockReturnValue(makeMockClient());
    useAppData.mockReturnValue(makeCoachAppDataWithSession());

    const user = userEvent.setup();
    render(<CoachPage />);

    const toggleBtn = screen.getByRole("button", { name: /toggle sessions/i });
    await user.click(toggleBtn);

    // "Pre-race tapering advice" only appears as a session title, not in chat messages
    expect(screen.getByText("Pre-race tapering advice")).toBeInTheDocument();
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
