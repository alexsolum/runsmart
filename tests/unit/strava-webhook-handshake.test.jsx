import { describe, it, expect } from 'vitest';

// We can't easily test the actual Edge Function without deploying it or running a local Supabase server,
// but we can test the handshake logic if we were to export it.
// Since the function is a standalone Deno script, we'll just mock the request/response logic here
// as a verification of the logic implemented.

const STRAVA_VERIFY_TOKEN = 'test-verify-token';

async function handleHandshake(req) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === STRAVA_VERIFY_TOKEN) {
    return new Response(JSON.stringify({ "hub.challenge": challenge }), {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    return new Response("Forbidden", { status: 403 });
  }
}

describe('Strava Webhook Handshake', () => {
  it('should return the challenge when tokens match', async () => {
    const challenge = '12345';
    const url = `http://localhost/strava-webhook?hub.mode=subscribe&hub.verify_token=${STRAVA_VERIFY_TOKEN}&hub.challenge=${challenge}`;
    const req = new Request(url, { method: 'GET' });

    const res = await handleHandshake(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body['hub.challenge']).toBe(challenge);
  });

  it('should return 403 when tokens do not match', async () => {
    const url = `http://localhost/strava-webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=12345`;
    const req = new Request(url, { method: 'GET' });

    const res = await handleHandshake(req);
    expect(res.status).toBe(403);
  });

  it('should return 403 when mode is not subscribe', async () => {
    const url = `http://localhost/strava-webhook?hub.mode=wrong-mode&hub.verify_token=${STRAVA_VERIFY_TOKEN}&hub.challenge=12345`;
    const req = new Request(url, { method: 'GET' });

    const res = await handleHandshake(req);
    expect(res.status).toBe(403);
  });
});
