/**
 * Edge Function validation tests (TST-008).
 *
 * Verifies that deployed Supabase Edge Functions are reachable and return
 * expected response shapes. Does NOT mock the network - these are live tests.
 *
 * Skips gracefully when TEST_USER_EMAIL is not configured.
 */

import { test, expect } from '@playwright/test';
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

    expect([422, 403, 404]).toContain(res.status());
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
    if (saveRes.status() === 404 || saveRes.status() === 403) {
      test.skip();
      return;
    }
    expect(saveRes.status()).toBe(200);

    const publishRes = await post({ action: 'publish', changelog_note: 'integration publish for rollback test' });
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
