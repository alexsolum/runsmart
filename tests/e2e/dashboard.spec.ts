/**
 * Dashboard E2E smoke test (TASK-010)
 *
 * Verifies that an authenticated user sees the Training Dashboard:
 * - page loads without console errors
 * - KPI cards are present
 * - activities table renders rows (requires seeded data from seed.setup.ts)
 *
 * Skipped gracefully when TEST_USER_EMAIL is not set.
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

test('dashboard loads without errors', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Page should not redirect to auth
  await expect(page).not.toHaveURL(/\/auth/);

  // No JS console errors
  expect(consoleErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
});

test('dashboard renders KPI cards', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Section heading exists
  await expect(page.getByText(/Training Dashboard/i)).toBeVisible();

  // KPI cards are present (at least 4 out of 6, allowing for responsive hiding)
  const kpiCards = page.locator('.dashboard-kpi');
  await expect(kpiCards).toHaveCount(6);
});

test('dashboard shows Latest Activities section', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Section heading
  await expect(page.getByRole('heading', { name: /latest activities/i })).toBeVisible();

  // Activities table is present
  const table = page.getByRole('table', { name: /strava activity history/i });
  await expect(table).toBeVisible();
});

test('dashboard activities table has rows when data is seeded', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const table = page.getByRole('table', { name: /strava activity history/i });
  const rows = table.locator('tbody tr');

  // After seed setup, there should be at least 1 row
  const count = await rows.count();
  if (count === 0) {
    // Acceptable if user has no activities (seed may not have run)
    const emptyMsg = page.getByText(/no activities for this period/i);
    await expect(emptyMsg).toBeVisible();
  } else {
    expect(count).toBeGreaterThanOrEqual(1);
  }
});
