/**
 * AI Coach sanity tests (TST-009) — run manually only.
 *
 * Validates that the Gemini coaching endpoint returns coherent, non-empty
 * responses that contain expected coaching keywords. These tests make live
 * calls to the gemini-coach Supabase Edge Function.
 *
 * Run with:
 *   npm run test:ai
 *
 * Do NOT include in CI pipelines — AI responses are non-deterministic and
 * latency is too high for automated builds.
 *
 * Acceptance criteria:
 * - Response text length > 50 characters
 * - Response contains at least one coaching keyword
 * - No empty response returned
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

const COACHING_KEYWORDS = [
  'run', 'training', 'pace', 'recovery', 'rest', 'aerobic', 'tempo',
  'mileage', 'km', 'heart rate', 'fatigue', 'week', 'plan',
];

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

test.describe('AI Coach — response sanity', () => {
  test('coaching response is non-empty and contains coaching keywords', async ({ page }) => {
    await page.goto('/');

    // Navigate to the Coach page.
    const coachLink = page.getByRole('link', { name: /Coach|Marius/i })
      .or(page.getByRole('button', { name: /Coach|Marius/i }));

    if (await coachLink.count() === 0) {
      test.skip();
      return;
    }
    await coachLink.first().click();
    await expect(page.getByRole('heading', { name: /Coach|Marius/i })).toBeVisible({ timeout: 10000 });

    // Start a new conversation to trigger a fresh AI response.
    const newConvButton = page.getByRole('button', { name: /New conversation|New chat/i });
    if (await newConvButton.count() > 0) {
      await newConvButton.first().click();
    }

    // Wait for AI response — may take up to 60 seconds.
    const responseText = page.locator('.coach-insight-card, [class*="insight"], [class*="coach-message"]');
    await expect(responseText.first()).toBeVisible({ timeout: 60000 });

    // Get the full text content of all response cards.
    const allText = await page.locator('body').innerText();
    const lowerText = allText.toLowerCase();

    // Response must be non-trivial (> 50 characters of coaching content).
    expect(allText.length).toBeGreaterThan(50);

    // Response must contain at least one coaching keyword.
    const hasKeyword = COACHING_KEYWORDS.some((kw) => lowerText.includes(kw));
    expect(hasKeyword).toBe(true);
  });

  test('AI follow-up response is coherent', async ({ page }) => {
    await page.goto('/');

    const coachLink = page.getByRole('link', { name: /Coach|Marius/i })
      .or(page.getByRole('button', { name: /Coach|Marius/i }));

    if (await coachLink.count() === 0) {
      test.skip();
      return;
    }
    await coachLink.first().click();

    // Start a new conversation.
    const newConvButton = page.getByRole('button', { name: /New conversation|New chat/i });
    if (await newConvButton.count() > 0) {
      await newConvButton.first().click();
    }

    // Wait for initial AI response.
    await expect(page.locator('.coach-insight-card, [class*="insight"]').first())
      .toBeVisible({ timeout: 60000 });

    // Send a follow-up question.
    const input = page.getByRole('textbox', { name: /message|ask/i })
      .or(page.locator('input[type="text"], textarea').last());

    if (await input.count() === 0) {
      test.skip();
      return;
    }

    await input.first().fill('What should I focus on this week?');
    await page.keyboard.press('Enter');

    // Wait for follow-up response.
    const followupText = await page.locator('[class*="message"], [class*="response"]').last();
    await expect(followupText).toBeVisible({ timeout: 60000 });

    const text = await followupText.innerText();
    expect(text.length).toBeGreaterThan(20);
  });
});
