import { test, expect } from '@playwright/test';

/**
 * E2E tests for the RunSmart auth page.
 *
 * Unauthenticated users always land on the auth page, so all tests here
 * can run without real credentials. The "invalid credentials" test makes
 * a real Supabase request and expects an error response.
 */

test.describe('Auth page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Unauthenticated users land on the sign-in form
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('page has the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('RunSmart');
  });

  test('shows RunSmart brand mark', async ({ page }) => {
    await expect(page.getByText('RunSmart').first()).toBeVisible();
  });

  test('displays sign-in form with email and password inputs', async ({ page }) => {
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('displays Google sign-in option', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('switches to Create Account mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('switches back to Sign In from Create Account mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    // In create-account mode the toggle link reads "Sign in"
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('clears error when switching modes', async ({ page }) => {
    // Trigger an error first
    await page.getByLabel('Email').fill('bad@test.invalid');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.bg-red-100')).toBeVisible({ timeout: 10000 });

    // Switch mode — error should disappear
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.locator('.bg-red-100')).not.toBeVisible();
  });

  test('shows error message for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email').fill('notauser@test.invalid');
    await page.getByLabel('Password').fill('wrongpassword123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Button shows loading state while waiting for Supabase
    await expect(page.getByRole('button', { name: 'Signing in\u2026' })).toBeVisible();

    // Supabase returns an error; app renders it in the red banner
    await expect(page.locator('.bg-red-100')).toBeVisible({ timeout: 10000 });
  });
});
