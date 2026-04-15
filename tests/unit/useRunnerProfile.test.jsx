import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRunnerProfile } from "../../src/hooks/useRunnerProfile";

vi.mock("../../src/lib/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from "../../src/lib/supabaseClient";

function createRunnerProfileClient({
  row = null,
  upsertResult = { error: null },
} = {}) {
  const selectSpy = vi.fn();
  const upsertSpy = vi.fn();

  return {
    client: {
      from(table) {
        expect(table).toBe("runner_profiles");
        return {
          select(selection) {
            selectSpy(selection);
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({ data: row, error: null });
          },
          upsert(payload, options) {
            upsertSpy(payload, options);
            return Promise.resolve(upsertResult);
          },
        };
      },
    },
    selectSpy,
    upsertSpy,
  };
}

describe("useRunnerProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the insight refresh interval from runner_profiles", async () => {
    const { client, selectSpy } = createRunnerProfileClient({
      row: { background: "Trail runner", insight_refresh_interval_hours: 72 },
    });
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useRunnerProfile("user-1"));

    await act(async () => {
      await result.current.loadProfile();
    });

    await waitFor(() => expect(result.current.insightRefreshIntervalHours).toBe(72));
    expect(selectSpy).toHaveBeenCalledWith("background, insight_refresh_interval_hours");
  });

  it("saves the insight refresh interval together with the background", async () => {
    const { client, upsertSpy } = createRunnerProfileClient();
    getSupabaseClient.mockReturnValue(client);

    const { result } = renderHook(() => useRunnerProfile("user-1"));

    await act(async () => {
      await result.current.saveProfile("Trail runner", 168);
    });

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        background: "Trail runner",
        insight_refresh_interval_hours: 168,
      }),
      { onConflict: "user_id" },
    );
  });
});
