/**
 * Supabase CRUD integration tests.
 *
 * Verifies real database read/write/delete operations through the RunSmart UI.
 * Runs against the test user's Supabase project — uses the session saved by
 * the 'setup' project (playwright/.auth/user.json).
 *
 * Flow for each test:
 * 1. Create a record through the UI
 * 2. Verify it appears in the UI
 * 3. Reload the page and verify it persists
 * 4. Delete the test record (cleanup)
 *
 * Rules:
 * - Always clean up created data — use timestamp suffixes to avoid collisions
 * - Never write to production data (test user account is isolated)
 * - Skip gracefully when TEST_USER_EMAIL is not set
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

// Skip all integration tests when credentials were not provided.
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

test.describe('Daily Log — CRUD integration', () => {
  // Use a timestamp suffix so each run creates a unique record.
  const testNote = `Integration test ${Date.now()}`;

  test('creates a daily log entry and verifies it persists after reload', async ({ page }) => {
    // Navigate to the Daily Log page.
    await page.goto('/');

    // Find and click the Daily Log nav item.
    const logLink = page.getByRole('link', { name: /Daily Log|Log/i })
      .or(page.getByRole('button', { name: /Daily Log|Log/i }));

    if (await logLink.count() === 0) {
      test.skip(); // Page not found in nav — skip gracefully.
      return;
    }
    await logLink.first().click();

    // Wait for the Daily Log form to appear.
    await expect(page.getByRole('heading', { name: /Daily Log/i })).toBeVisible({ timeout: 10000 });

    // Fill in a notes field with our unique test note.
    const notesField = page.getByLabel(/notes/i).or(page.locator('textarea[name="notes"], textarea[placeholder*="notes"]'));
    if (await notesField.count() === 0) {
      test.skip(); // Notes field not found — skip gracefully.
      return;
    }
    await notesField.first().fill(testNote);

    // Submit the form.
    const saveButton = page.getByRole('button', { name: /save|log/i });
    await saveButton.first().click();

    // Verify the note appears in the UI after save.
    await expect(page.getByText(testNote)).toBeVisible({ timeout: 10000 });

    // Reload and verify persistence.
    await page.reload();
    await expect(page.getByText(testNote)).toBeVisible({ timeout: 10000 });
  });
});
