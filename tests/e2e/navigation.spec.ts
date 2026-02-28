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
    // Dashboard shows a welcome heading.
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 });
  });

  test('weekly plan page loads via sidebar', async ({ page }) => {
    await page.goto('/');
    // Wait for the sidebar to be ready.
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible({ timeout: 10000 });
    // Click the Weekly Plan sidebar button.
    await page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Weekly Plan' })
      .click();
    // Verify Weekly Plan heading is visible.
    await expect(page.getByRole('heading', { name: /Weekly Plan/i })).toBeVisible({ timeout: 10000 });
  });

  test('coach page loads via sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible({ timeout: 10000 });
    // Click the Coach sidebar button.
    await page.getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: 'Coach' })
      .click();
    // Coach page shows the AI coach heading.
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible({ timeout: 10000 });
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
