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
            return Promise.resolve({ data: conversations, error: null });
          },
        };
      }

      if (table === "coach_messages") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          order() {
            return Promise.resolve({ data: messages, error: null });
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

  it("loads sessions from coach_conversations using the split schema", async () => {
    getSupabaseClient.mockReturnValue(createClient({
      conversations: [
        {
          id: "conv-2",
          title: "Recent conversation",
          created_at: "2026-04-06T09:00:00.000Z",
          updated_at: "2026-04-06T10:00:00.000Z",
        },
        {
          id: "conv-1",
          title: "Older conversation",
          created_at: "2026-04-05T09:00:00.000Z",
          updated_at: "2026-04-05T11:00:00.000Z",
        },
      ],
    }));

    const { result } = renderHook(() => useCoachConversations("user-1"));

    await waitFor(() => {
      expect(result.current.sessions).toEqual([
        {
          session_id: "conv-2",
          firstMessage: "Recent conversation",
          createdAt: "2026-04-06T09:00:00.000Z",
          updatedAt: "2026-04-06T10:00:00.000Z",
        },
        {
          session_id: "conv-1",
          firstMessage: "Older conversation",
          createdAt: "2026-04-05T09:00:00.000Z",
          updatedAt: "2026-04-05T11:00:00.000Z",
        },
      ]);
    });
  });

  it("loads messages from coach_messages and normalizes session_id", async () => {
    getSupabaseClient.mockReturnValue(createClient({
      conversations: [],
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          created_at: "2026-04-06T10:00:00.000Z",
        },
        {
          id: "msg-2",
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
