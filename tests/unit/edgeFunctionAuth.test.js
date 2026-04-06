import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/config/runtime", () => ({
  config: {
    supabaseUrl: "https://rhbnzzxzltjtposwpfin.supabase.co",
    supabaseAnonKey: "anon-key",
  },
}));

import { __testUtils__, invokeEdgeFunctionWithSessionRetry } from "../../src/lib/edgeFunctionAuth";

describe("edgeFunctionAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("prefers a proactively refreshed session token when available", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"ok":true}'),
    });

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
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(result.data).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith("https://rhbnzzxzltjtposwpfin.supabase.co/functions/v1/claude-coach", {
      method: "POST",
      body: JSON.stringify({ mode: "race_info", raceName: "CCC" }),
      headers: expect.objectContaining({
        Authorization: "Bearer token-2",
        apikey: expect.any(String),
        "content-type": "application/json",
      }),
    });
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("falls back to the cached token when proactive refresh fails", async () => {
    fetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"ok":true}'),
    });

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
    };

    await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(fetch).toHaveBeenCalledWith("https://rhbnzzxzltjtposwpfin.supabase.co/functions/v1/claude-coach", {
      method: "POST",
      body: JSON.stringify({ mode: "race_info", raceName: "CCC" }),
      headers: expect.objectContaining({
        Authorization: "Bearer token-1",
      }),
    });
  });

  it("refreshes and retries once when the edge function reports Invalid JWT", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('{"code":401,"message":"Invalid JWT"}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('{"raceInfo":{"displayName":"CCC","distanceKm":101}}'),
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
    };

    const result = await invokeEdgeFunctionWithSessionRetry(client, "claude-coach", {
      body: { mode: "race_info", raceName: "CCC" },
    });

    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenNthCalledWith(1, "https://rhbnzzxzltjtposwpfin.supabase.co/functions/v1/claude-coach", {
      method: "POST",
      body: JSON.stringify({ mode: "race_info", raceName: "CCC" }),
      headers: expect.objectContaining({
        Authorization: "Bearer stale-token",
      }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "https://rhbnzzxzltjtposwpfin.supabase.co/functions/v1/claude-coach", {
      method: "POST",
      body: JSON.stringify({ mode: "race_info", raceName: "CCC" }),
      headers: expect.objectContaining({
        Authorization: "Bearer fresh-token",
      }),
    });
    expect(result.data).toEqual({ raceInfo: { displayName: "CCC", distanceKm: 101 } });
  });

  it("can detect Invalid JWT responses from payloads", () => {
    const { isInvalidJwtResponse } = __testUtils__();
    expect(isInvalidJwtResponse({ code: 401, message: "Invalid JWT" }, null)).toBe(true);
    expect(isInvalidJwtResponse({ raceInfo: null }, null)).toBe(false);
  });
});
