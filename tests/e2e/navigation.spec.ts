/**
 * Authenticated navigation smoke tests.
 *
 * Verifies that a logged-in user can reach each core page without being
 * redirected back to the auth page. Depends on the 'setup' project having
 * saved a valid session in playwright/.auth/user.json.
 *
 * If .env.test is not configured (CI without secrets), these tests are
 * skipped gracefully — only the public/unauthenticated tests run.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

// Skip all authenticated tests when credentials were not provided.
test.beforeAll(async () => {
  if (!process.env.TEST_USER_EMAIL) {
    test.skip();
  }
  // Also skip if auth file only has an empty state (no real session).
  if (fs.existsSync(authFile)) {
    const state = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    if (state.origins?.length === 0 && state.cookies?.length === 0) {
      test.skip();
    }
  }
});

test.describe('Authenticated navigation', () => {
  test('dashboard loads without auth redirect', async ({ page }) => {
    await page.goto('/');
    // A logged-in user should NOT see the sign-in form.
    await expect(page.getByRole('heading', { name: 'Sign in' })).not.toBeVisible({ timeout: 10000 });
  });

  test('weekly plan page loads', async ({ page }) => {
    await page.goto('/');
    // Navigate to Weekly Plan via sidebar.
    const weeklyLink = page.getByRole('link', { name: /Weekly Plan/i })
      .or(page.getByRole('button', { name: /Weekly Plan/i }));
    if (await weeklyLink.count() > 0) {
      await weeklyLink.first().click();
    }
    // Verify Weekly Plan heading is visible.
    await expect(page.getByRole('heading', { name: /Weekly Plan/i })).toBeVisible({ timeout: 10000 });
  });

  test('coach page loads', async ({ page }) => {
    await page.goto('/');
    const coachLink = page.getByRole('link', { name: /Coach|Marius/i })
      .or(page.getByRole('button', { name: /Coach|Marius/i }));
    if (await coachLink.count() > 0) {
      await coachLink.first().click();
    }
    await expect(page.getByRole('heading', { name: /Coach|Marius/i })).toBeVisible({ timeout: 10000 });
  });

  test('no unexpected console errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    // Allow time for async data loading.
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors (browser extension noise etc.)
    const appErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('extension')
    );
    expect(appErrors).toHaveLength(0);
  });
});
