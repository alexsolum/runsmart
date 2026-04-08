import { beforeEach, describe, expect, it, vi } from "vitest";

import { __testUtils__, invokeEdgeFunctionWithSessionRetry } from "../../src/lib/edgeFunctionAuth";

describe("edgeFunctionAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invokes the edge function through the Supabase client", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { ok: true },
      error: null,
    });
    const client = {
      functions: {
        invoke,
      },
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(result.data).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith("claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });
  });

  it("refreshes and retries once when the edge function reports Invalid JWT", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce({
        data: { code: 401, message: "Invalid JWT" },
        error: new Error("Invalid JWT"),
      })
      .mockResolvedValueOnce({
        data: { raceInfo: { displayName: "CCC", distanceKm: 101 } },
        error: null,
      });
    const client = {
      functions: {
        invoke,
      },
      auth: {
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "fresh-token" } },
          error: null,
        }),
      },
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ raceInfo: { displayName: "CCC", distanceKm: 101 } });
  });

  it("surfaces a sign-in error when refresh cannot restore the session", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { code: 401, message: "Invalid JWT" },
      error: new Error("Invalid JWT"),
    });

    const client = {
      functions: {
        invoke,
      },
      auth: {
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
    };

    await expect(
      invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
        body: { mode: "race_info", raceName: "CCC" },
      }),
    ).rejects.toThrow("No active session. Please sign in first.");
  });

  it("can detect Invalid JWT responses from payloads", () => {
    const { isInvalidJwtResponse } = __testUtils__();
    expect(isInvalidJwtResponse({ code: 401, message: "Invalid JWT" }, null)).toBe(true);
    expect(isInvalidJwtResponse({ raceInfo: null }, null)).toBe(false);
  });
});
