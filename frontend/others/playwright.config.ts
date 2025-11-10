import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  reporter: [['list']],
  webServer: {
    // Start Vite dev server automatically before tests. If a server is already running
    // on the port, reuse it (useful for local dev). Increase timeout for slow machines.
    command: 'npx vite --port 5175',
    port: 5175,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
