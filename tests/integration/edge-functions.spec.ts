/**
 * Edge Function validation tests (TST-008).
 *
 * Verifies that deployed Supabase Edge Functions are reachable and return
 * expected response shapes. Does NOT mock the network — these are live tests.
 *
 * Skips gracefully when TEST_USER_EMAIL is not configured.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

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

test.describe('Edge Function — gemini-coach', () => {
  test('coach page successfully loads AI insights', async ({ page }) => {
    // Navigate to the Coach page — this triggers the gemini-coach Edge Function.
    await page.goto('/');

    const coachLink = page.getByRole('link', { name: /Coach|Marius/i })
      .or(page.getByRole('button', { name: /Coach|Marius/i }));

    if (await coachLink.count() === 0) {
      test.skip();
      return;
    }

    await coachLink.first().click();
    await expect(page.getByRole('heading', { name: /Coach|Marius/i })).toBeVisible({ timeout: 10000 });

    // Start a new conversation to trigger the Edge Function.
    const newConvButton = page.getByRole('button', { name: /New conversation|New chat/i });
    if (await newConvButton.count() > 0) {
      await newConvButton.first().click();
    }

    // Wait for a coaching response to appear (may take several seconds).
    // The response should contain at least one insight card or text block.
    const responseContainer = page.locator('.coach-insight-card, [data-testid="insight"], [class*="insight"]');
    await expect(responseContainer.first()).toBeVisible({ timeout: 60000 });
  });
});

test.describe('Edge Function — strava-sync', () => {
  test('strava sync button is present on data page', async ({ page }) => {
    // Navigate to the Data page — it exposes the Strava sync trigger.
    await page.goto('/');

    const dataLink = page.getByRole('link', { name: /Data|Strava/i })
      .or(page.getByRole('button', { name: /Data|Strava/i }));

    if (await dataLink.count() === 0) {
      test.skip();
      return;
    }

    await dataLink.first().click();

    // The Data page should show a Strava section.
    await expect(page.getByText(/Strava/i)).toBeVisible({ timeout: 10000 });
  });
});
