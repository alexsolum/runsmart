import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { useCoachConversations } from "../../src/hooks/useCoachConversations";
import { getSupabaseClient } from "../../src/lib/supabaseClient";

function createClient({ conversations = [], messages = [] } = {}) {
  return {
    from(table) {
      if (table === "coach_conversations") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return Promise.resolve({ data: messages.length ? messages : conversations, error: null });
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("useCoachConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads sessions from flat coach_conversations rows grouped by session_id", async () => {
    getSupabaseClient.mockReturnValue(createClient({
      conversations: [
        {
          id: "row-4",
          session_id: "session-2",
          role: "assistant",
          content: [{ type: "text", text: "Most recent exchange" }],
          created_at: "2026-04-06T09:00:00.000Z",
        },
        {
          id: "row-3",
          session_id: "session-2",
          role: "user",
          content: [{ type: "text", text: "How should I taper?" }],
          created_at: "2026-04-06T08:00:00.000Z",
        },
        {
          id: "row-2",
          session_id: "session-1",
          role: "assistant",
          content: [{ type: "text", text: "Older conversation" }],
          created_at: "2026-04-05T09:00:00.000Z",
        },
        {
          id: "row-1",
          session_id: "session-1",
          role: "user",
          content: [{ type: "text", text: "What should I do today?" }],
          created_at: "2026-04-05T08:00:00.000Z",
        },
      ],
    }));

    const { result } = renderHook(() => useCoachConversations("user-1"));

    await waitFor(() => {
      expect(result.current.sessions).toEqual([
        {
          session_id: "session-2",
          firstMessage: "How should I taper?",
          createdAt: "2026-04-06T08:00:00.000Z",
          updatedAt: "2026-04-06T09:00:00.000Z",
        },
        {
          session_id: "session-1",
          firstMessage: "What should I do today?",
          createdAt: "2026-04-05T08:00:00.000Z",
          updatedAt: "2026-04-05T09:00:00.000Z",
        },
      ]);
    });
  });

  it("loads messages from flat coach_conversations rows and keeps session_id", async () => {
    getSupabaseClient.mockReturnValue(createClient({
      conversations: [],
      messages: [
        {
          id: "msg-1",
          session_id: "conv-1",
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          created_at: "2026-04-06T10:00:00.000Z",
        },
        {
          id: "msg-2",
          session_id: "conv-1",
          role: "assistant",
          content: [{ type: "text", text: "Hi" }],
          created_at: "2026-04-06T10:01:00.000Z",
        },
      ],
    }));

    const { result } = renderHook(() => useCoachConversations("user-1"));

    await act(async () => {
      await result.current.setActiveSessionId("conv-1");
    });

    expect(result.current.messages).toEqual([
      {
        id: "msg-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
        created_at: "2026-04-06T10:00:00.000Z",
        session_id: "conv-1",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: [{ type: "text", text: "Hi" }],
        created_at: "2026-04-06T10:01:00.000Z",
        session_id: "conv-1",
      },
    ]);
  });
});
