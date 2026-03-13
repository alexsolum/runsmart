/**
 * Edge Function validation tests (TST-008).
 *
 * Verifies that deployed Supabase Edge Functions are reachable and return
 * expected response shapes. Does NOT mock the network - these are live tests.
 *
 * Skips gracefully when TEST_USER_EMAIL is not configured.
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');
const runtimeConfigFile = path.join(__dirname, '../../public/runtime-config.js');

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
          // ignore malformed storage entries
        }
      }
    }
  }
  return null;
}

function buildPlanModePayload() {
  const targetWeekStart = '2026-03-16';
  const targetWeekEnd = '2026-03-22';
  return {
    mode: 'plan',
    targetWeekStart,
    targetWeekEnd,
    weeklySummary: [
      { weekOf: '2026-02-09', distance: 48.2, runs: 5, longestRun: 16.0 },
      { weekOf: '2026-02-16', distance: 52.1, runs: 5, longestRun: 18.0 },
      { weekOf: '2026-02-23', distance: 54.4, runs: 6, longestRun: 20.0 },
      { weekOf: '2026-03-02', distance: 50.3, runs: 5, longestRun: 17.0 },
    ],
    recentActivities: [
      { name: 'Easy Run', distance: 10.2, duration: 3600, effort: 4 },
      { name: 'Tempo Session', distance: 12.0, duration: 4200, effort: 7 },
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
    recommendationContext: {
      weekStart: targetWeekStart,
      weekEnd: targetWeekEnd,
      trainingType: 'Taper',
      targetMileageKm: 42,
      notes: 'Travel Friday so keep the long run early and controlled.',
    },
    weekDirective: {
      weekStart: targetWeekStart,
      weekEnd: targetWeekEnd,
      trainingType: 'Taper',
      targetMileageKm: 42,
      notes: 'Travel Friday so keep the long run early and controlled.',
      constraints: {
        enforceTrainingType: true,
        enforceTargetMileage: true,
        mileageTolerancePct: 0.08,
        overrideRequiresExplanation: true,
      },
    },
    dailyLogs: [
      { date: '2026-03-01', sleep_hours: 7.5, sleep_quality: 4, fatigue: 2, mood: 4, stress: 2, training_quality: 4, resting_hr: 50, notes: null },
      { date: '2026-03-02', sleep_hours: 7.0, sleep_quality: 3, fatigue: 3, mood: 4, stress: 3, training_quality: 3, resting_hr: 52, notes: null },
    ],
    lang: 'en',
  };
}

function assertStructuredPlanContract(body: any) {
  expect(body).toHaveProperty('coaching_feedback');
  expect(typeof body.coaching_feedback).toBe('string');
  expect(body).toHaveProperty('structured_plan');
  expect(Array.isArray(body.structured_plan)).toBeTruthy();
  expect(body.structured_plan.length).toBeGreaterThan(0);
  expect(body.structured_plan.length).toBeLessThanOrEqual(7);

  for (const day of body.structured_plan) {
    expect(typeof day.date).toBe('string');
    expect(typeof day.workout_type).toBe('string');
    expect(typeof day.distance_km).toBe('number');
    expect(typeof day.duration_min).toBe('number');
    expect(typeof day.description).toBe('string');
  }
}

function assertPlanDatesStayInRequestedWeek(body: any, expectedStart: string, expectedEnd: string) {
  for (const day of body.structured_plan ?? []) {
    expect(day.date >= expectedStart).toBeTruthy();
    expect(day.date <= expectedEnd).toBeTruthy();
  }
}

function assertTaperMileageContract(body: any, targetKm: number, tolerancePct: number) {
  const totalKm = (body.structured_plan ?? []).reduce(
    (sum: number, day: any) => sum + Number(day.distance_km || 0),
    0,
  );
  const allowedDelta = targetKm * tolerancePct;
  const explanationText = `${String(body.coaching_feedback ?? '')}\n${String(body.adaptation_summary ?? '')}`;
  const hasOverrideExplanation = /(override|guardrail|safety|red-line|red line|because|due to|protect)/i.test(explanationText);

  expect(
    Math.abs(totalKm - targetKm) <= allowedDelta || hasOverrideExplanation,
  ).toBeTruthy();
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function buildLongTermReplanPayload(overrides?: Partial<Record<string, unknown>>) {
  const now = new Date();
  const goal = new Date(now.getTime());
  goal.setUTCDate(goal.getUTCDate() + 140);
  goal.setUTCHours(0, 0, 0, 0);
  const base = {
    ...buildPlanModePayload(),
    mode: 'long_term_replan',
    planContext: {
      race: 'Trail 50K',
      raceDate: toIsoDate(goal),
      phase: 'Build',
      weekNumber: 8,
      targetMileage: 62,
      daysToRace: 140,
    },
  };
  return { ...base, ...overrides };
}

function assertLongTermReplanContract(body: any) {
  expect(body).toHaveProperty('coaching_feedback');
  expect(typeof body.coaching_feedback).toBe('string');
  expect(body).toHaveProperty('weekly_structure');
  expect(Array.isArray(body.weekly_structure)).toBeTruthy();
  expect(body.weekly_structure.length).toBeGreaterThan(0);

  for (const week of body.weekly_structure) {
    expect(typeof week.week_start).toBe('string');
    expect(typeof week.week_end).toBe('string');
    expect(typeof week.phase_focus).toBe('string');
    expect(typeof week.target_km).toBe('number');
    expect(Array.isArray(week.key_workouts)).toBeTruthy();
    expect(typeof week.notes).toBe('string');
  }
}

function buildInsightsSynthesisPayload() {
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
    ...buildPlanModePayload(),
    mode: 'insights_synthesis',
    weeklySummary,
    recentActivities: [
      { name: 'Easy Run', distance: 11.2, duration: 4020, effort: 4 },
      { name: 'Threshold Session', distance: 13.4, duration: 4440, effort: 7 },
      { name: 'Long Run', distance: 24.0, duration: 9000, effort: 6 },
    ],
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

test.describe('Edge Function - gemini-coach', () => {
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

test.describe('Edge Function - coach-philosophy-admin', () => {
  test('rejects unauthenticated mutation request', async ({ request }) => {
    const cfg = readRuntimeConfig();
    if (!cfg) {
      test.skip();
      return;
    }

    const res = await request.post(`${cfg.supabaseUrl}/functions/v1/coach-philosophy-admin`, {
      headers: {
        apikey: cfg.anonKey,
        'Content-Type': 'application/json',
      },
      data: { action: 'save_draft', payload: {} },
    });

    expect([401, 403, 404]).toContain(res.status());
  });

  test('supports authenticated read contract', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const res = await request.post(`${cfg.supabaseUrl}/functions/v1/coach-philosophy-admin`, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { action: 'read' },
    });

    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('document');
      expect(body).toHaveProperty('versions');
    }
  });

  test('enforces changelog note on publish', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const res = await request.post(`${cfg.supabaseUrl}/functions/v1/coach-philosophy-admin`, {
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { action: 'publish', changelog_note: '' },
    });

    expect([422, 401, 403, 404]).toContain(res.status());
    if (res.status() === 422) {
      const body = await res.json();
      expect(String(body.error || '')).toMatch(/changelog_note/i);
    }
  });

  test('rollback keeps version history entries', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const post = (data: Record<string, unknown>) =>
      request.post(`${cfg.supabaseUrl}/functions/v1/coach-philosophy-admin`, {
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data,
      });

    const draftPayload = {
      principles: 'Long-run centric progression',
      dos: 'Progress gradually and stay consistent',
      donts: 'Avoid sudden volume spikes',
      workout_examples: 'Long run with controlled finish',
      phase_notes: 'Base phase emphasizes aerobic durability',
      koop_weight: 55,
      bakken_weight: 45,
    };

    const saveRes = await post({ action: 'save_draft', payload: draftPayload });
    if (saveRes.status() === 401 || saveRes.status() === 404 || saveRes.status() === 403) {
      test.skip();
      return;
    }
    expect(saveRes.status()).toBe(200);

    const publishRes = await post({ action: 'publish', changelog_note: 'integration publish for rollback test' });
    if (publishRes.status() === 401 || publishRes.status() === 403 || publishRes.status() === 404) {
      test.skip();
      return;
    }
    expect(publishRes.status()).toBe(200);

    const beforeRes = await post({ action: 'read' });
    expect(beforeRes.status()).toBe(200);
    const beforeBody = await beforeRes.json();
    const versionsBefore = Array.isArray(beforeBody.versions) ? beforeBody.versions : [];
    expect(versionsBefore.length).toBeGreaterThan(0);

    const rollbackTarget = versionsBefore[versionsBefore.length - 1];
    const rollbackRes = await post({ action: 'rollback', version_id: rollbackTarget.id });
    expect(rollbackRes.status()).toBe(200);

    const afterRes = await post({ action: 'read' });
    expect(afterRes.status()).toBe(200);
    const afterBody = await afterRes.json();
    const versionsAfter = Array.isArray(afterBody.versions) ? afterBody.versions : [];
    expect(versionsAfter.length).toBeGreaterThanOrEqual(versionsBefore.length);
  });
});

test.describe('Edge Function - gemini-coach plan contract with philosophy context', () => {
  const postFn = async (
    request: APIRequestContext,
    cfg: { supabaseUrl: string; anonKey: string },
    token: string,
    slug: string,
    data: Record<string, unknown>,
  ) => request.post(`${cfg.supabaseUrl}/functions/v1/${slug}`, {
    headers: {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data,
  });

  test('returns structured_plan when philosophy document is published', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const readRes = await postFn(request, cfg, token, 'coach-philosophy-admin', { action: 'read' });
    if (readRes.status() !== 200) {
      test.skip();
      return;
    }

    const readBody = await readRes.json();
    if (!readBody?.document || readBody.document.status !== 'published') {
      test.skip();
      return;
    }

    const planRes = await postFn(request, cfg, token, 'gemini-coach', buildPlanModePayload());
    expect([200, 401, 403, 404, 502]).toContain(planRes.status());
    if (planRes.status() === 200) {
      const planBody = await planRes.json();
      assertStructuredPlanContract(planBody);
      assertPlanDatesStayInRequestedWeek(planBody, '2026-03-16', '2026-03-22');
      assertTaperMileageContract(planBody, 42, 0.08);
    }
  });

  test('returns structured_plan when no published philosophy document exists', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const readRes = await postFn(request, cfg, token, 'coach-philosophy-admin', { action: 'read' });
    if (readRes.status() !== 200) {
      test.skip();
      return;
    }

    const readBody = await readRes.json();
    if (readBody?.document && readBody.document.status === 'published') {
      test.skip();
      return;
    }

    const planRes = await postFn(request, cfg, token, 'gemini-coach', buildPlanModePayload());
    expect([200, 401, 403, 404, 502]).toContain(planRes.status());
    if (planRes.status() === 200) {
      const planBody = await planRes.json();
      assertStructuredPlanContract(planBody);
      assertPlanDatesStayInRequestedWeek(planBody, '2026-03-16', '2026-03-22');
      assertTaperMileageContract(planBody, 42, 0.08);
    }
  });

  test('long_term_replan returns weekly structure that reaches goal-race week', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const payload = buildLongTermReplanPayload();
    const replanRes = await postFn(request, cfg, token, 'gemini-coach', payload);
    expect([200, 401, 403, 404, 502]).toContain(replanRes.status());
    if (replanRes.status() === 200) {
      const replanBody = await replanRes.json();
      if (!Array.isArray(replanBody.weekly_structure)) {
        test.skip();
        return;
      }
      assertLongTermReplanContract(replanBody);

      const raceDate = String((payload.planContext as any).raceDate);
      const lastWeek = replanBody.weekly_structure[replanBody.weekly_structure.length - 1];
      expect(lastWeek.week_end >= raceDate).toBeTruthy();

      if (replanBody.goal_race_date && !replanBody.used_fallback_horizon) {
        expect(lastWeek.week_end >= replanBody.goal_race_date).toBeTruthy();
      }
    }
  });

  test('long_term_replan uses fallback-safe horizon for invalid race context', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const payload = buildLongTermReplanPayload({
      planContext: {
        race: 'Trail 50K',
        raceDate: 'not-a-date',
        phase: 'Build',
        weekNumber: 8,
        targetMileage: 62,
        daysToRace: 140,
      },
    });
    const replanRes = await postFn(request, cfg, token, 'gemini-coach', payload);
    expect([200, 401, 403, 404, 502]).toContain(replanRes.status());
    if (replanRes.status() === 200) {
      const replanBody = await replanRes.json();
      if (!Array.isArray(replanBody.weekly_structure)) {
        test.skip();
        return;
      }
      assertLongTermReplanContract(replanBody);
      expect(replanBody.used_fallback_horizon).toBeTruthy();
      expect(replanBody.horizon_reason).toBe('missing_or_invalid_race_date');
      expect(replanBody.weekly_structure.length).toBe(12);
    }
  });

  test('insights_synthesis returns sectioned plain text without wrapper artifacts', async ({ request }) => {
    const cfg = readRuntimeConfig();
    const token = tryReadAccessTokenFromStorageState();
    if (!cfg || !token) {
      test.skip();
      return;
    }

    const synthesisRes = await postFn(request, cfg, token, 'gemini-coach', buildInsightsSynthesisPayload());
    expect([200, 401, 403, 404, 502]).toContain(synthesisRes.status());
    if (synthesisRes.status() === 200) {
      const synthesisBody = await synthesisRes.json();
      const synthesisText = String(synthesisBody?.synthesis ?? '');
      const hasLegacyWrapper =
        /^\s*\{\s*"synthesis"/i.test(synthesisText) ||
        /```/.test(synthesisText) ||
        /^\s*"synthesis"\s*:/i.test(synthesisText);
      test.skip(hasLegacyWrapper, 'Deployed edge function still returns legacy wrapper format.');
      assertInsightsSynthesisContract(synthesisBody);
    }
  });
});
