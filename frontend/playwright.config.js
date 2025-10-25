const { devices } = require('@playwright/test');
module.exports = {
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: [['list']],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
};
