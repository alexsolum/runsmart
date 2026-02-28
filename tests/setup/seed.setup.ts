/**
 * Seed setup for Playwright E2E tests.
 *
 * Runs after auth.setup (session already saved). Seeds mock activities for
 * the test user if their activities table is empty, so dashboard charts
 * (Weekly Progress, KPI cards) have data to display during E2E tests.
 *
 * Gracefully skips if:
 * - Auth credentials are not set (TEST_USER_EMAIL missing)
 * - RLS blocks the insert (service-role not available)
 * - The user already has activities
 */

import { test as setup } from '@playwright/test';

function weeksAgoOnDow(weeksAgo: number, dow: number, refMonday: Date): string {
  const d = new Date(refMonday);
  d.setUTCDate(d.getUTCDate() - weeksAgo * 7 + dow);
  d.setUTCHours(10, 0, 0, 0);
  return d.toISOString();
}

setup('seed activities for test user', async ({ page }) => {
  if (!process.env.TEST_USER_EMAIL) {
    console.warn('\n⚠️  TEST_USER_EMAIL not set — skipping activity seed.\n');
    return;
  }

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Extract Supabase config from the app runtime
  const config = await page.evaluate(() => {
    const w = window as Window & { RUNTIME_CONFIG?: Record<string, string> };
    return {
      supabaseUrl: w.RUNTIME_CONFIG?.supabaseUrl || '',
      supabaseAnonKey: w.RUNTIME_CONFIG?.supabaseAnonKey || '',
    };
  });

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.warn('\n⚠️  RUNTIME_CONFIG not available — skipping activity seed.\n');
    return;
  }

  // Get the user's JWT access token from localStorage
  const accessToken = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? '';
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const val = JSON.parse(localStorage.getItem(key) ?? '{}');
          return (val as { access_token?: string }).access_token ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  if (!accessToken) {
    console.warn('\n⚠️  No Supabase auth token found in localStorage — skipping seed.\n');
    return;
  }

  const headers: Record<string, string> = {
    'apikey': config.supabaseAnonKey,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // Check existing activity count
  const countRes = await page.evaluate(
    async ({ url, hdrs }: { url: string; hdrs: Record<string, string> }) => {
      const res = await fetch(`${url}/rest/v1/activities?select=id&limit=1`, {
        headers: { ...hdrs, 'Prefer': 'count=exact' },
      });
      const count = res.headers.get('content-range') ?? '';
      return { status: res.status, range: count };
    },
    { url: config.supabaseUrl, hdrs: headers },
  );

  if (countRes.status !== 200) {
    console.warn(`\n⚠️  Activities query failed (${countRes.status}) — skipping seed.\n`);
    return;
  }

  // content-range header: "0-0/5" or "*/0"
  const total = parseInt(countRes.range.split('/')[1] ?? '0', 10);
  if (total > 0) {
    console.log(`ℹ️  Test user already has ${total} activities — skipping seed.`);
    return;
  }

  // Build mock activities: Mon/Wed/Sat pattern for 5 weeks
  const now = new Date();
  const utcDay = now.getUTCDay();
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + (utcDay === 0 ? -6 : 1 - utcDay));
  monday.setUTCHours(0, 0, 0, 0);

  const activities = [];
  for (let w = 0; w <= 4; w++) {
    activities.push(
      { name: 'Easy Run', type: 'Run', started_at: weeksAgoOnDow(w, 0, monday), distance: 10000, moving_time: 3000, average_speed: 3.33, elevation_gain: 60 },
      { name: 'Tempo Run', type: 'Run', started_at: weeksAgoOnDow(w, 2, monday), distance: 8000, moving_time: 2400, average_speed: 3.33, elevation_gain: 40 },
      { name: 'Long Run', type: 'Run', started_at: weeksAgoOnDow(w, 5, monday), distance: 18000, moving_time: 5400, average_speed: 3.33, elevation_gain: 120 },
    );
  }

  const insertRes = await page.evaluate(
    async ({ url, hdrs, rows }: { url: string; hdrs: Record<string, string>; rows: object[] }) => {
      const res = await fetch(`${url}/rest/v1/activities`, {
        method: 'POST',
        headers: { ...hdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify(rows),
      });
      return res.status;
    },
    { url: config.supabaseUrl, hdrs: headers, rows: activities },
  );

  if (insertRes === 201) {
    console.log(`✅ Seeded ${activities.length} mock activities for E2E tests.`);
  } else {
    console.warn(`\n⚠️  Activity seed insert returned ${insertRes} — RLS may block anon inserts. E2E charts will be empty.\n`);
  }
});
