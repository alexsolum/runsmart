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

import { test as setup, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

function normalizeAuthProvider() {
  return String(process.env.TEST_AUTH_PROVIDER || 'password').trim().toLowerCase();
}

async function loginWithPassword(page: Page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    return {
      ok: false,
      reason: 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set in .env.test.',
    };
  }

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  return { ok: true };
}

async function loginWithGoogle(page: Page) {
  const email = process.env.TEST_GOOGLE_EMAIL || process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_GOOGLE_PASSWORD;

  if (!email || !password) {
    return {
      ok: false,
      reason: 'TEST_GOOGLE_EMAIL (or TEST_USER_EMAIL) and TEST_GOOGLE_PASSWORD are required for Google auth.',
    };
  }

  const popupPromise = page.context().waitForEvent('page');
  await page.getByRole('button', { name: /Continue with Google/i }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState('domcontentloaded');

  const emailInput = popup.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 30000 });
  await emailInput.fill(email);
  await popup.keyboard.press('Enter');

  const passwordInput = popup.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 30000 });
  await passwordInput.fill(password);
  await popup.keyboard.press('Enter');

  await popup.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});

  return { ok: true };
}

setup('authenticate and save session', async ({ page }) => {
  const provider = normalizeAuthProvider();

  if (provider !== 'password' && provider !== 'google') {
    console.warn(
      `\n⚠️  TEST_AUTH_PROVIDER="${provider}" is unsupported.\n` +
      '   Use "password" or "google". Skipping auth setup.\n'
    );
    const emptyState = { cookies: [], origins: [] };
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(emptyState));
    return;
  }

  // Navigate to the sign-in page.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 15000 });

  const result = provider === 'google'
    ? await loginWithGoogle(page)
    : await loginWithPassword(page);

  if (!result.ok) {
    console.warn(`\n⚠️  ${result.reason}\n   Skipping auth setup — authenticated E2E tests will be skipped.\n`);
    const emptyState = { cookies: [], origins: [] };
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify(emptyState));
    return;
  }

  // Wait for post-login redirect — the sign-in heading should disappear.
  await expect(page.getByRole('heading', { name: 'Sign in' }))
    .not.toBeVisible({ timeout: 20000 });

  // Save browser storage (localStorage + cookies) so other tests reuse the session.
  await page.context().storageState({ path: authFile });

  console.log(`✅ Auth setup complete — session saved to ${authFile}`);
});
