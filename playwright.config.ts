import { defineConfig, devices } from '@playwright/test';

// End-to-end interaction tests against the *production build* (vite preview), to
// cover the layer the vitest suite can't: real clicks, form flows, navigation and
// persistence across reloads. Kept tiny and fast (~2 s of test time) so it's cheap
// in CI — the only real cost there is the one-time chromium download (cached).
//
// PW_CHROMIUM_PATH lets a local run reuse an already-cached chromium (e.g. the
// Playwright headless shell) so no browser download is needed; CI leaves it unset
// and installs its own via `playwright install chromium`.
const localChromium = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(localChromium ? { launchOptions: { executablePath: localChromium } } : {}),
      },
    },
  ],
  webServer: {
    command: 'pnpm exec vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
