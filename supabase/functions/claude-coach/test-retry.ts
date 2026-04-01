
import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 10
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Retry attempt ${attempt} after ${delay}ms delay...`);
        await sleep(delay);
      }

      const response = await fetch(url, options);

      if (
        response.status === 499 ||
        response.status === 529 ||
        response.status === 429 ||
        (response.status >= 500 && response.status <= 599)
      ) {
        if (attempt < maxRetries) {
          console.warn(`Claude API returned ${response.status}. Retrying...`);
          continue;
        }
      }

      return response;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        console.warn(`Fetch error: ${err}. Retrying...`);
        continue;
      }
    }
  }
  throw lastError || new Error("Max retries reached");
}

Deno.test("fetchWithRetry - success on first attempt", async () => {
  const mockFetch = (url: string) => {
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  };

  // Replace global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {});
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - retry on 499 and success", async () => {
  let attempts = 0;
  const mockFetch = (url: string) => {
    attempts++;
    if (attempts === 1) {
      return Promise.resolve(new Response("Client disconnected", { status: 499 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    assertEquals(res.status, 200);
    assertEquals(attempts, 2);
    const body = await res.json();
    assertEquals(body.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - retry on 529 and success", async () => {
  let attempts = 0;
  const mockFetch = (url: string) => {
    attempts++;
    if (attempts === 1) {
      return Promise.resolve(new Response("Overloaded", { status: 529 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    assertEquals(res.status, 200);
    assertEquals(attempts, 2);
    const body = await res.json();
    assertEquals(body.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - retry on 429 and success", async () => {
  let attempts = 0;
  const mockFetch = (url: string) => {
    attempts++;
    if (attempts === 1) {
      return Promise.resolve(new Response("Rate limited", { status: 429 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    assertEquals(res.status, 200);
    assertEquals(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - max retries reached", async () => {
  let attempts = 0;
  const mockFetch = (url: string) => {
    attempts++;
    return Promise.resolve(new Response("Overloaded", { status: 529 }));
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {}, 2, 1);
    assertEquals(res.status, 529);
    assertEquals(attempts, 3); // 0, 1, 2
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - retry on network error", async () => {
  let attempts = 0;
  const mockFetch = (url: string) => {
    attempts++;
    if (attempts === 1) {
      return Promise.reject(new Error("Network failure"));
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as any;

  try {
    const res = await fetchWithRetry("http://example.com", {}, 3, 1);
    assertEquals(res.status, 200);
    assertEquals(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
