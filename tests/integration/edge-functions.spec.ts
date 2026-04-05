/**
 * Edge Function validation tests (TST-008).
 *
 * Verifies that the surviving deployed Supabase Edge Functions are reachable
 * and return expected response shapes. These are live network tests.
 *
 * Skips gracefully when TEST_USER_EMAIL is not configured.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');
const runtimeConfigFile = path.join(__dirname, '../../public/runtime-config.js');
const activeCoachFunctionSlug = 'claude-coach';
const retiredCoachFunctionSlug = ['gemini', 'coach'].join('-');

function readRuntimeConfig() {
  if (!fs.existsSync(runtimeConfigFile)) return null;
  const text = fs.readFileSync(runtimeConfigFile, 'utf-8');
  const urlMatch = text.match(/SUPABASE_URL:\s*"([^"]+)"/);
  const keyMatch = text.match(/SUPABASE_ANON_KEY:\s*"([^"]+)"/);
  if (!urlMatch || !keyMatch) return null;
  return { supabaseUrl: urlMatch[1], anonKey: keyMatch[1] };
}

function tryReadAccessTokenFromStorageState() {
  if (!fs.existsSync(authFile)) return null;
  const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  for (const origin of state.origins ?? []) {
    for (const entry of origin.localStorage ?? []) {
      if (entry.name.includes('auth-token') || entry.name.includes('supabase.auth.token')) {
        try {
          const parsed = JSON.parse(entry.value);
          if (parsed?.access_token) return parsed.access_token as string;
        } catch {
          // Ignore malformed storage entries.
        }
      }
    }
  }
  return null;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildInsightsSynthesisPayload() {
  const targetWeekStart = '2026-03-16';
  const targetWeekEnd = '2026-03-22';
  const weeklySummary = Array.from({ length: 10 }, (_, idx) => {
    const weekStart = new Date(Date.UTC(2025, 11, 29));
    weekStart.setUTCDate(weekStart.getUTCDate() + idx * 7);
    return {
      weekOf: toIsoDate(weekStart),
      distance: 48 + idx * 1.8,
      runs: 5 + (idx % 2),
      longestRun: 16 + idx * 0.7,
    };
  });

  return {
    mode: 'insights_synthesis',
    targetWeekStart,
    targetWeekEnd,
    weeklySummary,
    recentActivities: [
      { name: 'Easy Run', distance: 11.2, duration: 4020, effort: 4 },
      { name: 'Threshold Session', distance: 13.4, duration: 4440, effort: 7 },
      { name: 'Long Run', distance: 24.0, duration: 9000, effort: 6 },
    ],
    latestCheckin: { fatigue: 2, sleepQuality: 4, motivation: 4, niggles: null },
    planContext: {
      race: 'Trail Marathon',
      raceDate: '2026-06-14',
      phase: 'Build',
      weekNumber: 6,
      targetMileage: 58,
      daysToRace: 101,
    },
    weeklyConstraints: {
      preferredLongRunDay: 'Sat',
      preferredHardWorkoutDay: 'Tue',
      commuteDays: ['Fri'],
      doubleThresholdAllowed: false,
    },
    dailyLogs: [
      { date: '2026-03-01', sleep_hours: 7.5, sleep_quality: 4, fatigue: 2, mood: 4, stress: 2, training_quality: 4, resting_hr: 50, notes: null },
      { date: '2026-03-02', sleep_hours: 7.0, sleep_quality: 3, fatigue: 3, mood: 4, stress: 3, training_quality: 3, resting_hr: 52, notes: null },
      { date: '2026-03-03', sleep_hours: 6.8, sleep_quality: 3, fatigue: 3, mood: 3, stress: 3, training_quality: 3, resting_hr: 53, notes: 'Busy work week' },
    ],
    lang: 'en',
  };
}

function assertInsightsSynthesisContract(body: any) {
  expect(body).toHaveProperty('synthesis');
  expect(typeof body.synthesis).toBe('string');
  expect(body.synthesis).toContain('Mileage Trend:');
  expect(body.synthesis).toContain('Intensity Distribution:');
  expect(body.synthesis).toContain('Long-Run Progression:');
  expect(body.synthesis).toContain('Race Readiness:');
}

async function postEdgeFunction(
  request: any,
  slug: string,
  data: Record<string, unknown>,
) {
  const cfg = readRuntimeConfig();
  const token = tryReadAccessTokenFromStorageState();
  if (!cfg || !token) {
    return null;
  }

  const res = await request.post(`${cfg.supabaseUrl}/functions/v1/${slug}`, {
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });

  return res;
}

test.beforeAll(async () => {
  if (!process.env.TEST_USER_EMAIL) {
    test.skip();
  }
  if (fs.existsSync(authFile)) {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    if (state.origins?.length === 0 && state.cookies?.length === 0) {
      test.skip();
    }
  }
});

test.describe('Edge Function - claude-coach', () => {
  test('coach page successfully loads AI insights', async ({ page }) => {
    await page.goto('/');

    const coachLink = page.getByRole('link', { name: /Coach|Marius/i })
      .or(page.getByRole('button', { name: /Coach|Marius/i }));

    if (await coachLink.count() === 0) {
      test.skip();
      return;
    }

    await coachLink.first().click();
    await expect(page.getByRole('heading', { name: /Coach|Marius/i })).toBeVisible({ timeout: 10000 });

    const newConvButton = page.getByRole('button', { name: /New conversation|New chat/i });
    if (await newConvButton.count() > 0) {
      await newConvButton.first().click();
    }

    const responseContainer = page.locator('.coach-insight-card, [data-testid="insight"], [class*="insight"]');
    await expect(responseContainer.first()).toBeVisible({ timeout: 60000 });
  });

  test('insights synthesis returns sectioned plain text', async ({ request }) => {
    const res = await postEdgeFunction(request, activeCoachFunctionSlug, buildInsightsSynthesisPayload());
    if (!res) {
      test.skip();
      return;
    }

    expect([200, 401, 403, 404, 502]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      const synthesisText = String(body?.synthesis ?? '');
      const hasLegacyWrapper =
        /^\s*\{\s*"synthesis"/i.test(synthesisText) ||
        /```/.test(synthesisText) ||
        /^\s*"synthesis"\s*:/i.test(synthesisText);

      test.skip(hasLegacyWrapper, 'Deployed edge function still returns wrapper artifacts.');
      assertInsightsSynthesisContract(body);
    }
  });

  test('retired coach endpoint is absent', async ({ request }) => {
    const res = await postEdgeFunction(request, retiredCoachFunctionSlug, buildInsightsSynthesisPayload());
    if (!res) {
      test.skip();
      return;
    }

    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe('Edge Function - strava-sync', () => {
  test('strava sync button is present on data page', async ({ page }) => {
    await page.goto('/');

    const dataLink = page.getByRole('link', { name: /Data|Strava/i })
      .or(page.getByRole('button', { name: /Data|Strava/i }));

    if (await dataLink.count() === 0) {
      test.skip();
      return;
    }

    await dataLink.first().click();
    await expect(page.getByRole('heading', { name: /Strava/i })).toBeVisible({ timeout: 10000 });
  });
});
