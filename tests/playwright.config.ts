/**
 * Playwright Configuration for PM Toolkit E2E Tests
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const PORT = process.env.TEST_PORT || 3333;
const BASE_URL = `http://localhost:${PORT}`;

// Resolve paths relative to this config file
const testsDir = __dirname;
const projectRoot = path.resolve(testsDir, '..');

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Capture screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'on-first-retry',

    // Timeout for each action
    actionTimeout: 10000,

    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Global timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Projects - Use Chromium to match VS Code's webview
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // VS Code webviews use Chromium
        channel: 'chromium',
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: `npm run compile && npx tsx ${path.join(testsDir, 'harness', 'serve.ts')}`,
    url: `${BASE_URL}/health`,
    cwd: projectRoot,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
