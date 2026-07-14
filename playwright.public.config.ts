import { defineConfig, devices } from '@playwright/test';

/**
 * Opt-in, long-running public-control journey configuration.
 *
 * This suite is intentionally outside tests/e2e and therefore outside the
 * default `npm run test:e2e` command. Run it explicitly with:
 *
 *   npx playwright test --config=playwright.public.config.ts
 */
export default defineConfig({
  testDir: './tests/public',
  outputDir: 'test-results/public-journey',
  timeout: 30 * 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/public-journey' }]],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--enable-unsafe-swiftshader',
      ],
    },
    // Per-action DOM snapshots make a several-minute canvas journey
    // prohibitively slow. A final failure screenshot and explicit telemetry
    // diagnostics remain enabled instead.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'public-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4177',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
