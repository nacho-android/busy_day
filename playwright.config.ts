import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  // Phaser's first module transform and software WebGL startup can be slow on
  // headless CI hosts even though the loaded game is responsive afterwards.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Multiple software-WebGL Phaser instances contend heavily on headless
  // Windows hosts; serial browser runs are faster and substantially steadier.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
