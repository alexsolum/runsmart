import { beforeEach, describe, expect, it, vi } from "vitest";
import { __testUtils__, invokeEdgeFunctionWithSessionRetry } from "../../src/lib/edgeFunctionAuth";

describe("edgeFunctionAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers a proactively refreshed session token when available", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-1", refresh_token: "refresh-1" } },
          error: null,
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-2", refresh_token: "refresh-1" } },
          error: null,
        }),
      },
      functions: { invoke },
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(result.data).toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith("claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
      headers: { Authorization: "Bearer token-2" },
    });
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("falls back to the cached token when proactive refresh fails", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token-1", refresh_token: "refresh-1" } },
          error: null,
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: new Error("refresh failed"),
        }),
      },
      functions: { invoke },
    };

    await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(invoke).toHaveBeenCalledWith("claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("refreshes and retries once when the edge function reports Invalid JWT", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        data: { code: 401, message: "Invalid JWT" },
        error: { message: "Edge Function returned a non-2xx status code" },
      })
      .mockResolvedValueOnce({
        data: { raceInfo: { displayName: "CCC", distanceKm: 101 } },
        error: null,
      });

    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "stale-token" } },
          error: null,
        }),
        refreshSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "fresh-token" } },
          error: null,
        }),
      },
      functions: { invoke },
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenNthCalledWith(1, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
      headers: { Authorization: "Bearer stale-token" },
    });
    expect(invoke).toHaveBeenNthCalledWith(2, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
      headers: { Authorization: "Bearer fresh-token" },
    });
    expect(result.data).toEqual({ raceInfo: { displayName: "CCC", distanceKm: 101 } });
  });

  it("can detect Invalid JWT responses from payloads", () => {
    const { isInvalidJwtResponse } = __testUtils__();
    expect(isInvalidJwtResponse({ code: 401, message: "Invalid JWT" }, null)).toBe(true);
    expect(isInvalidJwtResponse({ raceInfo: null }, null)).toBe(false);
  });
});
