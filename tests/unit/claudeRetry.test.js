
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url,
  options,
  maxRetries = 3,
  initialDelay = 10
) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      const response = await fetch(url, options);

      if (
        response.status === 529 ||
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599)
      ) {
        if (attempt < maxRetries) {
          continue;
        }
      }

      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        continue;
      }
    }
  }
  throw lastError || new Error("Max retries reached");
}

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('success on first attempt', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await fetchWithRetry("http://example.com", {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retry on 529 and success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("Overloaded", { status: 529 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('retry on 429 and success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('max retries reached', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("Overloaded", { status: 529 }));

    const res = await fetchWithRetry("http://example.com", {}, 2, 1);
    expect(res.status).toBe(529);
    expect(fetch).toHaveBeenCalledTimes(3); // 0, 1, 2
  });

  it('retry on network error', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
