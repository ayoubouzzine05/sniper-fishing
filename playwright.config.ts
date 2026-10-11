import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config.
 * - Runs against a PRODUCTION build (`next start`) on port 3111.
 * - Real provider APIs are used (Open-Meteo, no key) — the suite verifies
 *   live data rendering. The API-failure spec intercepts the network.
 * - workers=1: each spec creates a fresh guest (IndexedDB) context.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3111',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start:e2e',
    port: 3111,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
