import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test credentials from .env.test (git-ignored)
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Auth bootstrap ──────────────────────────────────────────────────────
    // Logs in once and saves session to playwright/.auth/user.json.
    // Skipped silently when TEST_USER_EMAIL/PASSWORD are not set.
    {
      name: 'setup',
      testMatch: '**/setup/auth.setup.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Unauthenticated E2E ─────────────────────────────────────────────────
    // Auth-page tests — run without a stored session.
    {
      name: 'public',
      testMatch: '**/e2e/auth.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Authenticated E2E ───────────────────────────────────────────────────
    // Navigation smoke tests — reuse session saved by the setup project.
    {
      name: 'authenticated',
      testMatch: '**/e2e/navigation.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },

    // ── Integration tests ───────────────────────────────────────────────────
    // Real Supabase CRUD operations against the test user's data.
    {
      name: 'integration',
      testMatch: '**/integration/**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },

    // ── AI sanity tests ─────────────────────────────────────────────────────
    // Validates live Gemini coaching responses. Run manually only.
    {
      name: 'ai',
      testMatch: '**/ai/**/*.spec.ts',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
