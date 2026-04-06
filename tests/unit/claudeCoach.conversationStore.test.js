import { describe, expect, it, vi } from "vitest";
import {
  ensureConversationExists,
  loadConversationHistory,
  persistConversationTurn,
} from "../../supabase/functions/claude-coach/conversationStore.ts";

describe("conversationStore", () => {
  it("loads history from coach_messages joined by conversation ownership", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "session-1" }, error: null });
    const order = vi.fn().mockResolvedValue({
      data: [
        { role: "user", content: [{ type: "text", text: "Hello" }] },
        { role: "assistant", content: [{ type: "text", text: "Hi" }] },
      ],
      error: null,
    });

    const supabase = {
      from(table) {
        if (table === "coach_conversations") {
          return {
            select() { return this; },
            eq() { return this; },
            maybeSingle: single,
          };
        }
        if (table === "coach_messages") {
          return {
            select() { return this; },
            eq() { return this; },
            order,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    };

    const history = await loadConversationHistory(supabase, "user-1", "session-1");
    expect(history).toEqual([
      { role: "user", content: [{ type: "text", text: "Hello" }] },
      { role: "assistant", content: [{ type: "text", text: "Hi" }] },
    ]);
  });

  it("creates a conversation row when the session does not exist", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });

    const supabase = {
      from() {
        return {
          select() { return this; },
          eq() { return this; },
          maybeSingle,
          insert,
        };
      },
    };

    await ensureConversationExists(supabase, "user-1", "session-1");

    expect(insert).toHaveBeenCalledWith({
      id: "session-1",
      user_id: "user-1",
      title: "New conversation",
    });
  });

  it("persists user and assistant messages to coach_messages", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const supabase = {
      from(table) {
        if (table !== "coach_messages") throw new Error(`Unexpected table: ${table}`);
        return { insert };
      },
    };

    await persistConversationTurn(
      supabase,
      "session-1",
      { type: "text", text: "Hello" },
      [{ type: "text", text: "Hi" }],
    );

    expect(insert).toHaveBeenCalledWith([
      {
        conversation_id: "session-1",
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        conversation_id: "session-1",
        role: "assistant",
        content: [{ type: "text", text: "Hi" }],
      },
    ]);
  });
});
