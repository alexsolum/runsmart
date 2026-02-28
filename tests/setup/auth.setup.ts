/**
 * Auth bootstrap for Playwright E2E and integration tests.
 *
 * Runs once before the 'authenticated', 'integration', and 'ai' projects.
 * Logs in with TEST_USER_EMAIL / TEST_USER_PASSWORD (from .env.test),
 * then saves the browser's storageState to playwright/.auth/user.json.
 * All subsequent tests in those projects reuse the saved session.
 *
 * If credentials are missing the setup skips gracefully so that the
 * public (unauthenticated) tests can still run in CI without secrets.
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate and save session', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.warn(
      '\n⚠️  TEST_USER_EMAIL / TEST_USER_PASSWORD not set in .env.test.\n' +
      '   Skipping auth setup — authenticated E2E tests will be skipped.\n'
    );
    // Write an empty-but-valid storageState so dependent tests don't crash.
    const emptyState = { cookies: [], origins: [] };
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(emptyState));
    return;
  }

  // Navigate to the sign-in page.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 15000 });

  // Fill in credentials.
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for post-login redirect to the dashboard.
  // The dashboard shows the user's name or a welcome heading.
  await expect(page.getByRole('heading', { name: /RunSmart|Dashboard|Weekly Plan|Today/i }))
    .toBeVisible({ timeout: 20000 });

  // Save browser storage (localStorage + cookies) so other tests reuse the session.
  await page.context().storageState({ path: authFile });

  console.log(`✅ Auth setup complete — session saved to ${authFile}`);
});
